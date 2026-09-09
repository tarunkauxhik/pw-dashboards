import "server-only";
import type { SheetData } from "@/types/sheet";

export type { StaleReason } from "./freshness";

const FETCH_TIMEOUT_MS = 15_000;

function sheetUrl(): string {
  return `${process.env.SHEET_API_URL}?token=${process.env.SHEET_API_TOKEN}`;
}

function isValidSheet(data: unknown): data is SheetData {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<SheetData>;
  return (
    Array.isArray(d._meta) &&
    Array.isArray(d.mb_orders) &&
    Array.isArray(d.mb_signups_daily) &&
    Array.isArray(d.mb_buy_type) &&
    Array.isArray(d.mb_paid_user_attribution) &&
    Array.isArray(d.mb_push_daily) &&
    Array.isArray(d.af_daily) &&
    Array.isArray(d.mb_pwlive_orders) &&
    Array.isArray(d.mb_pwlive_funnel) &&
    Array.isArray(d.mb_pwlive_qa)
  );
}

export interface SheetFetchResult {
  ok: boolean;
  data: SheetData | null;
  errorMessage: string | null;
  fetchDurationMs: number;
  fetchedAtIso: string;
}

async function fetchOnce(
  init: RequestInit & { next?: { revalidate: number | false } },
): Promise<SheetFetchResult> {
  const url = sheetUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      return {
        ok: false,
        data: null,
        errorMessage: `Sheet API returned ${res.status}`,
        fetchDurationMs: Date.now() - t0,
        fetchedAtIso: new Date().toISOString(),
      };
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch (err) {
      return {
        ok: false,
        data: null,
        errorMessage:
          err instanceof Error ? `invalid JSON: ${err.message}` : "invalid JSON",
        fetchDurationMs: Date.now() - t0,
        fetchedAtIso: new Date().toISOString(),
      };
    }
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
    ) {
      return {
        ok: false,
        data: null,
        errorMessage: `Sheet API: ${(body as { error: string }).error}`,
        fetchDurationMs: Date.now() - t0,
        fetchedAtIso: new Date().toISOString(),
      };
    }
    if (!isValidSheet(body)) {
      return {
        ok: false,
        data: null,
        errorMessage: "response shape invalid",
        fetchDurationMs: Date.now() - t0,
        fetchedAtIso: new Date().toISOString(),
      };
    }
    return {
      ok: true,
      data: body,
      errorMessage: null,
      fetchDurationMs: Date.now() - t0,
      fetchedAtIso: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Page loads + background revalidation: Next.js in-memory data cache only.
export async function fetchSheetCached(): Promise<SheetFetchResult> {
  return fetchOnce({ next: { revalidate: 600 } });
}

// Manual refresh button: always hits the network.
export async function fetchSheetFresh(): Promise<SheetFetchResult> {
  return fetchOnce({ cache: "no-store" });
}
