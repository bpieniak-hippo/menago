import Link from "next/link";
import Header from "@/components/Header";
import { getTrends, getTeamMentions } from "@/lib/data";
import type { TrendScene } from "@/lib/types";
import {
  triggerTrendyScan,
  proposePostFromTrend,
  addMentionManually,
} from "@/app/actions/trendy";

const TRENDY_MESSAGES: Record<string, string> = {
  ok: "Skan zakończony — zapisano nowe insighty.",
  no_key: "Brak ANTHROPIC_API_KEY — nie można uruchomić Agenta Trendy.",
  no_db: "Agent Trendy wymaga skonfigurowanego Supabase (service role).",
  error: "Wystąpił błąd podczas skanu trendów.",
  task_sent: "Przekazano sugestię posta Agentowi Social.",
  mention_added: "Dodano wzmiankę.",
  missing_mention: "Podaj tytuł wzmianki.",
  mention_error:
    "Błąd zapisu — baza danych nie ma jeszcze zaktualizowanego schematu (brak typu 'mention'). Uruchom ponownie supabase/schema.sql w Supabase SQL Editor.",
};

const SCENE_LABELS: Record<string, string> = {
  pl_rap: "Polska scena",
  us: "USA (piki)",
};

const TYPE_LABELS: Record<string, string> = {
  release: "wydanie",
  chart: "chart",
  collab: "collab",
  viral: "viral",
  mention: "wzmianka o nas",
  other: "inne",
};

interface TrendyPageProps {
  searchParams: Promise<{ scene?: string; view?: string; trendy?: string }>;
}

export default async function TrendyPage({ searchParams }: TrendyPageProps) {
  const params = await searchParams;
  const view = params.view === "mentions" ? "mentions" : "scena";
  const scene =
    params.scene === "pl_rap" || params.scene === "us"
      ? (params.scene as TrendScene)
      : undefined;
  const trends =
    view === "mentions" ? await getTeamMentions() : await getTrends(scene);

  const banner = params.trendy && TRENDY_MESSAGES[params.trendy];

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        {banner && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
            {banner}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/trendy", label: "Trendy sceny", active: view === "scena" },
              { href: "/trendy?view=mentions", label: "Newsy o nas", active: view === "mentions" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  item.active
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <form action={triggerTrendyScan}>
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
              Skanuj teraz
            </button>
          </form>
        </div>

        {view === "scena" && (
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/trendy", label: "Wszystko", active: !scene },
              { href: "/trendy?scene=pl_rap", label: "Polska scena", active: scene === "pl_rap" },
              { href: "/trendy?scene=us", label: "USA (piki)", active: scene === "us" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  item.active
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {view === "mentions" && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-base font-semibold">Dodaj wzmiankę ręcznie</h2>
            <p className="mb-3 text-sm text-muted">
              Jeśli automatyczne wyszukiwanie nie znalazło jakiegoś artykułu/wzmianki,
              dodaj go tutaj ręcznie.
            </p>
            <form action={addMentionManually} className="flex flex-col gap-3">
              <input
                name="title"
                placeholder="Tytuł wzmianki (np. „Płyta tygodnia: Kultura popularna”)"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                required
              />
              <div className="flex flex-wrap gap-3">
                <input
                  name="source"
                  placeholder="Źródło (np. Polskie Radio)"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  name="url"
                  type="url"
                  placeholder="Link do artykułu"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <textarea
                name="notes"
                placeholder="Notatki (opcjonalnie)"
                rows={2}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
                Dodaj wzmiankę
              </button>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-semibold">
            {view === "mentions" ? "Newsy o zespole" : "Insighty"}
          </h2>
          {trends.length === 0 ? (
            <p className="text-sm text-muted">
              {view === "mentions"
                ? "Brak jeszcze newsów o zespole — Agent Trendy dopisze je tutaj, gdy znajdzie wzmiankę w sieci."
                : "Brak jeszcze insightów — kliknij „Skanuj teraz” albo poczekaj na codzienny cron."}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {trends.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-border px-2 py-0.5 font-mono text-[11px] text-muted">
                      {SCENE_LABELS[t.scene] ?? t.scene}
                    </span>
                    <span className="rounded-full bg-border px-2 py-0.5 font-mono text-[11px] text-muted">
                      {TYPE_LABELS[t.type] ?? t.type}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {new Date(t.detected_at).toLocaleString("pl-PL")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{t.entity}</p>
                  <p className="mt-1 text-sm text-foreground/80">{t.title}</p>
                  {t.notes && (
                    <p className="mt-1 text-sm text-muted">{t.notes}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    {t.url ? (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] text-accent hover:underline"
                      >
                        {t.source ?? "Źródło"} →
                      </a>
                    ) : (
                      <span className="font-mono text-[11px] text-muted">
                        {t.source ?? "—"}
                      </span>
                    )}
                    <form action={proposePostFromTrend}>
                      <input type="hidden" name="trend_id" value={t.id} />
                      <button className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground">
                        Zaproponuj post na podstawie tego
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
