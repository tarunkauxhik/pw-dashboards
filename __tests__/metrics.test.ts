import { describe, it, expect } from "vitest";
import type {
  AppsFlyerRow,
  AttributionRow,
  OrderRow,
  PushRow,
  SignupRow,
} from "@/types/sheet";
import {
  arpu,
  cac,
  conversionRate,
  discountGiven,
  filterRevenueOrders,
  grossCollection,
  listValue,
  netCollection,
  paidUsers,
  revenueByChannel,
  revenueByCoupon,
  revenueByPlatform,
  revenueByPricePoint,
  totalAttributedRevenue,
  totalClicks,
  totalConvertedUsers,
  totalSent,
  ctr,
  revenuePerConvertedUser,
  topCampaigns,
} from "@/lib/metrics";

function o(partial: Partial<OrderRow>): OrderRow {
  return {
    order_date_ist: "2026-09-08",
    userid: "u",
    price: 100,
    source: "PAYMENT",
    plantype: "DIRECT",
    platform: "ANDROID",
    coupon_code: "NO_COUPON",
    coupon_discount: 0,
    gateway: "PAYU",
    payment_method: "UPI",
    ...partial,
  };
}

function p(partial: Partial<PushRow>): PushRow {
  return {
    report_date: "2026-09-08",
    campaign_name: "Push-fest-D1",
    sent: 100,
    unique_clicks: 5,
    converted_users: 1,
    attributed_revenue: 749,
    ...partial,
  };
}

describe("paidUsers", () => {
  it("counts unique users, not rows", () => {
    const orders = [
      o({ userid: "a", price: 749, source: "PAYMENT" }),
      o({ userid: "a", price: 749, source: "PAYMENT" }),
      o({ userid: "b", price: 699, source: "PAYMENT" }),
    ];
    expect(paidUsers(orders)).toBe(2);
  });
});

describe("filterRevenueOrders", () => {
  it("excludes ADMIN and PW_PLAN by default", () => {
    const orders = [
      o({ source: "PAYMENT", price: 100 }),
      o({ source: "ADMIN", price: 4999 }),
      o({ source: "PW_PLAN", price: 500 }),
    ];
    expect(filterRevenueOrders(orders)).toHaveLength(1);
  });

  it("includes everything when explicitly enabled", () => {
    const orders = [
      o({ source: "PAYMENT", price: 100 }),
      o({ source: "ADMIN", price: 4999 }),
      o({ source: "PW_PLAN", price: 500 }),
    ];
    expect(filterRevenueOrders(orders, true)).toHaveLength(3);
  });

  it("keeps BLANK source — it is real money", () => {
    const orders = [o({ source: "BLANK", price: 149 })];
    expect(filterRevenueOrders(orders)).toHaveLength(1);
  });
});

describe("netCollection", () => {
  it("divides gross by 1.18", () => {
    const orders = [o({ price: 1180, source: "PAYMENT" })];
    expect(netCollection(orders)).toBeCloseTo(1000, 2);
  });

  it("netCollection equals grossCollection / 1.18 exactly", () => {
    const orders = [
      o({ price: 100 }),
      o({ price: 250 }),
      o({ price: 80 }),
    ];
    expect(netCollection(orders)).toBe(grossCollection(orders) / 1.18);
  });
});

describe("revenueByChannel", () => {
  it("buckets unattributed users under ATTRIBUTION_MISSING, not Organic", () => {
    const orders = [o({ userid: "x", price: 749, source: "PAYMENT" })];
    const attribution: AttributionRow[] = [];
    const result = revenueByChannel(orders, attribution);
    expect(result[0].channel).toBe("ATTRIBUTION_MISSING");
    expect(result[0].users).toBe(1);
  });

  it("joins attribution rows by userid", () => {
    const orders = [o({ userid: "x", price: 749, source: "PAYMENT" })];
    const attribution: AttributionRow[] = [
      {
        userid: "x",
        media_source: "facebook_ads",
        af_channel: "paid_social",
        campaign: "c1",
      },
    ];
    expect(revenueByChannel(orders, attribution)[0].channel).toBe(
      "facebook_ads",
    );
  });
});

describe("other metric primitives", () => {
  it("grossCollection sums price", () => {
    expect(grossCollection([o({ price: 100 }), o({ price: 50 })])).toBe(150);
  });

  it("arpu divides gross by unique users", () => {
    const orders = [
      o({ userid: "a", price: 749 }),
      o({ userid: "a", price: 749 }),
      o({ userid: "b", price: 699 }),
    ];
    expect(arpu(orders)).toBeCloseTo((749 + 749 + 699) / 2, 2);
  });

  it("conversionRate is period-based", () => {
    const orders = [o({ userid: "a", price: 749 })];
    const signups: SignupRow[] = [
      { report_date_ist: "2026-09-08", signups: 100 },
      { report_date_ist: "2026-09-07", signups: 50 },
    ];
    expect(
      conversionRate(orders, signups, "2026-09-01", "2026-09-08"),
    ).toBeCloseTo(1 / 150, 4);
  });

  it("discountGiven sums coupon_discount", () => {
    const orders = [
      o({ coupon_discount: 30 }),
      o({ coupon_discount: 70 }),
    ];
    expect(discountGiven(orders)).toBe(100);
  });

  it("listValue adds price + coupon_discount", () => {
    const orders = [
      o({ price: 670, coupon_discount: 30 }),
      o({ price: 580, coupon_discount: 20 }),
    ];
    expect(listValue(orders)).toBe(1300);
  });

  it("revenueByPlatform aggregates by platform", () => {
    const orders = [
      o({ platform: "ANDROID", price: 100 }),
      o({ platform: "IOS", price: 200 }),
      o({ platform: "ANDROID", price: 50 }),
    ];
    expect(revenueByPlatform(orders)).toEqual({ ANDROID: 150, IOS: 200 });
  });

  it("revenueByCoupon sorted by orders desc", () => {
    const orders = [
      o({ coupon_code: "A", price: 10, coupon_discount: 0 }),
      o({ coupon_code: "A", price: 10, coupon_discount: 0 }),
      o({ coupon_code: "B", price: 10, coupon_discount: 0 }),
    ];
    const r = revenueByCoupon(orders);
    expect(r[0].code).toBe("A");
    expect(r[0].orders).toBe(2);
  });

  it("cac divides cost by installs", () => {
    const af: AppsFlyerRow[] = [
      {
        report_date: "2026-09-08",
        app_platform: "ANDROID",
        media_source: "x",
        campaign: "c",
        impressions: 1000,
        clicks: 100,
        installs: 10,
        cost_inr: 500,
      },
    ];
    expect(cac([], af)).toBe(50);
  });
});

describe("weekly paidUsers", () => {
  it("weekly paidUsers ≠ Σ daily paidUsers when the same payer crosses days", () => {
    const orders = [
      o({
        order_date_ist: "2026-09-07",
        userid: "u1",
        price: 100,
      }),
      o({
        order_date_ist: "2026-09-08",
        userid: "u1",
        price: 100,
      }),
    ];
    expect(orders.length).toBe(2);
    expect(paidUsers(orders)).toBe(1);
  });
});

describe("revenueByPricePoint", () => {
  it("groups buyers, orders, revenue per price point, ascending", () => {
    const orders = [
      o({ userid: "u1", price: 749 }),
      o({ userid: "u2", price: 749 }),
      o({ userid: "u1", price: 749 }), // same user, second order at same price
      o({ userid: "u3", price: 699 }),
      o({ userid: "u4", price: 99 }),
    ];
    const r = revenueByPricePoint(orders);
    expect(r).toEqual([
      { price: 99, buyers: 1, orders: 1, revenue: 99 },
      { price: 699, buyers: 1, orders: 1, revenue: 699 },
      { price: 749, buyers: 2, orders: 3, revenue: 749 * 3 },
    ]);
  });

  it("buyers counts unique userids only (no double-count across repeat buyers)", () => {
    const orders = [
      o({ userid: "u1", price: 749 }),
      o({ userid: "u1", price: 749 }),
      o({ userid: "u1", price: 749 }),
    ];
    const [row] = revenueByPricePoint(orders);
    expect(row.buyers).toBe(1);
    expect(row.orders).toBe(3);
  });

  it("returns empty array for empty input", () => {
    expect(revenueByPricePoint([])).toEqual([]);
  });
});

describe("push: totalSent / totalClicks / totalAttributedRevenue / totalConvertedUsers / ctr / revenuePerConvertedUser", () => {
  it("totalSent sums sent counts", () => {
    const rows = [
      p({ sent: 100 }),
      p({ sent: 250 }),
      p({ sent: 50 }),
    ];
    expect(totalSent(rows)).toBe(400);
  });

  it("totalClicks sums unique_clicks counts", () => {
    const rows = [
      p({ unique_clicks: 5 }),
      p({ unique_clicks: 12 }),
    ];
    expect(totalClicks(rows)).toBe(17);
  });

  it("totalAttributedRevenue sums across rows", () => {
    const rows = [
      { attributed_revenue: 749 } as PushRow,
      { attributed_revenue: 1498 } as PushRow,
    ];
    expect(totalAttributedRevenue(rows)).toBe(2247);
  });

  it("totalConvertedUsers sums (note: per-campaign duplicate users are an upstream property, not a bug)", () => {
    const rows = [
      p({ converted_users: 3 }),
      p({ converted_users: 5 }),
    ];
    expect(totalConvertedUsers(rows)).toBe(8);
  });

  it("ctr returns clicks / sent, 0 when sent=0", () => {
    expect(ctr([])).toBe(0);
    expect(ctr([p({ sent: 0, unique_clicks: 0 })])).toBe(0);
    expect(ctr([p({ sent: 200, unique_clicks: 40 })])).toBeCloseTo(
      40 / 200,
      4,
    );
  });

  it("revenuePerConvertedUser divides revenue by users", () => {
    const rows = [
      p({ converted_users: 4, attributed_revenue: 1498 }),
    ];
    expect(revenuePerConvertedUser(rows)).toBeCloseTo(1498 / 4, 4);
    expect(revenuePerConvertedUser([])).toBe(0);
  });
});

describe("push: topCampaigns", () => {
  it("excludes zero-send rows", () => {
    const rows = [
      p({
        campaign_name: "A",
        sent: 0,
        unique_clicks: 0,
        converted_users: 0,
        attributed_revenue: 0,
      }),
      p({
        campaign_name: "B",
        sent: 100,
        unique_clicks: 5,
        converted_users: 1,
        attributed_revenue: 749,
      }),
    ];
    const result = topCampaigns(rows);
    expect(result).toHaveLength(1);
    expect(result[0].campaign_name).toBe("B");
  });

  it("aggregates the same campaign across multiple days", () => {
    const rows = [
      p({
        campaign_name: "A",
        sent: 100,
        unique_clicks: 5,
        converted_users: 1,
        attributed_revenue: 749,
        report_date: "2026-09-01",
      }),
      p({
        campaign_name: "A",
        sent: 200,
        unique_clicks: 10,
        converted_users: 2,
        attributed_revenue: 1498,
        report_date: "2026-09-02",
      }),
    ];
    const result = topCampaigns(rows);
    expect(result).toHaveLength(1);
    expect(result[0].sent).toBe(300);
    expect(result[0].attributed_revenue).toBe(2247);
    expect(result[0].ctr).toBeCloseTo(15 / 300, 4);
  });

  it("sorts by attributed_revenue descending by default", () => {
    const rows = [
      p({ campaign_name: "low", sent: 100, attributed_revenue: 100 }),
      p({ campaign_name: "high", sent: 100, attributed_revenue: 1000 }),
    ];
    const result = topCampaigns(rows);
    expect(result[0].campaign_name).toBe("high");
  });

  it("supports sort by converted_users", () => {
    const rows = [
      p({ campaign_name: "low", sent: 100, converted_users: 1, attributed_revenue: 100 }),
      p({ campaign_name: "high", sent: 100, converted_users: 10, attributed_revenue: 50 }),
    ];
    const result = topCampaigns(rows, "converted_users");
    expect(result[0].campaign_name).toBe("high");
  });

  it("honors the limit argument", () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      p({ campaign_name: `C${i}`, sent: 100, attributed_revenue: i }),
    );
    expect(topCampaigns(rows, "attributed_revenue", 5)).toHaveLength(5);
  });
});
