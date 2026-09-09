import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { SheetData } from "@/types/sheet";

const FETCH_TIMEOUT_MS = 30_000;
const SNAPSHOT_PATH = path.join(process.cwd(), ".next", "cache", "sheet-snapshot.json");

export interface CachedSheet {
  data: SheetData;
  fetchedAtIso: string;
  fetchDurationMs: number;
  ok: boolean;
  errorMessage?: string;
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
  };
}

async function readSnapshot(): Promise<CachedSheet | null> {
  try {
    const buf = await fs.readFile(SNAPSHOT_PATH, "utf8");
    return JSON.parse(buf) as CachedSheet;
  } catch {
    return null;
  }
}

async function writeSnapshot(s: CachedSheet): Promise<void> {
  await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(s), "utf8");
}

export async function getCachedSheet(): Promise<CachedSheet> {
  const onDisk = await readSnapshot();
  if (onDisk) return onDisk;
  return { ...emptyCachedSheet(false), errorMessage: "no snapshot yet" };
}

export async function refreshSheetInBackground(): Promise<void> {
  const url = `${process.env.SHEET_API_URL}?token=${process.env.SHEET_API_TOKEN}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      next: { revalidate: 600 },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Sheet API returned ${res.status}`);
    const data = (await res.json()) as { error?: string } & Partial<SheetData>;
    if (data.error) throw new Error(`Sheet API: ${data.error}`);
    if (!data._meta || !data.mb_orders) throw new Error("response shape invalid");
    await writeSnapshot({
      ok: true,
      fetchedAtIso: new Date().toISOString(),
      fetchDurationMs: Date.now() - t0,
      data: data as SheetData,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `timed out after ${FETCH_TIMEOUT_MS / 1000}s`
          : err.message
        : "unknown error";
    const prev = (await readSnapshot()) ?? emptyCachedSheet(false);
    if (prev.ok) {
      await writeSnapshot({ ...prev, ok: false, errorMessage: message });
    }
    console.warn(`[sheet] refresh failed: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function refreshSheetNow(): Promise<CachedSheet> {
  const url = `${process.env.SHEET_API_URL}?token=${process.env.SHEET_API_TOKEN}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      next: { revalidate: 600 },
      signal: controller.signal,
    });
    if (!res.ok) {
      const msg = `Sheet API returned ${res.status}`;
      const result = { ...emptyCachedSheet(false, msg) };
      await writeSnapshot(result);
      return result;
    }
    const data = (await res.json()) as { error?: string } & Partial<SheetData>;
    if (data.error) {
      const msg = `Sheet API: ${data.error}`;
      const result = { ...emptyCachedSheet(false, msg) };
      await writeSnapshot(result);
      return result;
    }
    if (!data._meta || !data.mb_orders) {
      const result = { ...emptyCachedSheet(false, "response shape invalid") };
      await writeSnapshot(result);
      return result;
    }
    const snap: CachedSheet = {
      ok: true,
      fetchedAtIso: new Date().toISOString(),
      fetchDurationMs: Date.now() - t0,
      data: data as SheetData,
    };
    await writeSnapshot(snap);
    return snap;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `timed out after ${FETCH_TIMEOUT_MS / 1000}s`
          : err.message
        : "unknown error";
    const result = { ...emptyCachedSheet(false, message) };
    await writeSnapshot(result);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}
