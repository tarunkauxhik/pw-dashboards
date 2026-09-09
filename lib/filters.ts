import type {
  AppsFlyerRow,
  AttributionRow,
  OrderRow,
  SignupRow,
} from "@/types/sheet";
import type { DateRange } from "./dateRanges";

export function byDateRange<T extends { report_date_ist: string }>(
  rows: T[],
  range: DateRange,
): T[] {
  return rows.filter(
    (r) => r.report_date_ist >= range.from && r.report_date_ist <= range.to,
  );
}

export function byOrderDateRange(
  rows: OrderRow[],
  range: DateRange,
): OrderRow[] {
  return rows.filter(
    (o) => o.order_date_ist >= range.from && o.order_date_ist <= range.to,
  );
}

export function byAfDateRange(
  rows: AppsFlyerRow[],
  range: DateRange,
): AppsFlyerRow[] {
  return rows.filter(
    (r) => r.report_date >= range.from && r.report_date <= range.to,
  );
}

export function buildChannelByUser(
  attribution: AttributionRow[],
): Map<string, string> {
  return new Map(attribution.map((a) => [a.userid, a.media_source]));
}

export function signupsInRange(
  rows: SignupRow[],
  range: DateRange,
): SignupRow[] {
  return byDateRange(rows, range);
}
