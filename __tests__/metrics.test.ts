import { describe, it, expect } from "vitest";
import type {
  AppsFlyerRow,
  AttributionRow,
  OrderRow,
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
