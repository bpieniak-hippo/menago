"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { recalcProjectProgress } from "@/lib/progress";

export async function createProjectItem(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  if (!project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const label = String(formData.get("label") ?? "").trim();
  if (!label) redirect(`/projects/${project_id}?project_items=missing`);

  const assignee = String(formData.get("assignee") ?? "") || null;

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("project_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id);

  await supabase.from("project_items").insert({
    project_id,
    label,
    assignee,
    position: (count ?? 0) + 1,
  });

  await recalcProjectProgress(project_id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?project_items=added`);
}

export async function updateProjectItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!id || !project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const label = String(formData.get("label") ?? "").trim();
  const assignee = String(formData.get("assignee") ?? "") || null;
  const status = String(formData.get("status") ?? "do_zrobienia");
  const note = String(formData.get("note") ?? "") || null;

  const supabase = createAdminClient();
  await supabase
    .from("project_items")
    .update({ label, assignee, status, note })
    .eq("id", id);

  await recalcProjectProgress(project_id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?project_items=saved`);
}

export async function deleteProjectItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!id || !project_id || !isAdminConfigured()) redirect(`/projects/${project_id}`);

  const supabase = createAdminClient();
  await supabase.from("project_items").delete().eq("id", id);

  await recalcProjectProgress(project_id);

  revalidatePath(`/projects/${project_id}`);
  redirect(`/projects/${project_id}?project_items=deleted`);
}
