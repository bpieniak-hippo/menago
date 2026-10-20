import { NextResponse } from "next/server";
import { runDailyBrief } from "@/lib/agents/manager";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDailyBrief();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
