/**
 * Integracja Spotify Web API (client credentials — dane publiczne, bez
 * logowania użytkownika). Używana przez Agenta Trendy (MENAGO_SPEC.md §3.8, §6)
 * do odczytu polskich list przebojów/wirusowych.
 *
 * Uwaga: ID playlist edytorskich Spotify bywają zmieniane przez Spotify —
 * jeśli przestaną działać, zaktualizuj env (patrz README).
 */

const DEFAULT_PL_TOP = "37i9dQZEVXbN6itCcaL3Tt"; // Top 50 - Poland
const DEFAULT_PL_VIRAL = "37i9dQZEVXbKkidEfWyWOj"; // Viral 50 - Poland

export function isSpotifyConfigured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description ?? "Błąd autoryzacji Spotify");
  return data.access_token as string;
}

export interface SpotifyTrack {
  position: number;
  title: string;
  artists: string;
  url: string | null;
}

async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(name,artists(name),external_urls))`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Błąd pobierania playlisty Spotify");

  return (data.items ?? []).map(
    (
      item: { track: { name: string; artists: { name: string }[]; external_urls?: { spotify?: string } } },
      index: number,
    ) => ({
      position: index + 1,
      title: item.track?.name ?? "?",
      artists: (item.track?.artists ?? []).map((a) => a.name).join(", "),
      url: item.track?.external_urls?.spotify ?? null,
    }),
  );
}

/** Top 50 i Viral 50 dla Polski — główne źródło sygnałów o scenie PL. */
export async function getPolandCharts(): Promise<{
  top: SpotifyTrack[];
  viral: SpotifyTrack[];
}> {
  const topPlaylistId = process.env.SPOTIFY_PL_TOP_PLAYLIST_ID ?? DEFAULT_PL_TOP;
  const viralPlaylistId = process.env.SPOTIFY_PL_VIRAL_PLAYLIST_ID ?? DEFAULT_PL_VIRAL;
  const [top, viral] = await Promise.all([
    getPlaylistTracks(topPlaylistId),
    getPlaylistTracks(viralPlaylistId),
  ]);
  return { top, viral };
}
