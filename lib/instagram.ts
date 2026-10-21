/**
 * Integracja Instagram Graph API (Content Publishing) — opcja B z MENAGO_SPEC.md §6.
 * (Opcja A, Metricool, wymagałaby weryfikacji dostępu do ich API w ramach
 * obecnego planu — na start wybrano Graph API, bo jest w pełni udokumentowane
 * i sterowalne wyłącznie przez env.)
 *
 * Wymaga konta profesjonalnego IG + długo działającego tokenu dostępu.
 * Zgodnie z zasadą „sekrety tylko w env”: IG_USER_ID / IG_ACCESS_TOKEN.
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function isInstagramConfigured() {
  return Boolean(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN);
}

async function graphRequest(
  path: string,
  params: Record<string, string | undefined>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", process.env.IG_ACCESS_TOKEN!);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Błąd Instagram API (${res.status})`);
  }
  return data;
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
    throw new Error(data?.error?.message ?? `Błąd Instagram API (${res.status})`);
  }
  return data;
}

interface InsightValue {
  name: string;
  values: Array<{ value: number }>;
}

/** Zsumowane wyświetlenia/zasięg konta IG za ostatnie `days` dni. */
export async function getAccountInsights(
  days = 7,
): Promise<{ views: number; reach: number }> {
  const igUserId = process.env.IG_USER_ID!;
  // "views" zastąpiło "impressions" na poziomie konta w nowszych wersjach API —
  // próbujemy "views", a przy błędzie (starsze konto) spadamy na "impressions".
  let metricName = "views";
  let data: Record<string, unknown>;
  try {
    data = await graphGet(`/${igUserId}/insights`, {
      metric: "views,reach",
      period: "day",
      metric_type: "total_value",
      timeframe: `last_${days}_days`,
    });
  } catch {
    metricName = "impressions";
    data = await graphGet(`/${igUserId}/insights`, {
      metric: "impressions,reach",
      period: "day",
      since: String(Math.floor(Date.now() / 1000) - days * 86400),
      until: String(Math.floor(Date.now() / 1000)),
    });
  }

  const rows = (data.data ?? []) as InsightValue[];
  const sum = (name: string) =>
    rows
      .filter((r) => r.name === name)
      .flatMap((r) => r.values)
      .reduce((acc, v) => acc + (v.value ?? 0), 0);

  return { views: sum(metricName), reach: sum("reach") };
}

export interface MediaViews {
  id: string;
  caption: string;
  mediaType: string;
  timestamp: string;
  views: number;
  likes: number;
  comments: number;
  permalink: string;
}

/** Wyświetlenia/zasięg/polubienia/komentarze dla ostatnich `limit` postów IG. */
export async function getRecentMediaViews(limit = 10): Promise<MediaViews[]> {
  const igUserId = process.env.IG_USER_ID!;
  const list = await graphGet(`/${igUserId}/media`, {
    fields: "id,caption,media_type,timestamp,permalink,like_count,comments_count",
    limit: String(limit),
  });
  const items = (list.data ?? []) as Array<{
    id: string;
    caption?: string;
    media_type: string;
    timestamp: string;
    permalink?: string;
    like_count?: number;
    comments_count?: number;
  }>;

  const results = await Promise.all(
    items.map(async (item): Promise<MediaViews | null> => {
      const metric =
        item.media_type === "VIDEO" || item.media_type === "REELS" || item.media_type === "CAROUSEL_ALBUM"
          ? "plays,reach"
          : "impressions,reach";
      try {
        const insights = await graphGet(`/${item.id}/insights`, { metric });
        const rows = (insights.data ?? []) as InsightValue[];
        const sum = (name: string) =>
          rows
            .filter((r) => r.name === name)
            .flatMap((r) => r.values)
            .reduce((acc, v) => acc + (v.value ?? 0), 0);
        const views = sum("plays") || sum("impressions") || sum("reach");
        return {
          id: item.id,
          caption: (item.caption ?? "").slice(0, 80),
          mediaType: item.media_type,
          timestamp: item.timestamp,
          views,
          likes: item.like_count ?? 0,
          comments: item.comments_count ?? 0,
          permalink: item.permalink ?? "",
        };
      } catch {
        return null;
      }
    }),
  );

  return results.filter((r): r is MediaViews => r !== null);
}

export type PostFormat = "post" | "karuzela" | "reel" | "story";

/**
 * Publikuje post na Instagramie (tworzy kontener + publikuje).
 * Media muszą być pod publicznym URL w momencie wywołania (spec §6).
 * Uwaga: dla reels publikacja bywa asynchroniczna (status_code PROCESSING) —
 * na MVP nie odpytujemy statusu, publikujemy od razu (uproszczenie).
 */
export async function publishPost({
  format,
  caption,
  mediaUrls,
}: {
  format: PostFormat;
  caption?: string;
  mediaUrls: string[];
}): Promise<{ externalId: string }> {
  const igUserId = process.env.IG_USER_ID!;
  if (mediaUrls.length === 0) {
    throw new Error("Brak media_urls do publikacji.");
  }

  let creationId: string;

  if (format === "karuzela") {
    if (mediaUrls.length < 2) {
      throw new Error("Karuzela wymaga co najmniej 2 mediów.");
    }
    const children = await Promise.all(
      mediaUrls.map(async (imageUrl) => {
        const child = await graphRequest(`/${igUserId}/media`, {
          image_url: imageUrl,
          is_carousel_item: "true",
        });
        return child.id as string;
      }),
    );
    const container = await graphRequest(`/${igUserId}/media`, {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption,
    });
    creationId = container.id as string;
  } else if (format === "reel" || format === "story") {
    const container = await graphRequest(`/${igUserId}/media`, {
      media_type: format === "reel" ? "REELS" : "STORIES",
      video_url: mediaUrls[0],
      caption,
    });
    creationId = container.id as string;
  } else {
    const container = await graphRequest(`/${igUserId}/media`, {
      image_url: mediaUrls[0],
      caption,
    });
    creationId = container.id as string;
  }

  const published = await graphRequest(`/${igUserId}/media_publish`, {
    creation_id: creationId,
  });
  return { externalId: published.id as string };
}
