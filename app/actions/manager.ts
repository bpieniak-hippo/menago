"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { runManagerAdvice, runManagerCommand } from "@/lib/agents/manager";

export async function handleManagerCommand(formData: FormData) {
  const command = String(formData.get("command") ?? "").trim();

  if (!command) {
    redirect("/");
  }

  if (!isAdminConfigured()) {
    redirect("/?manager=no_db");
  }

  let outcome: "ok" | "no_key" | "error";
  try {
    const result = await runManagerCommand(command);
    outcome = result.ok ? "ok" : "no_key";
  } catch {
    outcome = "error";
  }

  revalidatePath("/");
  redirect(`/?manager=${outcome}`);
}

export async function requestManagerAdvice() {
  if (!isAdminConfigured()) {
    redirect("/?manager=no_db");
  }

  let outcome: "advice_ok" | "no_key" | "error";
  try {
    const result = await runManagerAdvice();
    outcome = result.ok ? "advice_ok" : "no_key";
  } catch {
    outcome = "error";
  }

  revalidatePath("/");
  redirect(`/?manager=${outcome}`);
}
