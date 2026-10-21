/**
 * Integracja Facebook Page Insights (Graph API) — fanpage Funkmaster Winio x
 * Haipeson. Współdzieli token z Instagramem (`IG_ACCESS_TOKEN`), bo jedna
 * długo działająca token użytkownika z uprawnieniami pages_read_engagement +
 * read_insights obsługuje też stronę połączoną z kontem IG.
 * Zgodnie z zasadą „sekrety tylko w env”: FB_PAGE_ID + IG_ACCESS_TOKEN.
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function isFacebookConfigured() {
  return Boolean(process.env.FB_PAGE_ID && process.env.IG_ACCESS_TOKEN);
}

interface InsightValue {
  name: string;
  values: Array<{ value: number }>;
}

async function graphGet(
  path: string,
  params: Record<string, string | undefined>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", process.env.IG_ACCESS_TOKEN!);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Błąd Facebook API (${res.status})`);
  }
  return data;
}

/** Zsumowane wyświetlenia/odsłony fanpage'a za ostatnie `days` dni. */
export async function getPageInsights(
  days = 7,
): Promise<{ impressions: number; pageViews: number }> {
  const pageId = process.env.FB_PAGE_ID!;
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const until = Math.floor(Date.now() / 1000);

  const data = await graphGet(`/${pageId}/insights`, {
    metric: "page_impressions,page_views_total",
    period: "day",
    since: String(since),
    until: String(until),
  });

  const rows = (data.data ?? []) as InsightValue[];
  const sum = (name: string) =>
    rows
      .filter((r) => r.name === name)
      .flatMap((r) => r.values)
      .reduce((acc, v) => acc + (v.value ?? 0), 0);

  return {
    impressions: sum("page_impressions"),
    pageViews: sum("page_views_total"),
  };
}

export interface FacebookPostMetrics {
  id: string;
  message: string;
  permalink: string;
  timestamp: string;
  views: number;
  likes: number;
  comments: number;
}

/** Ostatnie `limit` postów fanpage'a + ich zasięg/polubienia/komentarze. */
export async function getRecentPostMetrics(limit = 10): Promise<FacebookPostMetrics[]> {
  const pageId = process.env.FB_PAGE_ID!;
  const list = await graphGet(`/${pageId}/posts`, {
    fields: "id,message,permalink_url,created_time,likes.summary(true),comments.summary(true)",
    limit: String(limit),
  });
  const items = (list.data ?? []) as Array<{
    id: string;
    message?: string;
    permalink_url?: string;
    created_time: string;
    likes?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
  }>;

  const results = await Promise.all(
    items.map(async (item): Promise<FacebookPostMetrics | null> => {
      try {
        const insights = await graphGet(`/${item.id}/insights`, {
          metric: "post_impressions",
        });
        const rows = (insights.data ?? []) as InsightValue[];
        const views = rows
          .filter((r) => r.name === "post_impressions")
          .flatMap((r) => r.values)
          .reduce((acc, v) => acc + (v.value ?? 0), 0);
        return {
          id: item.id,
          message: (item.message ?? "").slice(0, 80),
          permalink: item.permalink_url ?? "",
          timestamp: item.created_time,
          views,
          likes: item.likes?.summary?.total_count ?? 0,
          comments: item.comments?.summary?.total_count ?? 0,
        };
      } catch {
        return {
          id: item.id,
          message: (item.message ?? "").slice(0, 80),
          permalink: item.permalink_url ?? "",
          timestamp: item.created_time,
          views: 0,
          likes: item.likes?.summary?.total_count ?? 0,
          comments: item.comments?.summary?.total_count ?? 0,
        };
      }
    }),
  );

  return results.filter((r): r is FacebookPostMetrics => r !== null);
}
