"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export async function createProject(formData: FormData) {
  if (!isAdminConfigured()) redirect("/projects?projects=no_db");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim();
  const release_date = String(formData.get("release_date") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  if (!name || !type || !stage) redirect("/projects?projects=missing");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, type, stage, release_date, notes, progress: 0 })
    .select("id")
    .single();

  if (error || !data) redirect("/projects?projects=error");

  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id || !isAdminConfigured()) redirect("/projects");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim();
  const release_date = String(formData.get("release_date") ?? "") || null;
  const progress = Number(formData.get("progress") ?? 0);
  const notes = String(formData.get("notes") ?? "") || null;

  const supabase = createAdminClient();
  await supabase
    .from("projects")
    .update({
      name,
      type,
      stage,
      release_date,
      progress: Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0,
      notes,
    })
    .eq("id", id);

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/projects/${id}?project=saved`);
}
