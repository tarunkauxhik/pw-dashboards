import type { MetaRow } from "@/types/sheet";

export type Period =
  | { kind: "last7" }
  | { kind: "last30" }
  | { kind: "thisMonth" }
  | { kind: "custom"; from: string; to: string };

export interface DateRange {
  from: string;
  to: string;
}

export function getAnchorDate(meta: MetaRow[]): string {
  const ok = meta.filter((m) => m.status === "OK");
  const pool = ok.length > 0 ? ok : meta;
  if (pool.length === 0) {
    throw new Error("No _meta rows provided");
  }
  const dates = pool
    .map((m) => m.data_as_of_ist.slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  return dates[dates.length - 1];
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toIsoDate(d);
}

function dayDiff(from: string, to: string): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

export function resolvePeriod(period: Period, anchor: string): DateRange {
  switch (period.kind) {
    case "last7":
      return { from: addDays(anchor, -6), to: anchor };
    case "last30":
      return { from: addDays(anchor, -29), to: anchor };
    case "thisMonth": {
      const [y, m] = anchor.split("-").map(Number);
      const first = `${y}-${String(m).padStart(2, "0")}-01`;
      return { from: first, to: anchor };
    }
    case "custom":
      return { from: period.from, to: period.to };
  }
}

export function priorPeriod(range: DateRange): DateRange {
  const days = dayDiff(range.from, range.to);
  const priorTo = addDays(range.from, -1);
  const priorFrom = addDays(priorTo, -days);
  return { from: priorFrom, to: priorTo };
}

export function isoWeekKey(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function dayKey(isoDate: string): string {
  return isoDate;
}

/**
 * Indian financial year label. FY 25-26 = Apr 2025 → Mar 2026.
 * Returns a `YYYY-YY` string (e.g. "FY 25-26"). Months Apr-Dec belong
 * to the next year's FY; Jan-Mar to the previous calendar year's FY.
 */
export function fyLabel(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  const fyStartYear = m >= 4 ? y : y - 1;
  const fyEndShort = String((fyStartYear + 1) % 100).padStart(2, "0");
  return `FY ${String(fyStartYear).slice(-2)}-${fyEndShort}`;
}

export function fyStartDate(fyStartYear: number): string {
  return `${fyStartYear}-04-01`;
}

export function fyEndDate(fyStartYear: number): string {
  return `${fyStartYear + 1}-03-31`;
}

export function fyRange(fyStartYear: number): DateRange {
  return { from: fyStartDate(fyStartYear), to: fyEndDate(fyStartYear) };
}

/**
 * Distinct FYs present in the orders. Returns an ascending list of
 * FY start years (4-digit integers) — e.g. [2024, 2025, 2026].
 */
export function distinctFYs<T extends { order_date_ist: string }>(
  rows: T[],
): number[] {
  const set = new Set<number>();
  for (const r of rows) {
    const [y, m] = r.order_date_ist.split("-").map(Number);
    if (Number.isNaN(y) || Number.isNaN(m)) continue;
    const fyStartYear = m >= 4 ? y : y - 1;
    set.add(fyStartYear);
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Distinct calendar months present in the orders. Returns a sorted
 * list of `YYYY-MM` strings (e.g. ["2025-08","2025-09","2026-01"]).
 */
export function distinctMonths<T extends { order_date_ist: string }>(
  rows: T[],
): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const key = r.order_date_ist.slice(0, 7);
    if (key.length === 7) set.add(key);
  }
  return [...set].sort();
}

export function addDaysIst(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
