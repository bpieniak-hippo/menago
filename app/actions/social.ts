"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { runSocialPlan } from "@/lib/agents/social";

export async function generateContentPlan(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) redirect("/calendar");

  if (!isAdminConfigured()) {
    redirect(`/calendar?project=${projectId}&social=no_db`);
  }

  let outcome: "ok" | "no_key" | "error" = "ok";
  try {
    const result = await runSocialPlan(projectId);
    outcome = result.ok ? "ok" : "no_key";
  } catch {
    outcome = "error";
  }

  revalidatePath("/calendar");
  redirect(`/calendar?project=${projectId}&social=${outcome}`);
}
