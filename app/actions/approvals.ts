"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { decideApproval } from "@/lib/approvals";

async function handle(formData: FormData, decision: "approved" | "rejected") {
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "") || "/";
  if (!id) redirect(returnTo);

  if (!isAdminConfigured()) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}approvals=no_db`);
  }

  const result = await decideApproval(id, decision);
  revalidatePath("/");
  revalidatePath("/promo");
  revalidatePath(returnTo.split("?")[0]);
  redirect(
    `${returnTo}${returnTo.includes("?") ? "&" : "?"}approvals=${result.ok ? decision : "error"}`,
  );
}

export async function approveApproval(formData: FormData) {
  await handle(formData, "approved");
}

export async function rejectApproval(formData: FormData) {
  await handle(formData, "rejected");
}
