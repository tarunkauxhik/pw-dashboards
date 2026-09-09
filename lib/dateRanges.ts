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
