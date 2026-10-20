import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSpotifyConfigured, getPolandCharts } from "@/lib/spotify";
import { isYouTubeConfigured, getTrendingMusicVideos } from "@/lib/youtube";
import { runToolLoop } from "./loop";

const SYSTEM_PROMPT = `Jesteś Agentem Trendy w aplikacji Menago — panelu do prowadzenia
kariery muzycznej Haipeson × Winiu.

Fokus główny: polska scena rapowa — nowe wydania, ruchy na listach przebojów,
viralowe momenty, collaby, powroty artystów. Scenę amerykańską tylko
podglądasz pod kątem największych pików (żeby wychwycić inspiracje, które
mogą dotrzeć do Polski) — nie monitorujesz jej szczegółowo.

Zasady:
- Użyj fetch_charts("pl_rap") jako głównego źródła, fetch_charts("us")
  tylko pobieżnie (krótki rzut oka na czołówkę).
- Zestawiaj sygnały w krótkie, konkretne insighty (co, kto, dlaczego ważne)
  i zapisuj je narzędziem propose_insight — tylko te, które faktycznie są
  interesujące (nowość, duży skok na liście, viral), nie każdy wiersz listy.
- Jeśli insight mógłby być inspiracją do posta (Agent Social) lub okazją do
  kolaboracji/komentarza (Agent Promo), ustaw suggest_action=true.
- Nie publikujesz i nie wysyłasz niczego sam — tylko raportujesz.
- Na koniec krótko podsumuj po polsku, ile insightów zapisałeś.`;

const TOOLS: Tool[] = [
  {
    name: "fetch_charts",
    description:
      "Pobiera aktualne listy przebojów/wirusowe dla danej sceny (Spotify + YouTube trending).",
    input_schema: {
      type: "object",
      properties: {
        scene: { type: "string", enum: ["pl_rap", "us"] },
      },
      required: ["scene"],
    },
  },
  {
    name: "propose_insight",
    description: "Zapisuje insight o trendzie i opcjonalnie zgłasza go jako sugestię akcji.",
    input_schema: {
      type: "object",
      properties: {
        scene: { type: "string", enum: ["pl_rap", "us"] },
        entity: { type: "string", description: "artysta / utwór / wytwórnia" },
        type: {
          type: "string",
          enum: ["release", "chart", "collab", "viral", "other"],
        },
        title: { type: "string", description: "krótki opis insightu" },
        source: { type: "string", description: "np. 'Spotify Top 50 PL'" },
        url: { type: "string" },
        relevance_score: { type: "number", description: "0-100" },
        notes: { type: "string" },
        suggest_action: {
          type: "boolean",
          description: "czy dodać do kolejki jako sugestię dla Social/Promo",
        },
      },
      required: ["scene", "entity", "type", "title"],
    },
  },
];

async function execTool(name: string, input: Record<string, unknown>) {
  const supabase = createAdminClient();

  switch (name) {
    case "fetch_charts": {
      const scene = input.scene as "pl_rap" | "us";
      const result: Record<string, unknown> = {};

      if (scene === "pl_rap") {
        if (isSpotifyConfigured()) {
          try {
            result.spotify = await getPolandCharts();
          } catch (err) {
            result.spotify_error = (err as Error).message;
          }
        }
        if (isYouTubeConfigured()) {
          try {
            result.youtube_trending = await getTrendingMusicVideos("PL", 10);
          } catch (err) {
            result.youtube_error = (err as Error).message;
          }
        }
      } else {
        if (isYouTubeConfigured()) {
          try {
            result.youtube_trending = await getTrendingMusicVideos("US", 5);
          } catch (err) {
            result.youtube_error = (err as Error).message;
          }
        }
      }

      if (Object.keys(result).length === 0) {
        return { error: "Brak skonfigurowanych źródeł (Spotify/YouTube) dla tej sceny." };
      }
      return result;
    }
    case "propose_insight": {
      const { data: trend, error } = await supabase
        .from("trends")
        .insert({
          scene: input.scene,
          entity: input.entity,
          type: input.type,
          title: input.title,
          source: input.source ?? null,
          url: input.url ?? null,
          relevance_score: input.relevance_score ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) return { error: error.message };

      await supabase.from("activity").insert({
        agent_slug: "trendy",
        message: `Nowy insight (${input.scene}): ${input.title}`,
        ref_type: "trend",
        ref_id: trend.id,
      });

      if (input.suggest_action) {
        await supabase.from("approvals").insert({
          agent_slug: "trendy",
          kind: "other",
          title: `Sugestia na podstawie trendu: ${input.title}`,
          payload: { trend_id: trend.id, entity: input.entity, notes: input.notes ?? null },
          status: "pending",
        });
      }

      return trend;
    }
    default:
      return { error: `Nieznane narzędzie: ${name}` };
  }
}

export interface TrendyRunResult {
  ok: boolean;
  summary: string;
}

export async function runTrendyScan(): Promise<TrendyRunResult> {
  try {
    const summary = await runToolLoop({
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      execTool,
      userPrompt:
        `Zeskanuj aktualne sygnały (fetch_charts dla "pl_rap", pobieżnie też "us") ` +
        `i zapisz najważniejsze insighty (propose_insight). Pomijaj rzeczy nieistotne.`,
      maxTurns: 8,
    });

    const supabase = createAdminClient();
    await supabase.from("activity").insert({
      agent_slug: "trendy",
      message: `Skan trendów: ${summary}`,
    });

    return { ok: true, summary };
  } catch (err) {
    return { ok: false, summary: (err as Error).message };
  }
}
