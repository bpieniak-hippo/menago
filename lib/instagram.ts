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
