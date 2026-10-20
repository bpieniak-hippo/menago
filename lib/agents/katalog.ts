import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { runToolLoop } from "./loop";

const SYSTEM_PROMPT = `Jesteś Agentem Katalog w aplikacji Menago — panelu do prowadzenia
kariery muzycznej Haipeson × Winiu.

Zadanie: pilnujesz rocznic wydawnictw (np. premier starszych projektów),
proponujesz akcje wokół starego katalogu i zbierasz okazje do licencji
(sync).

Zasady:
- Najpierw read_releases, żeby zobaczyć cały katalog (daty premier, notatki).
- Jeśli widzisz zbliżającą się/aktualną rocznicę albo dobrą okazję, zapisz
  propozycję kampanii narzędziem propose_campaign (status "proposed" —
  wymaga przejrzenia przez Managera/użytkownika, nie jest jeszcze aktywną
  kampanią promo).
- Na koniec krótko podsumuj po polsku, co zaproponowałeś.`;

const TOOLS: Tool[] = [
  {
    name: "read_releases",
    description: "Lista wszystkich projektów/wydawnictw z datami premiery i notatkami.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "propose_campaign",
    description: "Zapisuje propozycję kampanii wokół katalogu (status: proposed).",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        name: { type: "string" },
        rationale: { type: "string", description: "dlaczego warto, np. '10 lat od premiery'" },
      },
      required: ["project_id", "name", "rationale"],
    },
  },
];

async function execTool(name: string, input: Record<string, unknown>) {
  const supabase = createAdminClient();

  switch (name) {
    case "read_releases": {
      const { data } = await supabase.from("projects").select("*");
      return data ?? [];
    }
    case "propose_campaign": {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          project_id: input.project_id,
          name: input.name,
          plan: { rationale: input.rationale },
          status: "proposed",
        })
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "katalog",
        message: `Propozycja kampanii katalogowej: „${input.name}” — ${input.rationale}`,
        ref_type: "campaign",
        ref_id: data.id,
      });
      return data;
    }
    default:
      return { error: `Nieznane narzędzie: ${name}` };
  }
}

export interface KatalogRunResult {
  ok: boolean;
  summary: string;
}

export async function runKatalogTask(task: string): Promise<KatalogRunResult> {
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
