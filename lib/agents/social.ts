import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { runToolLoop } from "./loop";

const SYSTEM_PROMPT = `Jesteś Agentem Social w aplikacji Menago — panelu do prowadzenia
kariery muzycznej Funkmaster Winio x Haipeson (gatunek: Hip-Hop boombap).

Zadanie: dla wskazanego projektu planujesz content na Instagram na 2 tygodnie
do przodu — konkretne propozycje postów (opis, format, termin).

Zasady:
- Sprawdź najpierw list_media, żeby wiedzieć, jakie materiały już są dostępne.
- Jeśli materiałów brakuje (np. klipy ze studia, zdjęcia), zgłoś to narzędziem
  request_media zamiast zmyślać media_urls.
- Dla każdej propozycji posta wywołaj propose_post (zapisuje szkic), a potem
  schedule_post dla tych, które chcesz przekazać do kolejki zatwierdzeń.
- Formaty: "post", "karuzela", "reel", "story". Sieć: zawsze "instagram".
- Nigdy nie publikujesz sam — publikacja następuje dopiero po zatwierdzeniu
  przez użytkownika i nadejściu zaplanowanego terminu (cron).
- Na koniec krótko podsumuj po polsku, ile postów zaproponowałeś i na kiedy.`;

const TOOLS: Tool[] = [
  {
    name: "list_media",
    description: "Lista dostępnych materiałów (zdjęcia/wideo) dla projektu.",
    input_schema: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
  {
    name: "request_media",
    description: "Zgłasza brakujące materiały (tworzy zadanie-przypomnienie).",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        description: { type: "string" },
      },
      required: ["project_id", "description"],
    },
  },
  {
    name: "propose_post",
    description: "Zapisuje szkic propozycji posta (nie wysyła do zatwierdzenia).",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        format: { type: "string", enum: ["post", "karuzela", "reel", "story"] },
        caption: { type: "string" },
        media_urls: {
          type: "array",
          items: { type: "string" },
          description: "publiczne URL-e mediów (puste, jeśli jeszcze niedostępne)",
        },
        scheduled_at: {
          type: "string",
          description: "ISO 8601, proponowany termin publikacji",
        },
      },
      required: ["project_id", "format", "caption", "scheduled_at"],
    },
  },
  {
    name: "schedule_post",
    description:
      "Dodaje szkic posta do kolejki zatwierdzeń (dopiero po akceptacji zostanie opublikowany).",
    input_schema: {
      type: "object",
      properties: { post_id: { type: "string" } },
      required: ["post_id"],
    },
  },
];

/**
 * Dodaje istniejący szkic posta do kolejki zatwierdzeń.
 * Współdzielone przez narzędzie schedule_post oraz ewentualne ręczne wywołania.
 */
export async function createPostApproval(postId: string) {
  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (!post) return { error: "Nie znaleziono posta." };

  const { data: approval, error } = await supabase
    .from("approvals")
    .insert({
      agent_slug: "social",
      kind: "post",
      title: `Post (${post.format}): ${(post.caption ?? "").slice(0, 60)}`,
      payload: {
        post_id: post.id,
        project_id: post.project_id,
        network: post.network,
        format: post.format,
        caption: post.caption,
        media_urls: post.media_urls,
        scheduled_at: post.scheduled_at,
      },
      status: "pending",
    })
    .select()
    .single();
  if (error) return { error: error.message };

  await supabase.from("activity").insert({
    agent_slug: "social",
    message: `Dodano do kolejki zatwierdzeń: propozycja posta (${post.format}).`,
    ref_type: "approval",
    ref_id: approval.id,
  });

  return { approval_id: approval.id };
}

async function execTool(name: string, input: Record<string, unknown>) {
  const supabase = createAdminClient();

  switch (name) {
    case "list_media": {
      const { data } = await supabase
        .from("media")
        .select("*")
        .eq("project_id", input.project_id);
      return data ?? [];
    }
    case "request_media": {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          agent_slug: "social",
          project_id: input.project_id,
          title: `Potrzebne materiały: ${input.description}`,
          created_by: "social",
        })
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "social",
        message: `Zgłoszono brakujące materiały: ${input.description}`,
        ref_type: "task",
        ref_id: data?.id ?? null,
      });
      return data;
    }
    case "propose_post": {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          project_id: input.project_id,
          network: "instagram",
          format: input.format,
          caption: input.caption,
          media_urls: input.media_urls ?? [],
          scheduled_at: input.scheduled_at,
          status: "draft",
        })
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "social",
        message: `Zaproponowano post (${input.format}) na ${input.scheduled_at}.`,
        ref_type: "post",
        ref_id: data?.id ?? null,
      });
      return data;
    }
    case "schedule_post": {
      return createPostApproval(input.post_id as string);
    }
    default:
      return { error: `Nieznane narzędzie: ${name}` };
  }
}

export interface SocialRunResult {
  ok: boolean;
  summary: string;
}

export async function runSocialPlan(projectId: string): Promise<SocialRunResult> {
  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) return { ok: false, summary: "Nie znaleziono projektu." };

  try {
    const summary = await runToolLoop({
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      execTool,
      userPrompt:
        `Projekt: "${project.name}" (typ: ${project.type}, etap: ${project.stage}, ` +
        `id: ${project.id}, premiera: ${project.release_date ?? "brak"}).\n` +
        `Notatki: ${project.notes ?? "brak"}.\n\n` +
        `Zaplanuj content na Instagram na 2 tygodnie do przodu (propose_post), ` +
        `a gotowe propozycje wyślij do kolejki zatwierdzeń (schedule_post).`,
    });
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, summary: (err as Error).message };
  }
}
