import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { runWeeklyReport } from "@/lib/agents/analityk";

export const dynamic = "force-dynamic";

/** Raport tygodniowy Agenta Analityka — poniedziałek 9:00 (spec §3.6). */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const result = await runWeeklyReport();
  return NextResponse.json(result);
}
