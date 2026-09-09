import type {
  AppsFlyerRow,
  AttributionRow,
  OrderRow,
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
