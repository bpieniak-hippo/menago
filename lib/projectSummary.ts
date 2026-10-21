import type { Project, ProjectItem, Track, TrackItem } from "./types";

export interface ProjectAction {
  id: string;
  label: string;
  status: "zrobione" | "do_zrobienia" | "nie_dotyczy";
  trackTitle: string | null;
}

export interface ProjectSummary {
  project: Project;
  tracks: Track[];
  tracksById: Map<string, Track>;
  actions: ProjectAction[];
  todo: ProjectAction[];
  done: ProjectAction[];
  isReleased: boolean;
}

/** Czy etap projektu oznacza, że został już wydany (widok "ukończony"). */
export function isProjectReleased(project: Project): boolean {
  return project.stage === "wydany";
}

/**
 * Buduje listę konkretnych akcji (z tracklisty + elementów projektu) dla
 * jednego projektu — używane do podglądu na liście projektów i w widoku
 * szczegółów.
 */
export function buildProjectSummary(
  project: Project,
  allTracks: Track[],
  allTrackItems: TrackItem[],
  allProjectItems: ProjectItem[],
): ProjectSummary {
  const tracks = allTracks
    .filter((t) => t.project_id === project.id)
    .sort((a, b) => a.position - b.position);
  const tracksById = new Map(tracks.map((t) => [t.id, t]));
  const trackIds = new Set(tracks.map((t) => t.id));

  const trackActions: ProjectAction[] = allTrackItems
    .filter((i) => trackIds.has(i.track_id))
    .map((i) => ({
      id: i.id,
      label: i.label,
      status: i.status,
      trackTitle: tracksById.get(i.track_id)?.title ?? null,
    }));

  const projectActions: ProjectAction[] = allProjectItems
    .filter((i) => i.project_id === project.id)
    .map((i) => ({
      id: i.id,
      label: i.label,
      status: i.status,
      trackTitle: null,
    }));

  const actions = [...trackActions, ...projectActions];

  return {
    project,
    tracks,
    tracksById,
    actions,
    todo: actions.filter((a) => a.status === "do_zrobienia"),
    done: actions.filter((a) => a.status === "zrobione"),
    isReleased: isProjectReleased(project),
  };
}

const TYPE_GROUPS: { key: string; label: string; match: (type: string) => boolean }[] = [
  { key: "album", label: "Albumy", match: (t) => t.toLowerCase() === "album" },
  { key: "ep", label: "EP-ki", match: (t) => t.toLowerCase() === "ep" },
  { key: "singiel", label: "Single", match: (t) => t.toLowerCase() === "singiel" },
];

export interface ProjectTypeGroup {
  key: string;
  label: string;
  inProgress: Project[];
  released: Project[];
}

/** Grupuje projekty wg typu (album/EP/singiel/inne), a w środku wg statusu. */
export function groupProjectsByType(projects: Project[]): ProjectTypeGroup[] {
  const groups: ProjectTypeGroup[] = TYPE_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    inProgress: [],
    released: [],
  }));
  const other: ProjectTypeGroup = {
    key: "inne",
    label: "Inne",
    inProgress: [],
    released: [],
  };

  for (const project of projects) {
    const groupDef = TYPE_GROUPS.find((g) => g.match(project.type));
    const group = groupDef
      ? groups.find((g) => g.key === groupDef.key)!
      : other;
    if (isProjectReleased(project)) {
      group.released.push(project);
    } else {
      group.inProgress.push(project);
    }
  }

  return [...groups, other].filter(
    (g) => g.inProgress.length > 0 || g.released.length > 0,
  );
}
