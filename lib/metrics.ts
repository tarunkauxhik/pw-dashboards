import type {
  AppsFlyerRow,
  AttributionRow,
  OrderRow,
  PushRow,
  SignupRow,
} from "@/types/sheet";

const EXCLUDED_SOURCES = ["ADMIN", "PW_PLAN"];

export function filterRevenueOrders(
  orders: OrderRow[],
  includeAdminAndPwPlan = false,
): OrderRow[] {
  if (includeAdminAndPwPlan) return orders;
  return orders.filter((o) => !EXCLUDED_SOURCES.includes(o.source));
}

export function grossCollection(orders: OrderRow[]): number {
  return orders.reduce((sum, o) => sum + o.price, 0);
}

export function netCollection(orders: OrderRow[]): number {
  return grossCollection(orders) / 1.18;
}

export function paidUsers(orders: OrderRow[]): number {
  return new Set(orders.map((o) => o.userid)).size;
}

export function arpu(orders: OrderRow[]): number {
  const users = paidUsers(orders);
  return users === 0 ? 0 : grossCollection(orders) / users;
}

export function conversionRate(
  orders: OrderRow[],
  signups: SignupRow[],
  dateFrom: string,
  dateTo: string,
): number {
  const payers = paidUsers(orders);
  const signupTotal = signups
    .filter(
      (s) => s.report_date_ist >= dateFrom && s.report_date_ist <= dateTo,
    )
    .reduce((sum, s) => sum + s.signups, 0);
  return signupTotal === 0 ? 0 : payers / signupTotal;
}

export function discountGiven(orders: OrderRow[]): number {
  return orders.reduce((sum, o) => sum + o.coupon_discount, 0);
}

export function listValue(orders: OrderRow[]): number {
  return orders.reduce((sum, o) => sum + o.price + o.coupon_discount, 0);
}

export function revenueByPlatform(
  orders: OrderRow[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of orders) out[o.platform] = (out[o.platform] ?? 0) + o.price;
  return out;
}

export function revenueByCoupon(
  orders: OrderRow[],
): { code: string; orders: number; revenue: number; discount: number }[] {
  const map = new Map<
    string,
    { orders: number; revenue: number; discount: number }
  >();
  for (const o of orders) {
    const cur = map.get(o.coupon_code) ?? { orders: 0, revenue: 0, discount: 0 };
    cur.orders += 1;
    cur.revenue += o.price;
    cur.discount += o.coupon_discount;
    map.set(o.coupon_code, cur);
  }
  return [...map.entries()]
    .map(([code, v]) => ({ code, ...v }))
    .sort((a, b) => b.orders - a.orders);
}

/**
 * For each distinct price point, count distinct userids, total orders,
 * and sum revenue (already Net/Gross-projected by the caller).
 *
 * Buyers always count from raw price — toggling Net/Gross is a display
 * concern (revenue, avg per buyer), not a definition concern for who's
 * a customer at a given price. Pass raw rows to this function.
 */
export function revenueByPricePoint(
  orders: OrderRow[],
): {
  price: number;
  buyers: number;
  orders: number;
  revenue: number;
}[] {
  const map = new Map<
    number,
    { buyers: Set<string>; orders: number; revenue: number }
  >();
  for (const o of orders) {
    const cur =
      map.get(o.price) ?? { buyers: new Set(), orders: 0, revenue: 0 };
    cur.buyers.add(o.userid);
    cur.orders += 1;
    cur.revenue += o.price;
    map.set(o.price, cur);
  }
  return [...map.entries()]
    .map(([price, v]) => ({
      price,
      buyers: v.buyers.size,
      orders: v.orders,
      revenue: v.revenue,
    }))
    .sort((a, b) => a.price - b.price);
}

export function cac(orders: OrderRow[], afRows: AppsFlyerRow[]): number {
  const cost = afRows.reduce((sum, r) => sum + r.cost_inr, 0);
  const installs = afRows.reduce((sum, r) => sum + r.installs, 0);
  return installs === 0 ? 0 : cost / installs;
}

export function revenueByChannel(
  orders: OrderRow[],
  attribution: AttributionRow[],
): { channel: string; users: number; revenue: number }[] {
  const channelByUser = new Map(attribution.map((a) => [a.userid, a.media_source]));
  const map = new Map<string, { users: Set<string>; revenue: number }>();
  for (const o of orders) {
    const ch = channelByUser.get(o.userid) ?? "ATTRIBUTION_MISSING";
    const cur = map.get(ch) ?? { users: new Set(), revenue: 0 };
    cur.users.add(o.userid);
    cur.revenue += o.price;
    map.set(ch, cur);
  }
  return [...map.entries()]
    .map(([channel, v]) => ({
      channel,
      users: v.users.size,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ── Push metrics (Dashboard 3) ──────────────────────────────────────────
// Source rows come from mb_push_daily. Each row is one (campaign, day)
// with its four counts. The PRD guarantees one row per (date, campaign)
// pair is already aggregated by the upstream Metabase query, so no
// frontend dedup is needed.

export function totalSent(rows: PushRow[]): number {
  return rows.reduce((sum, r) => sum + r.sent, 0);
}

export function totalClicks(rows: PushRow[]): number {
  return rows.reduce((sum, r) => sum + r.unique_clicks, 0);
}

export function ctr(rows: PushRow[]): number {
  const sent = totalSent(rows);
  return sent === 0 ? 0 : totalClicks(rows) / sent;
}

/**
 * PRD rule 2: MoEngage counts conversions per campaign independently.
 * A user converting via two different campaigns in the same window can
 * be counted twice in this sum — that's a property of the source data,
 * not a bug in this frontend. There is no shared userid to de-dupe on.
 */
export function totalConvertedUsers(rows: PushRow[]): number {
  return rows.reduce((sum, r) => sum + r.converted_users, 0);
}

export function totalAttributedRevenue(rows: PushRow[]): number {
  return rows.reduce((sum, r) => sum + r.attributed_revenue, 0);
}

export function revenuePerConvertedUser(rows: PushRow[]): number {
  const users = totalConvertedUsers(rows);
  return users === 0 ? 0 : totalAttributedRevenue(rows) / users;
}

export type PushSortKey =
  | "attributed_revenue"
  | "converted_users"
  | "sent"
  | "unique_clicks"
  | "ctr";

/**
 * Aggregate push rows across the selected date range into one row per
 * campaign. Zero-send rows are dropped from the result (Rule 3) but
 * remain in raw totals (they contribute 0).
 */
export function topCampaigns(
  rows: PushRow[],
  sortBy: PushSortKey = "attributed_revenue",
  limit = 15,
): { campaign_name: string; sent: number; unique_clicks: number; converted_users: number; attributed_revenue: number; ctr: number }[] {
  const map = new Map<
    string,
    {
      campaign_name: string;
      sent: number;
      unique_clicks: number;
      converted_users: number;
      attributed_revenue: number;
    }
  >();
  for (const r of rows) {
    if (r.sent === 0) continue;
    const cur = map.get(r.campaign_name);
    if (cur) {
      cur.sent += r.sent;
      cur.unique_clicks += r.unique_clicks;
      cur.converted_users += r.converted_users;
      cur.attributed_revenue += r.attributed_revenue;
    } else {
      map.set(r.campaign_name, {
        campaign_name: r.campaign_name,
        sent: r.sent,
        unique_clicks: r.unique_clicks,
        converted_users: r.converted_users,
        attributed_revenue: r.attributed_revenue,
      });
    }
  }
  return [...map.values()]
    .map((r) => ({
      ...r,
      ctr: r.sent === 0 ? 0 : r.unique_clicks / r.sent,
    }))
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, limit);
}
