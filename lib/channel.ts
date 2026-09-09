import type { AttributionRow } from "@/types/sheet";

export const ATTRIBUTION_MISSING = "ATTRIBUTION_MISSING";

export function channelCoverage(
  ordersPayerIds: string[],
  attribution: AttributionRow[],
): { covered: number; total: number; pct: number } {
  const attributed = new Set(attribution.map((a) => a.userid));
  const total = new Set(ordersPayerIds).size;
  let covered = 0;
  for (const id of ordersPayerIds) if (attributed.has(id)) covered += 1;
  return { covered, total, pct: total === 0 ? 0 : covered / total };
}
