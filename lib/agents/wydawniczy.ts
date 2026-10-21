import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { runToolLoop } from "./loop";

const SYSTEM_PROMPT = `Jesteś Agentem Wydawniczym w aplikacji Menago — panelu do prowadzenia
kariery muzycznej Funkmaster Winio x Haipeson (gatunek: Hip-Hop boombap).

Zadanie: pilnujesz metadanych, kredytów, ISRC, checklist dystrybucji,
przypominasz o pitchu do playlist redakcyjnych przed premierą i o rejestracji
utworów (ZAiKS/STOART).

Zasady:
- Najpierw read_projects, żeby znaleźć właściwy project_id po nazwie.
- update_release_metadata zapisuje metadane jako notatkę przy projekcie
  (brak jeszcze dedykowanej tabeli metadanych — MVP).
- create_checklist tworzy listę zadań (jedno zadanie na punkt checklisty).
- Na koniec krótko podsumuj po polsku, co zrobiłeś.`;

const TOOLS: Tool[] = [
  {
    name: "read_projects",
    description: "Lista projektów (użyj, żeby znaleźć project_id po nazwie).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "update_release_metadata",
    description: "Zapisuje metadane wydania (kredyty, ISRC, itp.) przy projekcie.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        metadata: { type: "string", description: "tekstowy zapis metadanych" },
      },
      required: ["project_id", "metadata"],
    },
  },
  {
    name: "create_checklist",
    description: "Tworzy checklistę zadań dystrybucyjnych dla projektu.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        title: { type: "string", description: "nazwa checklisty" },
        items: { type: "array", items: { type: "string" } },
      },
      required: ["project_id", "title", "items"],
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
    case "update_release_metadata": {
      const { data: project } = await supabase
        .from("projects")
        .select("notes")
        .eq("id", input.project_id)
        .single();
      const notes = [project?.notes, `[Metadane] ${input.metadata}`]
        .filter(Boolean)
        .join("\n");
      const { data, error } = await supabase
        .from("projects")
        .update({ notes })
        .eq("id", input.project_id)
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "wydawniczy",
        message: `Zaktualizowano metadane wydania dla „${data.name}”.`,
        ref_type: "project",
        ref_id: data.id,
      });
      return data;
    }
    case "create_checklist": {
      const items = (input.items as string[]) ?? [];
      const inserted = [];
      for (const item of items) {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            agent_slug: "wydawniczy",
            project_id: input.project_id,
            title: item,
            description: `Checklista: ${input.title}`,
            created_by: "wydawniczy",
          })
          .select()
          .single();
        if (!error) inserted.push(data);
      }
      await supabase.from("activity").insert({
        agent_slug: "wydawniczy",
        message: `Utworzono checklistę „${input.title}” (${inserted.length} pozycji).`,
        ref_type: "project",
        ref_id: input.project_id as string,
      });
      return { created: inserted.length };
    }
    default:
      return { error: `Nieznane narzędzie: ${name}` };
  }
}

export interface WydawniczyRunResult {
  ok: boolean;
  summary: string;
}

export async function runWydawniczyTask(task: string): Promise<WydawniczyRunResult> {
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
