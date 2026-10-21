import Header from "@/components/Header";
import ProjectListEntry from "@/components/ProjectListEntry";
import {
  getAllProjectItems,
  getAllTracks,
  getProjects,
  getTrackItemsForTracks,
} from "@/lib/data";
import { createProject } from "@/app/actions/projects";
import { buildProjectSummary, groupProjectsByType } from "@/lib/projectSummary";

const PROJECTS_MESSAGES: Record<string, string> = {
  no_db: "Tworzenie projektów wymaga skonfigurowanego Supabase (service role).",
  missing: "Uzupełnij nazwę, typ i etap projektu.",
  error: "Wystąpił błąd podczas tworzenia projektu.",
};

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

interface ProjectsPageProps {
  searchParams: Promise<{ projects?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const projects = await getProjects();
  const allTracks = await getAllTracks();
  const allTrackItems = await getTrackItemsForTracks(allTracks.map((t) => t.id));
  const allProjectItems = await getAllProjectItems();
  const groups = groupProjectsByType(projects);
  const banner = params.projects && PROJECTS_MESSAGES[params.projects];

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        {banner && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
            {banner}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="flex flex-col gap-6">
            {projects.length === 0 ? (
              <p className="text-sm text-muted">Brak projektów.</p>
            ) : (
              groups.map((group) => (
                <div key={group.key}>
                  <h2 className="mb-3 text-base font-semibold">{group.label}</h2>
                  {group.inProgress.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                        W trakcie
                      </p>
                      <div className="flex flex-col gap-3">
                        {group.inProgress.map((project) => (
                          <ProjectListEntry
                            key={project.id}
                            summary={buildProjectSummary(
                              project,
                              allTracks,
                              allTrackItems,
                              allProjectItems,
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {group.released.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                        Wydane
                      </p>
                      <div className="flex flex-col gap-3">
                        {group.released.map((project) => (
                          <ProjectListEntry
                            key={project.id}
                            summary={buildProjectSummary(
                              project,
                              allTracks,
                              allTrackItems,
                              allProjectItems,
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>

          <section className="h-fit rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-base font-semibold">Nowy projekt</h2>
            <form action={createProject} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Nazwa
                <input name="name" required className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Typ
                <input
                  name="type"
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
                <input type="date" name="release_date" className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Notatki
                <textarea name="notes" rows={3} className={inputClass} />
              </label>
              <button className="mt-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
                Utwórz projekt
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
