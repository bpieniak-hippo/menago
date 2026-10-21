import { createAdminClient, isAdminConfigured } from "./supabase/admin";

/**
 * Wylicza % ukończenia projektu na podstawie wszystkich elementów checklisty
 * (track_items wszystkich utworów projektu + project_items projektu) i
 * zapisuje wynik w projects.progress.
 *
 * Wzór: zrobione / (zrobione + do_zrobienia) — pozycje "nie_dotyczy" są
 * pomijane, dzięki czemu dodanie np. "Okładka" albo "Mastering" od razu
 * wpływa na procent, a brak gościa/DJ-a (oznaczony jako nie dotyczy) nie
 * zaniża wyniku.
 */
export async function recalcProjectProgress(projectId: string): Promise<void> {
  if (!isAdminConfigured() || !projectId) return;
  const supabase = createAdminClient();

  const { data: tracks } = await supabase
    .from("tracks")
    .select("id")
    .eq("project_id", projectId);
  const trackIds = (tracks ?? []).map((t) => t.id as string);

  let trackItemStatuses: string[] = [];
  if (trackIds.length > 0) {
    const { data } = await supabase
      .from("track_items")
      .select("status")
      .in("track_id", trackIds);
    trackItemStatuses = (data ?? []).map((i) => i.status as string);
  }

  const { data: projectItems } = await supabase
    .from("project_items")
    .select("status")
    .eq("project_id", projectId);
  const projectItemStatuses = (projectItems ?? []).map((i) => i.status as string);

  const all = [...trackItemStatuses, ...projectItemStatuses];
  const applicable = all.filter((s) => s !== "nie_dotyczy");
  const done = applicable.filter((s) => s === "zrobione");
  const progress =
    applicable.length > 0 ? Math.round((done.length / applicable.length) * 100) : 0;

  await supabase.from("projects").update({ progress }).eq("id", projectId);
}
