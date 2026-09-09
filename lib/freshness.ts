import type { MetaRow } from "@/types/sheet";

export interface FreshnessInput {
  ok: boolean;
  fetchedAtIso: string;
  data: { _meta: MetaRow[] };
}

export type StaleReason =
  | "never-fetched"
  | "fetch-failed"
  | "data-source-not-ok"
  | "snapshot-too-old"
  | "fresh";

const STALE_TTL_MS = 6 * 60 * 60 * 1000;

function todayIstIso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function addDaysIst(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export interface Freshness {
  sourceFailed: boolean;
  failedSources: MetaRow[];
  isBehindSchedule: boolean;
  anchorDate: string | null;
  expectedThrough: string;
  staleReason: StaleReason;
}

export function computeFreshness(
  snap: FreshnessInput,
  nowMs: number = Date.now(),
  todayIst: string = todayIstIso(),
): Freshness {
  const failedSources = snap.data._meta.filter((m) => m.status !== "OK");
  const sourceFailed = failedSources.length > 0;

  const metaAsOf = [...new Set(snap.data._meta.map((m) => m.data_as_of_ist.slice(0, 10)))]
    .sort();
  const anchorDate = metaAsOf[metaAsOf.length - 1] ?? null;
  const expectedThrough = addDaysIst(todayIst, -1);
  const isBehindSchedule = !!anchorDate && anchorDate < expectedThrough;

  let staleReason: StaleReason;
  if (snap.fetchedAtIso.startsWith("1970-")) staleReason = "never-fetched";
  else if (!snap.ok) staleReason = "fetch-failed";
  else if (sourceFailed) staleReason = "data-source-not-ok";
  else if (nowMs - Date.parse(snap.fetchedAtIso) > STALE_TTL_MS)
    staleReason = "snapshot-too-old";
  else staleReason = "fresh";

  return { sourceFailed, failedSources, isBehindSchedule, anchorDate, expectedThrough, staleReason };
}

export function todayIst(now: Date = new Date()): string {
  return todayIstIso(now);
}

// Back-compat for any caller that only wanted a single reason.
export function staleReason(snap: FreshnessInput): StaleReason {
  return computeFreshness(snap).staleReason;
}
