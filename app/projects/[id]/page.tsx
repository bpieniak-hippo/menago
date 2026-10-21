import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import TrackCard from "@/components/TrackCard";
import ProjectItemRow from "@/components/ProjectItemRow";
import ProjectCampaignPanel from "@/components/ProjectCampaignPanel";
import {
  getProjectById,
  getTracksForProject,
  getTrackItemsForTracks,
  getProjectItems,
  getCampaignForProject,
  getCampaignEmails,
  getPendingEmailApprovalsForCampaign,
} from "@/lib/data";
import { updateProject } from "@/app/actions/projects";
import { createTrack } from "@/app/actions/tracks";
import { createProjectItem } from "@/app/actions/projectItems";
import { isProjectReleased } from "@/lib/projectSummary";
import type { StreamingPlatform } from "@/lib/types";

const PROJECT_MESSAGES: Record<string, string> = {
  saved: "Zapisano zmiany projektu.",
};

const TRACKS_MESSAGES: Record<string, string> = {
  added: "Dodano utwór do tracklisty.",
  saved: "Zapisano zmiany utworu.",
  deleted: "Usunięto utwór.",
  missing: "Podaj tytuł utworu.",
  error: "Błąd zapisu utworu w bazie danych.",
  item_added: "Dodano element checklisty.",
  item_saved: "Zapisano element checklisty.",
  item_deleted: "Usunięto element checklisty.",
  missing_item: "Podaj nazwę elementu checklisty.",
};

const PROJECT_ITEMS_MESSAGES: Record<string, string> = {
  added: "Dodano element.",
  saved: "Zapisano element.",
  deleted: "Usunięto element.",
  missing: "Podaj nazwę elementu.",
};

const PROMO_MESSAGES: Record<string, string> = {
  ok: "Wygenerowano plan kampanii i szkice maili.",
  no_key: "Brak ANTHROPIC_API_KEY — nie można uruchomić Agenta Promo.",
  no_db: "Agent Promo wymaga skonfigurowanego Supabase (service role).",
  error: "Wystąpił błąd podczas generowania kampanii.",
};

const APPROVALS_MESSAGES: Record<string, string> = {
  approved: "Zatwierdzono i wysłano szkice.",
};

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

const TABS = [
  { key: "przeglad", label: "Przegląd" },
  { key: "tracklista", label: "Tracklista" },
  { key: "etapy", label: "Etapy" },
  { key: "kampania", label: "Kampania" },
] as const;

const STREAMING_PLATFORMS: { key: StreamingPlatform; label: string }[] = [
  { key: "spotify", label: "Spotify" },
  { key: "apple_music", label: "Apple Music" },
  { key: "youtube_music", label: "YouTube Music" },
  { key: "tidal", label: "Tidal" },
  { key: "soundcloud", label: "SoundCloud" },
];

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    project?: string;
    tracks?: string;
    project_items?: string;
    promo?: string;
    approvals?: string;
  }>;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const project = await getProjectById(id);
  if (!project) notFound();

  const tab = TABS.some((t) => t.key === sp.tab)
    ? sp.tab!
    : sp.tracks
      ? "tracklista"
      : sp.project_items
        ? "etapy"
        : sp.promo || sp.approvals
          ? "kampania"
          : "przeglad";

  const tracks = await getTracksForProject(id);
  const trackItems = await getTrackItemsForTracks(tracks.map((t) => t.id));
  const projectItems = await getProjectItems(id);
  const campaign = await getCampaignForProject(id);
  const emails = campaign ? await getCampaignEmails(campaign.id) : [];
  const drafts = campaign
    ? await getPendingEmailApprovalsForCampaign(campaign.id)
    : [];
  const released = isProjectReleased(project);

  const banner =
    (sp.project && PROJECT_MESSAGES[sp.project]) ||
    (sp.tracks && TRACKS_MESSAGES[sp.tracks]) ||
    (sp.project_items && PROJECT_ITEMS_MESSAGES[sp.project_items]) ||
    (sp.promo && PROMO_MESSAGES[sp.promo]) ||
    (sp.approvals && APPROVALS_MESSAGES[sp.approvals]);

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{project.name}</h1>
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                {project.type}
              </span>
              {released && (
                <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-green-400">
                  ✓ Wydany
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-status-progress"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-muted">
                {project.progress}% ukończone
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">
            Etap: {project.stage}
            {project.release_date &&
              ` · premiera: ${new Date(project.release_date).toLocaleDateString("pl-PL")}`}
          </p>

          {Object.keys(project.links).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {STREAMING_PLATFORMS.filter((p) => project.links[p.key]).map(
                (p) => (
                  <a
                    key={p.key}
                    href={project.links[p.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border px-3 py-1 text-xs text-accent transition hover:bg-accent/10"
                  >
                    {p.label} ↗
                  </a>
                ),
              )}
            </div>
          )}
        </section>

        <nav className="flex flex-wrap gap-1 border-b border-border font-mono text-xs">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/projects/${id}?tab=${t.key}`}
              className={`rounded-t-md px-3 py-2 transition ${
                tab === t.key
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {tab === "przeglad" && (
          <OverviewTab project={project} campaign={campaign} />
        )}

        {tab === "tracklista" && (
          <TracklistSection
            tracks={tracks}
            trackItems={trackItems}
            projectId={project.id}
          />
        )}

        {tab === "etapy" && (
          <ProjectItemsSection
            projectItems={projectItems}
            projectId={project.id}
          />
        )}

        {tab === "kampania" && (
          <ProjectCampaignPanel
            project={project}
            campaign={campaign}
            emails={emails}
            drafts={drafts}
            returnTo={`/projects/${id}?tab=kampania`}
          />
        )}
      </main>
    </>
  );
}

function OverviewTab({
  project,
  campaign,
}: {
  project: Awaited<ReturnType<typeof getProjectById>>;
  campaign: Awaited<ReturnType<typeof getCampaignForProject>>;
}) {
  if (!project) return null;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-base font-semibold">Opis i dane projektu</h2>
        <p className="mb-4 text-xs text-muted">
          Procent ukończenia liczy się automatycznie z tracklisty i etapów —
          zrobione / (zrobione + do zrobienia), pozycje „nie dotyczy” są
          pomijane.
        </p>
        <form
          action={updateProject}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={project.id} />
          <input type="hidden" name="tab" value="przeglad" />
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
            Nazwa
            <input
              name="name"
              defaultValue={project.name}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Typ
            <input
              name="type"
              defaultValue={project.type}
              required
              list="project-types"
              className={inputClass}
            />
            <datalist id="project-types">
              <option value="album" />
              <option value="EP" />
              <option value="singiel" />
              <option value="reedycja/kampania" />
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Etap
            <input
              name="stage"
              defaultValue={project.stage}
              required
              list="project-stages"
              className={inputClass}
            />
            <datalist id="project-stages">
              <option value="pomysł" />
              <option value="nagrywanie" />
              <option value="mix/master" />
              <option value="gotowy" />
              <option value="promocja" />
              <option value="wydany" />
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Data premiery
            <input
              type="date"
              name="release_date"
              defaultValue={project.release_date ?? ""}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
            Opis / notatki
            <textarea
              name="notes"
              defaultValue={project.notes ?? ""}
              rows={4}
              className={inputClass}
            />
          </label>

          <div className="sm:col-span-2 mt-2 border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold text-foreground/90">
              Linki do platform streamingowych
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STREAMING_PLATFORMS.map((p) => (
                <label
                  key={p.key}
                  className="flex flex-col gap-1 text-xs text-muted"
                >
                  {p.label}
                  <input
                    name={`link_${p.key}`}
                    defaultValue={project.links[p.key] ?? ""}
                    placeholder="https://…"
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2 mt-2">
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
              Zapisz projekt
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Kampania promo</h2>
          <Link
            href={`/projects/${project.id}?tab=kampania`}
            className="text-sm text-accent hover:underline"
          >
            {campaign ? "Otwórz zakładkę Kampania →" : "Uruchom Agenta Promo →"}
          </Link>
        </div>
        {campaign ? (
          <p className="mt-3 text-sm text-foreground/80">
            Aktywna kampania: <span className="font-medium">{campaign.name}</span>{" "}
            <span className="font-mono text-[11px] text-muted">
              ({campaign.status})
            </span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Brak jeszcze kampanii dla tego projektu — przejdź do zakładki
            „Kampania”, żeby ją wygenerować.
          </p>
        )}
      </section>
    </div>
  );
}

function TracklistSection({
  tracks,
  trackItems,
  projectId,
}: {
  tracks: Awaited<ReturnType<typeof getTracksForProject>>;
  trackItems: Awaited<ReturnType<typeof getTrackItemsForTracks>>;
  projectId: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-base font-semibold">Tracklista</h2>
        {tracks.length === 0 ? (
          <p className="mb-3 text-sm text-muted">Brak jeszcze utworów.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                items={trackItems.filter((i) => i.track_id === track.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-base font-semibold">Dodaj utwór</h2>
        <form
          action={createTrack}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="project_id" value={projectId} />
          <label className="flex flex-col gap-1 text-xs text-muted">
            Tytuł
            <input name="title" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Bit
            <input
              name="beat_name"
              placeholder="np. nazwa pliku"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
            Notatki
            <textarea name="notes" rows={2} className={inputClass} />
          </label>
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
              Dodaj do tracklisty
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProjectItemsSection({
  projectItems,
  projectId,
}: {
  projectItems: Awaited<ReturnType<typeof getProjectItems>>;
  projectId: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-1 text-base font-semibold">Etapy projektu</h2>
      <p className="mb-3 text-xs text-muted">
        Kontrola statusu poszczególnych etapów (jak w arkuszu) — np. okładka,
        mastering, dystrybucja. Status każdego etapu wpływa też na % ukończenia
        projektu.
      </p>
      {projectItems.length === 0 ? (
        <p className="mb-3 text-sm text-muted">Brak dodanych etapów.</p>
      ) : (
        <div className="mb-3 flex flex-col gap-2">
          {projectItems.map((item) => (
            <ProjectItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
      <form
        action={createProjectItem}
        className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
      >
        <input type="hidden" name="project_id" value={projectId} />
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[11px] text-muted">
          Nazwa
          <input
            name="label"
            required
            placeholder="np. Okładka"
            className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Kto
          <input
            name="assignee"
            placeholder="opcjonalnie"
            className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
          />
        </label>
        <button className="rounded-md border border-accent/60 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/10">
          + Dodaj etap
        </button>
      </form>
    </section>
  );
}
