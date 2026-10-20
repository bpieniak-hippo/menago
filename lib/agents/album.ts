import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { runToolLoop } from "./loop";

const SYSTEM_PROMPT = `Jesteś Agentem Album w aplikacji Menago — panelu do prowadzenia
kariery muzycznej Haipeson × Winiu.

Zadanie: pilnujesz etapów projektu (pomysł → nagrania → mix → master →
okładka → metadane → wydanie), notujesz postęp i przypominasz o terminach.

Zasady:
- Najpierw read_projects, żeby znaleźć właściwy project_id po nazwie.
- Aktualizuj etap tylko wtedy, gdy wynika to jasno z polecenia/kontekstu
  (update_project_stage).
- Zapisuj istotne notatki/feedback narzędziem add_project_note.
- Jeśli trzeba komuś o czymś przypomnieć (np. feedback do mixu), użyj
  create_reminder.
- Na koniec krótko podsumuj po polsku, co zrobiłeś.`;

const TOOLS: Tool[] = [
  {
    name: "read_projects",
    description: "Lista projektów (użyj, żeby znaleźć project_id po nazwie).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "update_project_stage",
    description: "Aktualizuje etap projektu.",
    input_schema: {
      type: "object",
      properties: { project_id: { type: "string" }, stage: { type: "string" } },
      required: ["project_id", "stage"],
    },
  },
  {
    name: "add_project_note",
    description: "Dopisuje notatkę do projektu.",
    input_schema: {
      type: "object",
      properties: { project_id: { type: "string" }, note: { type: "string" } },
      required: ["project_id", "note"],
    },
  },
  {
    name: "create_reminder",
    description: "Tworzy przypomnienie/zadanie powiązane z projektem.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        title: { type: "string" },
        due_at: { type: "string", description: "ISO 8601, opcjonalnie" },
      },
      required: ["project_id", "title"],
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
    case "update_project_stage": {
      const { data, error } = await supabase
        .from("projects")
        .update({ stage: input.stage })
        .eq("id", input.project_id)
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "album",
        message: `Zaktualizowano etap projektu „${data.name}” na: ${input.stage}.`,
        ref_type: "project",
        ref_id: data.id,
      });
      return data;
    }
    case "add_project_note": {
      const { data: project } = await supabase
        .from("projects")
        .select("notes")
        .eq("id", input.project_id)
        .single();
      const notes = [project?.notes, String(input.note)].filter(Boolean).join("\n");
      const { data, error } = await supabase
        .from("projects")
        .update({ notes })
        .eq("id", input.project_id)
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "album",
        message: `Dodano notatkę do projektu „${data.name}”.`,
        ref_type: "project",
        ref_id: data.id,
      });
      return data;
    }
    case "create_reminder": {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          agent_slug: "album",
          project_id: input.project_id,
          title: input.title,
          due_at: input.due_at ?? null,
          created_by: "album",
        })
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "album",
        message: `Przypomnienie: ${input.title}`,
        ref_type: "task",
        ref_id: data.id,
      });
      return data;
    }
    default:
      return { error: `Nieznane narzędzie: ${name}` };
  }
}

export interface AlbumRunResult {
  ok: boolean;
  summary: string;
}

export async function runAlbumTask(task: string): Promise<AlbumRunResult> {
  try {
    const summary = await runToolLoop({
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      execTool,
      userPrompt: `Zadanie od Managera: "${task}"\n\nSprawdź, czego dotyczy, i wykonaj odpowiednie kroki.`,
    });
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, summary: (err as Error).message };
  }
}
