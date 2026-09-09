import { NextResponse } from "next/server";
import { fetchSheetFresh, fetchSheetCached } from "@/lib/sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  const result = await fetchSheetFresh();
  return NextResponse.json(result);
}

export async function GET() {
  const result = await fetchSheetCached();
  return NextResponse.json({ triggered: true, ok: result.ok });
}
