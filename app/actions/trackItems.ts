"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { recalcProjectProgress } from "@/lib/progress";

export async function createTrackItem(formData: FormData) {
  const track_id = String(formData.get("track_id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!track_id || !project_id || !isAdminConfigured())
    redirect(`/projects/${project_id}`);

  const label = String(formData.get("label") ?? "").trim();
  if (!label) redirect(`/projects/${project_id}?tracks=missing_item`);

  const category = String(formData.get("category") ?? "inne");
  const assignee = String(formData.get("assignee") ?? "") || null;

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("track_items")
    .select("id", { count: "exact", head: true })
    .eq("track_id", track_id);

  await supabase.from("track_items").insert({
    track_id,
    category,
    label,
    assignee,
    position: (count ?? 0) + 1,
  });

  await recalcProjectProgress(project_id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?tracks=item_added`);
}

export async function updateTrackItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!id || !project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const category = String(formData.get("category") ?? "inne");
  const label = String(formData.get("label") ?? "").trim();
  const assignee = String(formData.get("assignee") ?? "") || null;
  const status = String(formData.get("status") ?? "do_zrobienia");
  const note = String(formData.get("note") ?? "") || null;

  const supabase = createAdminClient();
  await supabase
    .from("track_items")
    .update({ category, label, assignee, status, note })
    .eq("id", id);

  await recalcProjectProgress(project_id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?tracks=item_saved`);
}

export async function deleteTrackItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!id || !project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const supabase = createAdminClient();
  await supabase.from("track_items").delete().eq("id", id);

  await recalcProjectProgress(project_id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?tracks=item_deleted`);
}
