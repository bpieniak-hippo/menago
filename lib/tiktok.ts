/**
 * Integracja TikTok for Developers (Login Kit + Display API) — konto
 * Funkmaster Winio x Haipeson. W przeciwieństwie do Gmaila/Meta, TikTok
 * wydaje access_token na tylko 24h, a każde odświeżenie refresh_tokenem
 * zwraca NOWY refresh_token (stary traci ważność). Dlatego — zgodnie z
 * zasadą „sekrety tylko w env, nigdy w bazie” — po każdym odświeżeniu
 * próbujemy nadpisać TIKTOK_ACCESS_TOKEN/TIKTOK_REFRESH_TOKEN w .env.local
 * (best-effort: działa lokalnie; na read-only hostingu po prostu używamy
 * nowego tokenu tylko w pamięci procesu do końca requestu).
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const API_BASE = "https://open.tiktokapis.com/v2";

export function isTikTokConfigured() {
  return Boolean(
    process.env.TIKTOK_CLIENT_KEY &&
      process.env.TIKTOK_CLIENT_SECRET &&
      process.env.TIKTOK_REFRESH_TOKEN,
  );
}

function persistTokens(accessToken: string, refreshToken: string) {
  process.env.TIKTOK_ACCESS_TOKEN = accessToken;
  process.env.TIKTOK_REFRESH_TOKEN = refreshToken;
  try {
    const envPath = join(process.cwd(), ".env.local");
    let content = readFileSync(envPath, "utf-8");
    content = content.replace(/^TIKTOK_ACCESS_TOKEN=.*$/m, `TIKTOK_ACCESS_TOKEN=${accessToken}`);
    content = content.replace(/^TIKTOK_REFRESH_TOKEN=.*$/m, `TIKTOK_REFRESH_TOKEN=${refreshToken}`);
    writeFileSync(envPath, content);
  } catch {
    // Read-only filesystem (np. produkcja) — token z tego requestu zadziała,
    // ale trzeba będzie ręcznie zaktualizować env na hostingu.
  }
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: process.env.TIKTOK_REFRESH_TOKEN!,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error_description ?? data?.error ?? `Błąd TikTok OAuth (${res.status})`);
  }
  persistTokens(data.access_token, data.refresh_token);
  return data.access_token as string;
}

export interface TikTokVideo {
  id: string;
  title: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  shareUrl: string;
  createTime: string;
}

/** Lista ostatnich filmów + ich wyświetlenia (pierwsza strona, max 20). */
export async function getRecentVideoViews(): Promise<{
  totalViews: number;
  videos: TikTokVideo[];
}> {
  const accessToken = await refreshAccessToken();

  const res = await fetch(
    `${API_BASE}/video/list/?fields=id,title,view_count,like_count,comment_count,share_count,share_url,create_time`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20 }),
    },
  );
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    throw new Error(data?.error?.message ?? `Błąd TikTok API (${res.status})`);
  }

  const videos: TikTokVideo[] = (data.data?.videos ?? []).map(
    (v: Record<string, unknown>) => ({
      id: v.id as string,
      title: ((v.title as string) ?? "").slice(0, 80),
      viewCount: (v.view_count as number) ?? 0,
      likeCount: (v.like_count as number) ?? 0,
      commentCount: (v.comment_count as number) ?? 0,
      shareCount: (v.share_count as number) ?? 0,
      shareUrl: (v.share_url as string) ?? "",
      createTime: v.create_time
        ? new Date((v.create_time as number) * 1000).toISOString()
        : "",
    }),
  );

  return {
    totalViews: videos.reduce((acc, v) => acc + v.viewCount, 0),
    videos,
  };
}
