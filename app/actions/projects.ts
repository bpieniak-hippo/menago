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

const STREAMING_PLATFORMS = [
  "spotify",
  "apple_music",
  "youtube_music",
  "tidal",
  "soundcloud",
] as const;

export async function updateProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id || !isAdminConfigured()) redirect("/projects");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim();
  const release_date = String(formData.get("release_date") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  const links: Record<string, string> = {};
  for (const platform of STREAMING_PLATFORMS) {
    const value = String(formData.get(`link_${platform}`) ?? "").trim();
    if (value) links[platform] = value;
  }

  const tab = String(formData.get("tab") ?? "") || null;

  const supabase = createAdminClient();
  await supabase
    .from("projects")
    .update({ name, type, stage, release_date, notes, links })
    .eq("id", id);

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/projects/${id}?project=saved${tab ? `&tab=${tab}` : ""}`);
}
