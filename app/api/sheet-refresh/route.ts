import { NextResponse } from "next/server";
import { refreshSheetNow, refreshSheetInBackground } from "@/lib/sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const snap = await refreshSheetNow();
  return NextResponse.json({
    ok: snap.ok,
    fetchedAtIso: snap.fetchedAtIso,
    fetchDurationMs: snap.fetchDurationMs,
    errorMessage: snap.errorMessage ?? null,
  });
}

export async function GET() {
  await refreshSheetInBackground();
  return NextResponse.json({ triggered: true });
}
