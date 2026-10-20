import { notFound } from "next/navigation";
import Header from "@/components/Header";
import TrackItem from "@/components/TrackItem";
import { getProjectById, getTracksForProject } from "@/lib/data";
import { updateProject } from "@/app/actions/projects";
import { createTrack } from "@/app/actions/tracks";

const PROJECT_MESSAGES: Record<string, string> = {
  saved: "Zapisano zmiany projektu.",
};

const TRACKS_MESSAGES: Record<string, string> = {
  added: "Dodano utwór do tracklisty.",
  saved: "Zapisano zmiany utworu.",
  deleted: "Usunięto utwór.",
  missing: "Podaj tytuł utworu.",
};

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ project?: string; tracks?: string }>;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const project = await getProjectById(id);
  if (!project) notFound();

  const tracks = await getTracksForProject(id);

  const banner =
    (sp.project && PROJECT_MESSAGES[sp.project]) ||
    (sp.tracks && TRACKS_MESSAGES[sp.tracks]);

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
          <h2 className="mb-3 text-base font-semibold">Projekt</h2>
          <form
            action={updateProject}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={project.id} />
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
            <label className="flex flex-col gap-1 text-xs text-muted">
              Postęp (%)
              <input
                type="number"
                name="progress"
                min={0}
                max={100}
                defaultValue={project.progress}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
              Notatki
              <textarea
                name="notes"
                defaultValue={project.notes ?? ""}
                rows={3}
                className={inputClass}
              />
            </label>
            <div className="sm:col-span-2">
              <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
                Zapisz projekt
              </button>
            </div>
          </form>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Tracklista</h2>
          {tracks.length === 0 ? (
            <p className="mb-3 text-sm text-muted">Brak jeszcze utworów.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {tracks.map((track) => (
                <TrackItem key={track.id} track={track} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-semibold">Dodaj utwór</h2>
          <form action={createTrack} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="project_id" value={project.id} />
            <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
              Tytuł
              <input name="title" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Bit (producent)
              <input name="beat_by" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Kto rapuje / śpiewa
              <input name="performers" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Kto napisał tekst
              <input name="written_by" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Kto nagrywał
              <input name="recorded_by" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
              DJ / inny muzyk
              <input name="additional_musicians" className={inputClass} />
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
      </main>
    </>
  );
}
