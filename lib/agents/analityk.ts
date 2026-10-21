import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInstagramConfigured, getAccountInsights, getRecentMediaViews } from "@/lib/instagram";
import { isFacebookConfigured, getPageInsights } from "@/lib/facebook";
import { isTikTokConfigured, getRecentVideoViews } from "@/lib/tiktok";
import { runToolLoop } from "./loop";

const SYSTEM_PROMPT = `Jesteś Agentem Analitykiem w aplikacji Menago — panelu do prowadzenia
kariery muzycznej Funkmaster Winio x Haipeson (gatunek: Hip-Hop boombap).

Zadanie: raportujesz wyniki — statystyki postów, kampanii mailowych
(wysłane/odpowiedzi), postęp projektów oraz realne wyświetlenia z Instagrama,
fanpage'a Facebooka i TikToka (jeśli podłączone).

Zasady:
- Zbierz dane: read_projects, fetch_social_stats, read_campaign_stats,
  fetch_instagram_insights, fetch_facebook_insights, fetch_tiktok_insights.
- Jeśli któraś platforma nie jest podłączona (not_configured), po prostu
  wspomnij o tym krótko — nie traktuj tego jako błąd.
- Napisz zwięzły raport (4-8 zdań po polsku), uwzględniając realne wyświetlenia
  per platforma, i zapisz go write_report.
- Nie twórz nowych zadań dla innych agentów — tylko raportuj.`;

const TOOLS: Tool[] = [
  {
    name: "read_projects",
    description: "Lista projektów z etapem i postępem.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "fetch_social_stats",
    description: "Statystyki postów (ile szkiców/zakolejkowanych/opublikowanych/błędów).",
    input_schema: {
      type: "object",
      properties: { project_id: { type: "string", description: "opcjonalnie — filtr po projekcie" } },
    },
  },
  {
    name: "read_campaign_stats",
    description: "Statystyki kampanii mailowych (wysłane / odpowiedzi / w toku).",
    input_schema: {
      type: "object",
      properties: { project_id: { type: "string", description: "opcjonalnie — filtr po projekcie" } },
    },
  },
  {
    name: "write_report",
    description: "Zapisuje raport tygodniowy.",
    input_schema: {
      type: "object",
      properties: { content: { type: "string" } },
      required: ["content"],
    },
  },
  {
    name: "fetch_instagram_insights",
    description:
      "Realne wyświetlenia/zasięg konta IG za ostatnie 7 dni + top ostatnich postów.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "fetch_facebook_insights",
    description: "Realne wyświetlenia/odsłony fanpage'a Facebook za ostatnie 7 dni.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "fetch_tiktok_insights",
    description: "Realne wyświetlenia ostatnich filmów na TikToku.",
    input_schema: { type: "object", properties: {} },
  },
];

async function execTool(name: string, input: Record<string, unknown>) {
  const supabase = createAdminClient();

  switch (name) {
    case "read_projects": {
      const { data } = await supabase.from("projects").select("*");
      return data ?? [];
    }
    case "fetch_social_stats": {
      let query = supabase.from("posts").select("status");
      if (input.project_id) query = query.eq("project_id", input.project_id);
      const { data } = await query;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
      }
      return counts;
    }
    case "read_campaign_stats": {
      let campaignQuery = supabase.from("campaigns").select("id");
      if (input.project_id) campaignQuery = campaignQuery.eq("project_id", input.project_id);
      const { data: campaigns } = await campaignQuery;
      const campaignIds = (campaigns ?? []).map((c) => c.id);
      if (campaignIds.length === 0) return { sent: 0, replied: 0, draft: 0 };

      const { data: emails } = await supabase
        .from("emails")
        .select("status, replied_at")
        .in("campaign_id", campaignIds);

      const counts = { sent: 0, replied: 0, draft: 0, failed: 0 };
      for (const row of emails ?? []) {
        if (row.status === "sent") counts.sent += 1;
        if (row.status === "draft") counts.draft += 1;
        if (row.status === "failed") counts.failed += 1;
        if (row.replied_at) counts.replied += 1;
      }
      return counts;
    }
    case "fetch_instagram_insights": {
      if (!isInstagramConfigured()) return { error: "not_configured" };
      try {
        const [account, media] = await Promise.all([
          getAccountInsights(7),
          getRecentMediaViews(10),
        ]);
        return { account, recent_media: media };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
    case "fetch_facebook_insights": {
      if (!isFacebookConfigured()) return { error: "not_configured" };
      try {
        return await getPageInsights(7);
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
    case "fetch_tiktok_insights": {
      if (!isTikTokConfigured()) return { error: "not_configured" };
      try {
        return await getRecentVideoViews();
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
    case "write_report": {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from("reports")
        .insert({
          agent_slug: "analityk",
          period_start: weekAgo.toISOString().slice(0, 10),
          period_end: today.toISOString().slice(0, 10),
          content: input.content,
        })
        .select()
        .single();
      if (error) return { error: error.message };
      await supabase.from("activity").insert({
        agent_slug: "analityk",
        message: `Raport tygodniowy zapisany.`,
        ref_type: "report",
        ref_id: data.id,
      });
      return data;
    }
    default:
      return { error: `Nieznane narzędzie: ${name}` };
  }
}

export interface AnalitykRunResult {
  ok: boolean;
  summary: string;
}

async function run(userPrompt: string): Promise<AnalitykRunResult> {
  try {
    const summary = await runToolLoop({
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      execTool,
      userPrompt,
    });
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, summary: (err as Error).message };
  }
}

export async function runAnalitykTask(task: string): Promise<AnalitykRunResult> {
  return run(`Zadanie od Managera: "${task}"\n\nSprawdź, czego dotyczy, i wykonaj odpowiednie kroki.`);
}

export async function runWeeklyReport(): Promise<AnalitykRunResult> {
  return run(
    `Przygotuj raport tygodniowy: sprawdź projekty, statystyki postów i kampanii ` +
      `mailowych (read_projects, fetch_social_stats, read_campaign_stats bez project_id ` +
      `— dla wszystkiego), a także realne wyświetlenia (fetch_instagram_insights, ` +
      `fetch_facebook_insights, fetch_tiktok_insights), napisz podsumowanie i zapisz je (write_report).`,
  );
}
