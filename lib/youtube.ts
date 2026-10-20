/**
 * Integracja YouTube Data API. Używana przez Agenta Trendy do odczytu
 * trendujących teledysków (kategoria „Music” = 10).
 */

export function isYouTubeConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

export interface YouTubeTrendingVideo {
  title: string;
  channelTitle: string;
  url: string;
  viewCount: number;
  publishedAt: string;
}

/** Trendujące teledyski (kategoria Music) w danym regionie (np. "PL", "US"). */
export async function getTrendingMusicVideos(
  regionCode: string,
  maxResults = 10,
): Promise<YouTubeTrendingVideo[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("videoCategoryId", "10");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Błąd YouTube Data API");
  }

  return (data.items ?? []).map(
    (item: {
      id: string;
      snippet: { title: string; channelTitle: string; publishedAt: string };
      statistics?: { viewCount?: string };
    }) => ({
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      viewCount: Number(item.statistics?.viewCount ?? 0),
      publishedAt: item.snippet.publishedAt,
    }),
  );
}
