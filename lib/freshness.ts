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

export function staleReason(snap: FreshnessInput): StaleReason {
  if (snap.fetchedAtIso.startsWith("1970-")) return "never-fetched";
  if (!snap.ok) return "fetch-failed";
  if (snap.data._meta.some((m) => m.status !== "OK")) return "data-source-not-ok";
  const ageMs = Date.now() - Date.parse(snap.fetchedAtIso);
  if (ageMs > STALE_TTL_MS) return "snapshot-too-old";
  return "fresh";
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

export function isAnchoredToYesterday(
  metaAsOf: string[] | undefined,
  todayIst: string,
): boolean {
  if (!metaAsOf || metaAsOf.length === 0) return false;
  const latest = metaAsOf[metaAsOf.length - 1];
  if (!latest) return false;
  return latest >= addDaysIst(todayIst, -1);
}
