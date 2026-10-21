import Header from "@/components/Header";
import { isInstagramConfigured, getRecentMediaViews } from "@/lib/instagram";
import { isFacebookConfigured, getRecentPostMetrics } from "@/lib/facebook";
import { isTikTokConfigured, getRecentVideoViews } from "@/lib/tiktok";

interface Row {
  id: string;
  label: string;
  date: string;
  views: number;
  likes: number;
  comments: number;
  link: string;
}

async function loadInstagram(): Promise<Row[] | null> {
  if (!isInstagramConfigured()) return null;
  try {
    const media = await getRecentMediaViews(10);
    return media.map((m) => ({
      id: m.id,
      label: m.caption || "(bez opisu)",
      date: m.timestamp,
      views: m.views,
      likes: m.likes,
      comments: m.comments,
      link: m.permalink,
    }));
  } catch {
    return [];
  }
}

async function loadFacebook(): Promise<Row[] | null> {
  if (!isFacebookConfigured()) return null;
  try {
    const posts = await getRecentPostMetrics(10);
    return posts.map((p) => ({
      id: p.id,
      label: p.message || "(bez treści)",
      date: p.timestamp,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      link: p.permalink,
    }));
  } catch {
    return [];
  }
}

async function loadTikTok(): Promise<Row[] | null> {
  if (!isTikTokConfigured()) return null;
  try {
    const { videos } = await getRecentVideoViews();
    return videos.map((v) => ({
      id: v.id,
      label: v.title || "(bez tytułu)",
      date: v.createTime,
      views: v.viewCount,
      likes: v.likeCount,
      comments: v.commentCount,
      link: v.shareUrl,
    }));
  } catch {
    return [];
  }
}

export default async function SocialPage() {
  const [instagram, facebook, tiktok] = await Promise.all([
    loadInstagram(),
    loadFacebook(),
    loadTikTok(),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Social media</h2>
          <p className="mt-1 text-sm text-muted">
            Wyświetlenia, polubienia i komentarze z ostatnich postów —
            Facebook, Instagram, TikTok.
          </p>
        </section>

        <PlatformTable title="Facebook" rows={facebook} />
        <PlatformTable title="Instagram" rows={instagram} />
        <PlatformTable title="TikTok" rows={tiktok} />
      </main>
    </>
  );
}

function PlatformTable({ title, rows }: { title: string; rows: Row[] | null }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>

      {rows === null && (
        <p className="text-sm text-muted">
          Nie podłączono — uzupełnij odpowiednie zmienne w .env.local (patrz README).
        </p>
      )}

      {rows !== null && rows.length === 0 && (
        <p className="text-sm text-muted">Brak postów do pokazania.</p>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Treść</th>
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Wyświetlenia</th>
                <th className="py-2 pr-3">Polubienia</th>
                <th className="py-2 pr-3">Komentarze</th>
                <th className="py-2 pr-3">Link</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className="max-w-xs truncate py-2 pr-3">{row.label}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted">
                    {row.date ? new Date(row.date).toLocaleDateString("pl-PL") : "—"}
                  </td>
                  <td className="py-2 pr-3">{row.views.toLocaleString("pl-PL")}</td>
                  <td className="py-2 pr-3">{row.likes.toLocaleString("pl-PL")}</td>
                  <td className="py-2 pr-3">{row.comments.toLocaleString("pl-PL")}</td>
                  <td className="py-2 pr-3">
                    {row.link ? (
                      <a
                        href={row.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        otwórz
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
