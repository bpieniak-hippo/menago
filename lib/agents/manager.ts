import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentSlug } from "@/lib/types";
import { runToolLoop } from "./loop";
import { runAlbumTask } from "./album";
import { runWydawniczyTask } from "./wydawniczy";
import { runAnalitykTask } from "./analityk";
import { runKatalogTask } from "./katalog";

// Lżejsi specjaliści, których Manager uruchamia synchronicznie przy delegacji
// (promo/social/trendy mają własne ekrany z pełnym flow i są uruchamiane
// stamtąd — patrz /promo, /calendar, /trendy).
const DELEGATABLE_RUNNERS: Partial<Record<AgentSlug, (task: string) => Promise<{ ok: boolean; summary: string }>>> = {
  album: runAlbumTask,
  wydawniczy: runWydawniczyTask,
  analityk: runAnalitykTask,
  katalog: runKatalogTask,
};

const SUB_AGENT_SLUGS: AgentSlug[] = [
  "album",
  "social",
  "promo",
  "wydawniczy",
  "analityk",
  "katalog",
  "trendy",
];

const SYSTEM_PROMPT = `Jesteś Agentem Managerem w aplikacji Menago — panelu do prowadzenia
kariery muzycznej Haipeson × Winiu. Koordynujesz pracę agentów
specjalistycznych: album, social, promo, wydawniczy, analityk, katalog, trendy.

Zasady:
- Nie wykonujesz pracy specjalistów sam — deleguj zadania narzędziem delegate_to
  albo twórz zadania narzędziem create_task.
- Żadna akcja na zewnątrz (mail, post) nie dzieje się bez akceptacji
  użytkownika w kolejce approvals — Ty tylko planujesz i delegujesz.
- Odpowiadaj po polsku, krótko i konkretnie.
- Zanim coś zdelegujesz, sprawdź aktualny stan (read_projects, read_approvals,
  read_activity), żeby nie dublować pracy.`;

const TOOLS: Tool[] = [
  {
    name: "read_projects",
    description: "Lista projektów z ich etapem i postępem.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "read_activity",
    description: "Ostatnia aktywność agentów (feed).",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "domyślnie 15" } },
    },
  },
  {
    name: "read_approvals",
    description: "Lista propozycji w kolejce zatwierdzeń.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "approved", "rejected", "executed", "failed"],
          description: "domyślnie: pending",
        },
      },
    },
  },
  {
    name: "create_task",
    description: "Tworzy zadanie przypisane do agenta specjalisty.",
    input_schema: {
      type: "object",
      properties: {
        agent_slug: { type: "string", enum: SUB_AGENT_SLUGS },
        project_id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["agent_slug", "title"],
    },
  },
  {
    name: "delegate_to",
    description:
      "Deleguje zadanie do agenta specjalisty i ustawia go jako aktywnego (status 'w toku').",
    input_schema: {
      type: "object",
      properties: {
        agent_slug: { type: "string", enum: SUB_AGENT_SLUGS },
        task: { type: "string", description: "krótki opis zadania" },
      },
      required: ["agent_slug", "task"],
    },
  },
];

async function execTool(name: string, input: Record<string, unknown>) {
  const supabase = createAdminClient();

  switch (name) {
    case "read_projects": {
      const { data } = await supabase.from("projects").select("*");
      return data ?? [];
    }
    case "read_activity": {
      const limit = typeof input.limit === "number" ? input.limit : 15;
      const { data } = await supabase
        .from("activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    }
    case "read_approvals": {
      const status = (input.status as string) ?? "pending";
      const { data } = await supabase
        .from("approvals")
        .select("*")
        .eq("status", status);
      return data ?? [];
    }
    case "create_task": {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          agent_slug: input.agent_slug,
          project_id: input.project_id ?? null,
          title: input.title,
          description: input.description ?? null,
          created_by: "manager",
        })
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "manager",
        message: `Utworzono zadanie dla agenta „${input.agent_slug}”: ${input.title}`,
        ref_type: "task",
        ref_id: data?.id ?? null,
      });
      return data;
    }
    case "delegate_to": {
      const agentSlug = input.agent_slug as AgentSlug;
      const task = String(input.task);
      await supabase
        .from("agents")
        .update({ status: "w toku", current_task: task, last_run_at: new Date().toISOString() })
        .eq("slug", agentSlug);
      await supabase.from("activity").insert({
        agent_slug: "manager",
        message: `Zlecono agentowi „${agentSlug}”: ${task}`,
        ref_type: "agent",
      });

      const runner = DELEGATABLE_RUNNERS[agentSlug];
      if (!runner) {
        // promo/social/trendy: użytkownik uruchamia je z ich własnych ekranów.
        return { delegated: true };
      }

      const result = await runner(task);
      await supabase
        .from("agents")
        .update({
          status: result.ok ? "w gotowości" : "czeka na Ciebie",
          current_task: result.summary,
        })
        .eq("slug", agentSlug);
      await supabase.from("activity").insert({
        agent_slug: agentSlug,
        message: result.summary,
      });
      return { delegated: true, executed: true, result: result.summary };
    }
    default:
      return { error: `Nieznane narzędzie: ${name}` };
  }
}

export interface ManagerRunResult {
  ok: boolean;
  summary: string;
}

async function run(
  userPrompt: string,
  destination: "activity" | "report",
): Promise<ManagerRunResult> {
  let summary: string;
  try {
    summary = await runToolLoop({
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      execTool,
      userPrompt,
    });
  } catch (err) {
    return { ok: false, summary: (err as Error).message };
  }

  const supabase = createAdminClient();

  if (destination === "report") {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("reports").insert({
      agent_slug: "manager",
      period_start: today,
      period_end: today,
      content: summary,
    });
  }

  await supabase.from("activity").insert({
    agent_slug: "manager",
    message: destination === "report" ? `Brief dnia: ${summary}` : summary,
  });

  return { ok: true, summary };
}

export async function runManagerCommand(
  command: string,
): Promise<ManagerRunResult> {
  return run(
    `Polecenie od użytkownika: "${command}"\n\nRozdziel je na zadania dla agentów (create_task / delegate_to), a na koniec krótko podsumuj, co zrobiłeś.`,
    "activity",
  );
}

export async function runDailyBrief(): Promise<ManagerRunResult> {
  return run(
    `Wygeneruj brief dnia: sprawdź projekty, kolejkę zatwierdzeń i ostatnią aktywność ` +
      `(read_projects, read_approvals, read_activity), a potem napisz krótkie podsumowanie ` +
      `(3-5 zdań po polsku): co czeka na decyzję użytkownika, co robią agenci, jakie są priorytety na dziś. ` +
      `Nie twórz nowych zadań — to tylko raport.`,
    "report",
  );
}
