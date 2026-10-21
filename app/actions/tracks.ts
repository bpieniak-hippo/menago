"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { recalcProjectProgress } from "@/lib/progress";

export async function createTrack(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  if (!project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(`/projects/${project_id}?tracks=missing`);

  const beat_name = String(formData.get("beat_name") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("tracks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id);

  const { error } = await supabase.from("tracks").insert({
    project_id,
    position: (count ?? 0) + 1,
    title,
    beat_name,
    notes,
  });

  if (error) {
    console.error("createTrack insert error:", error);
    redirect(`/projects/${project_id}?tracks=error`);
  }

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?tracks=added`);
}

export async function updateTrack(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!id || !project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const title = String(formData.get("title") ?? "").trim();
  const beat_name = String(formData.get("beat_name") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  const supabase = createAdminClient();
  await supabase.from("tracks").update({ title, beat_name, notes }).eq("id", id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?tracks=saved`);
}

export async function deleteTrack(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!id || !project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const supabase = createAdminClient();
  await supabase.from("tracks").delete().eq("id", id);

  await recalcProjectProgress(project_id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?tracks=deleted`);
}
