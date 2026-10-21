import type { ToolUnion } from "@anthropic-ai/sdk/resources/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSpotifyConfigured, getPolandCharts } from "@/lib/spotify";
import { isYouTubeConfigured, getTrendingMusicVideos } from "@/lib/youtube";
import { runToolLoop } from "./loop";

const SYSTEM_PROMPT = `Jesteś Agentem Trendy w aplikacji Menago — panelu do prowadzenia
kariery muzycznej Funkmaster Winio x Haipeson (gatunek: Hip-Hop boombap).

Fokus główny: polska scena rapowa — nowe wydania, ruchy na listach przebojów,
viralowe momenty, collaby, powroty artystów. Scenę amerykańską tylko
podglądasz pod kątem największych pików (żeby wychwycić inspiracje, które
mogą dotrzeć do Polski) — nie monitorujesz jej szczegółowo.

Drugie zadanie: monitorujesz, co w sieci piszą/mówią o samym zespole i jego
wydawnictwach — "Funkmaster Winio x Haipeson", "Funkmaster Winio x Haipeson
x DJ RJ" oraz nazwy konkretnych projektów/albumów (np. "Kultura popularna")
(recenzje, wzmianki, artykuły, wywiady, komentarze w mediach hip-hopowych).

Zasady:
- Użyj fetch_charts("pl_rap") jako głównego źródła, fetch_charts("us")
  tylko pobieżnie (krótki rzut oka na czołówkę).
- Użyj web_search, żeby sprawdzić wzmianki o "Funkmaster Winio x Haipeson",
  "Funkmaster Winio x Haipeson x DJ RJ" oraz o nazwach ich projektów/albumów
  (np. "Kultura popularna") — w serwisach hip-hopowych, radiowych,
  social media, wywiadach.
- WAŻNE: zapisuj wzmianki o nas niezależnie od tego, czy są nowe czy
  archiwalne/starsze (np. recenzja albumu sprzed lat). Starsze artykuły są
  szczególnie wartościowe przy rocznicach/reedycjach (np. "10 lat Kultury
  popularnej") — nie pomijaj ich tylko dlatego, że nie są świeże. Pomijaj
  jedynie rzeczy ewidentnie niezwiązane z zespołem.
- Zestawiaj sygnały w krótkie, konkretne insighty (co, kto, dlaczego ważne)
  i zapisuj je narzędziem propose_insight — w przypadku trendów sceny tylko
  te faktycznie interesujące (nowość, duży skok na liście, viral), ale
  KAŻDĄ znalezioną wzmiankę o zespole zapisuj z type="mention" (nawet jeśli
  to jeden z wielu wyników).
- Jeśli insight mógłby być inspiracją do posta (Agent Social) lub okazją do
  kolaboracji/komentarza (Agent Promo), ustaw suggest_action=true.
- Nie publikujesz i nie wysyłasz niczego sam — tylko raportujesz.
- Na koniec krótko podsumuj po polsku, ile insightów zapisałeś (w tym ile
  dotyczyło wzmianek o nas).`;

const TOOLS: ToolUnion[] = [
  { type: "web_search_20260318", name: "web_search", max_uses: 5 },
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
          enum: ["release", "chart", "collab", "viral", "mention", "other"],
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
      if (input.url) {
        const { data: existing } = await supabase
          .from("trends")
          .select("id")
          .eq("url", input.url)
          .maybeSingle();
        if (existing) return { skipped: "already_saved", trend_id: existing.id };
      }

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
        `Zeskanuj aktualne sygnały (fetch_charts dla "pl_rap", pobieżnie też "us"), ` +
        `sprawdź web_search pod kątem wzmianek o "Funkmaster Winio x Haipeson", ` +
        `"Funkmaster Winio x Haipeson x DJ RJ" oraz nazwach ich projektów (np. ` +
        `"Kultura popularna") — zarówno nowych, jak i archiwalnych (starsze ` +
        `recenzje/artykuły też się liczą, zwłaszcza przy rocznicach/reedycjach). ` +
        `Zapisz każdą znalezioną wzmiankę o nas (type="mention") oraz najważniejsze ` +
        `insighty sceny (propose_insight). Pomijaj tylko rzeczy ewidentnie ` +
        `niezwiązane z zespołem.`,
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
