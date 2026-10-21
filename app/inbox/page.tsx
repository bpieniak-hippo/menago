import Header from "@/components/Header";
import { isGmailConfigured, listInboxThreads } from "@/lib/google/gmail";
import { requestReplyDraft } from "@/app/actions/inbox";

const INBOX_MESSAGES: Record<string, string> = {
  draft_ok: "Szkic odpowiedzi przygotowany — zobacz kolejkę zatwierdzeń na dashboardzie.",
  no_gmail: "Gmail nie jest podłączony (brak kluczy w .env.local).",
  no_key: "Brak ANTHROPIC_API_KEY — nie można wygenerować szkicu.",
  no_db: "Wymaga skonfigurowanego Supabase (service role).",
  error: "Wystąpił błąd podczas przygotowywania szkicu.",
};

interface InboxPageProps {
  searchParams: Promise<{ inbox?: string }>;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const sp = await searchParams;
  const banner = sp.inbox && INBOX_MESSAGES[sp.inbox];
  const configured = isGmailConfigured();
  const threads = configured ? await listInboxThreads(25) : [];
  const needsReply = threads.filter((t) => t.needsReply);
  const rest = threads.filter((t) => !t.needsReply);

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        {banner && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
            {banner}
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Poczta</h2>
          <p className="mt-1 text-sm text-muted">
            Skrzynka funkmasterwinio.haipeson@gmail.com — ostatnie wątki z
            inboxa. Agent nie wysyła nic sam: szkic odpowiedzi trafia do
            kolejki zatwierdzeń na dashboardzie.
          </p>

          {!configured && (
            <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
              Gmail nie jest jeszcze podłączony — uzupełnij GOOGLE_CLIENT_ID,
              GOOGLE_CLIENT_SECRET i GOOGLE_REFRESH_TOKEN w .env.local (patrz
              README).
            </p>
          )}
        </section>

        {configured && (
          <>
            <section>
              <h2 className="mb-3 text-base font-semibold text-amber-400">
                Czeka na odpowiedź ({needsReply.length})
              </h2>
              {needsReply.length === 0 ? (
                <p className="text-sm text-muted">
                  Brak wątków czekających na odpowiedź.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {needsReply.map((t) => (
                    <ThreadRow key={t.threadId} thread={t} />
                  ))}
                </div>
              )}
            </section>

            {rest.length > 0 && (
              <section>
                <h2 className="mb-3 text-base font-semibold">
                  Pozostałe wątki
                </h2>
                <div className="flex flex-col gap-2">
                  {rest.map((t) => (
                    <ThreadRow key={t.threadId} thread={t} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

function ThreadRow({
  thread,
}: {
  thread: Awaited<ReturnType<typeof listInboxThreads>>[number];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{thread.subject}</p>
            {thread.unread && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
                nowe
              </span>
            )}
            {thread.needsReply && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-400">
                czeka na odpowiedź
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-muted">
            {thread.from} · {thread.date}
          </p>
          <p className="mt-1 text-sm text-foreground/80">{thread.snippet}</p>
        </div>
        {thread.needsReply && (
          <form action={requestReplyDraft}>
            <input type="hidden" name="thread_id" value={thread.threadId} />
            <button
              type="submit"
              className="shrink-0 rounded-md border border-accent/60 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/10"
            >
              Poproś o szkic odpowiedzi
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
