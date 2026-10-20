"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export async function createTrack(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  if (!project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(`/projects/${project_id}?tracks=missing`);

  const beat_by = String(formData.get("beat_by") ?? "") || null;
  const performers = String(formData.get("performers") ?? "") || null;
  const written_by = String(formData.get("written_by") ?? "") || null;
  const recorded_by = String(formData.get("recorded_by") ?? "") || null;
  const additional_musicians =
    String(formData.get("additional_musicians") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("tracks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id);

  await supabase.from("tracks").insert({
    project_id,
    position: (count ?? 0) + 1,
    title,
    beat_by,
    performers,
    written_by,
    recorded_by,
    additional_musicians,
    notes,
  });

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?tracks=added`);
}

export async function updateTrack(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!id || !project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "pomysł");
  const beat_by = String(formData.get("beat_by") ?? "") || null;
  const performers = String(formData.get("performers") ?? "") || null;
  const written_by = String(formData.get("written_by") ?? "") || null;
  const recorded_by = String(formData.get("recorded_by") ?? "") || null;
  const additional_musicians =
    String(formData.get("additional_musicians") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  const supabase = createAdminClient();
  await supabase
    .from("tracks")
    .update({
      title,
      status,
      beat_by,
      performers,
      written_by,
      recorded_by,
      additional_musicians,
      notes,
    })
    .eq("id", id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?tracks=saved`);
}

export async function deleteTrack(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!id || !project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const supabase = createAdminClient();
  await supabase.from("tracks").delete().eq("id", id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?tracks=deleted`);
}
