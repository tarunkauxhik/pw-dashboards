import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { MetaRow, SheetData } from "@/types/sheet";
import type { StaleReason, FreshnessInput } from "./freshness";

export type { StaleReason } from "./freshness";

const FETCH_TIMEOUT_MS = 8_000;
const SNAPSHOT_PATH = path.join(
  process.cwd(),
  ".next",
  "cache",
  "sheet-snapshot.json",
);
const FILE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CachedSheet extends FreshnessInput {
  ok: boolean;
  errorMessage?: string;
  fetchedAtIso: string;
  fetchDurationMs: number;
  data: SheetData;
  metaAsOf?: string[];
}

function emptyCachedSheet(ok: boolean, errorMessage?: string): CachedSheet {
  return {
    ok,
    errorMessage,
    fetchedAtIso: new Date(0).toISOString(),
    fetchDurationMs: 0,
    data: {
      mb_orders: [],
      mb_signups_daily: [],
      mb_buy_type: [],
      mb_paid_user_attribution: [],
      mb_push_daily: [],
      af_daily: [],
      _meta: [],
    },
    metaAsOf: [],
  };
}

async function readSnapshot(): Promise<CachedSheet | null> {
  try {
    const buf = await fs.readFile(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(buf) as CachedSheet;
    const age = Date.now() - Date.parse(parsed.fetchedAtIso);
    if (Number.isNaN(age) || age > FILE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeSnapshot(s: CachedSheet): Promise<void> {
  await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(s), "utf8");
}

export async function getCachedSheet(): Promise<CachedSheet> {
  return (await readSnapshot()) ?? emptyCachedSheet(false, "no snapshot yet");
}

function metaAsOfList(meta: MetaRow[]): string[] {
  return [...new Set(meta.map((m) => m.data_as_of_ist.slice(0, 10)))].sort();
}

async function fetchSheetOnce(): Promise<{
  ok: true;
  data: SheetData;
  durationMs: number;
} | { ok: false; errorMessage: string; durationMs: number }> {
  const url = `${process.env.SHEET_API_URL}?token=${process.env.SHEET_API_TOKEN}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        errorMessage: `Sheet API returned ${res.status}`,
        durationMs: Date.now() - t0,
      };
    }
    const data = (await res.json()) as { error?: string } & Partial<SheetData>;
    if (data.error) {
      return {
        ok: false,
        errorMessage: `Sheet API: ${data.error}`,
        durationMs: Date.now() - t0,
      };
    }
    if (!data._meta || !Array.isArray(data._meta) || !Array.isArray(data.mb_orders)) {
      return {
        ok: false,
        errorMessage: "response shape invalid",
        durationMs: Date.now() - t0,
      };
    }
    return {
      ok: true,
      data: data as SheetData,
      durationMs: Date.now() - t0,
    };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? `timed out after ${FETCH_TIMEOUT_MS / 1000}s`
          : err.message
        : "unknown error";
    return { ok: false, errorMessage: msg, durationMs: Date.now() - t0 };
  } finally {
    clearTimeout(timeoutId);
  }
}

function okSnapshot(data: SheetData, durationMs: number): CachedSheet {
  return {
    ok: true,
    fetchedAtIso: new Date().toISOString(),
    fetchDurationMs: durationMs,
    data,
    metaAsOf: metaAsOfList(data._meta),
  };
}

export async function refreshSheetNow(): Promise<CachedSheet> {
  const result = await fetchSheetOnce();
  const now = new Date().toISOString();
  if (result.ok) {
    const snap = okSnapshot(result.data, result.durationMs);
    await writeSnapshot(snap);
    return snap;
  }
  const prev = await readSnapshot();
  if (prev?.ok) {
    const degraded: CachedSheet = {
      ...prev,
      errorMessage: result.errorMessage,
    };
    await writeSnapshot(degraded);
    return degraded;
  }
  const failed: CachedSheet = {
    ...emptyCachedSheet(false, result.errorMessage),
    fetchedAtIso: now,
    fetchDurationMs: result.durationMs,
  };
  await writeSnapshot(failed);
  return failed;
}

export async function refreshSheetInBackground(): Promise<void> {
  const result = await fetchSheetOnce();
  if (result.ok) {
    await writeSnapshot(okSnapshot(result.data, result.durationMs));
    return;
  }
  const prev = await readSnapshot();
  if (prev?.ok) {
    await writeSnapshot({ ...prev, errorMessage: result.errorMessage });
  } else {
    await writeSnapshot({
      ...emptyCachedSheet(false, result.errorMessage),
      fetchedAtIso: new Date().toISOString(),
      fetchDurationMs: result.durationMs,
    });
  }
  console.warn(`[sheet] refresh failed: ${result.errorMessage}`);
}

export { staleReason, isAnchoredToYesterday } from "./freshness";
