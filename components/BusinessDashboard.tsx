"use client";

import { useMemo } from "react";
import { DashboardToolbar } from "./DashboardToolbar";
import { KpiTile } from "./KpiTile";
import { TrendSection } from "./TrendSection";
import { BuyTypeTable } from "./BuyTypeTable";
import { PlatformRevenueChart } from "./PlatformRevenueChart";
import { GatewayRevenueChart } from "./GatewayRevenueChart";
import { TopCouponsTable } from "./TopCouponsTable";
import {
  grossCollection,
  netCollection,
  paidUsers,
  revenueByPlatform,
  conversionRate,
  discountGiven,
  listValue,
} from "@/lib/metrics";
import {
  byAfDateRange,
  byDateRange,
  byOrderDateRange,
} from "@/lib/filters";
import { priorPeriod, resolvePeriod } from "@/lib/dateRanges";
import { deltaStr, inr, intFmt, pct } from "@/lib/format";
import type { GrossNet } from "./GrossNetToggle";
import type { OrderRow, SheetData } from "@/types/sheet";

interface Props {
  data: SheetData;
  anchor: string;
}

const DEFAULT_EXCLUDED = ["ADMIN", "PW_PLAN"];
const GST_DIVISOR = 1.18;

function distinctSources(orders: OrderRow[]): string[] {
  return [...new Set(orders.map((o) => o.source))].sort();
}

function applySourceFilter(
  orders: OrderRow[],
  includeSources: Set<string>,
): OrderRow[] {
  if (includeSources.size === 0) return orders;
  return orders.filter((o) => includeSources.has(o.source));
}

function projectPrice(orders: OrderRow[], grossNet: GrossNet): OrderRow[] {
  if (grossNet === "gross") return orders;
  return orders.map((o) => ({
    ...o,
    price: o.price / GST_DIVISOR,
  }));
}

function projectCollection(orders: OrderRow[], grossNet: GrossNet): number {
  return grossNet === "gross"
    ? grossCollection(orders)
    : netCollection(orders);
}

function collectionFormula(grossNet: GrossNet): string {
  return grossNet === "net"
    ? "Σ order.price ÷ 1.18"
    : "Σ order.price";
}

function arpuFormula(grossNet: GrossNet): string {
  return grossNet === "net"
    ? "(Σ order.price ÷ 1.18) ÷ |Unique userids|"
    : "Σ order.price ÷ |Unique userids|";
}

function conversionFormula(): string {
  return "|Unique userids in period| ÷ |Period signups|";
}

function aovFormula(grossNet: GrossNet): string {
  return grossNet === "net"
    ? "(Σ order.price ÷ 1.18) ÷ |period orders|"
    : "Σ order.price ÷ |period orders|";
}

function listValueFormula(grossNet: GrossNet): string {
  return grossNet === "net"
    ? "Σ (order.price ÷ 1.18 + order.coupon_discount)"
    : "Σ (order.price + order.coupon_discount)";
}

function discountGivenFormula(): string {
  return "Σ order.coupon_discount (independent of Net/Gross toggle)";
}

export function BusinessDashboard({ data, anchor }: Props) {
  const sources = useMemo(() => distinctSources(data.mb_orders), [data.mb_orders]);

  return (
    <DashboardToolbar
      sourceOptions={sources}
      defaultExcluded={DEFAULT_EXCLUDED}
    >
      {(ctx) => {
        const range = resolvePeriod(ctx.period, anchor);
        const prior = priorPeriod(range);

        const baseOrdersRange = applySourceFilter(
          byOrderDateRange(data.mb_orders, range),
          ctx.includeSources,
        );
        const baseOrdersPrior = applySourceFilter(
          byOrderDateRange(data.mb_orders, prior),
          ctx.includeSources,
        );

        const ordersRange = projectPrice(baseOrdersRange, ctx.grossNet);
        const ordersPrior = projectPrice(baseOrdersPrior, ctx.grossNet);

        const signupsRange = byDateRange(data.mb_signups_daily, range);
        const signupsPrior = byDateRange(data.mb_signups_daily, prior);
        const afRange = byAfDateRange(data.af_daily, range);
        const afPrior = byAfDateRange(data.af_daily, prior);

        const collection = projectCollection(ordersRange, ctx.grossNet);
        const priorCollection = projectCollection(ordersPrior, ctx.grossNet);

        const totalSignups = signupsRange.reduce((s, r) => s + r.signups, 0);
        const priorSignups = signupsPrior.reduce((s, r) => s + r.signups, 0);

        const installs = afRange.reduce((s, r) => s + r.installs, 0);
        const priorInstalls = afPrior.reduce((s, r) => s + r.installs, 0);

        const payers = paidUsers(ordersRange);
        const priorPayers = paidUsers(ordersPrior);

        const arpuVal = payers === 0 ? 0 : collection / payers;
        const priorArpu =
          priorPayers === 0 ? 0 : priorCollection / priorPayers;

        const conv = conversionRate(
          ordersRange,
          data.mb_signups_daily,
          range.from,
          range.to,
        );
        const priorConv = conversionRate(
          ordersPrior,
          data.mb_signups_daily,
          prior.from,
          prior.to,
        );

        const aov =
          ordersRange.length === 0 ? 0 : collection / ordersRange.length;
        const priorAov =
          ordersPrior.length === 0 ? 0 : priorCollection / ordersPrior.length;

        return (
          <div className="space-y-6">
            <Section title="Headline KPIs">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <KpiTile
                  label="Installs"
                  value={intFmt(installs)}
                  delta={deltaStr(installs, priorInstalls)}
                  formula="Σ af_daily.installs"
                  formulaNote="From AppsFlyer daily grain. Ad-side."
                />
                <KpiTile
                  label="Sign-Ups"
                  value={intFmt(totalSignups)}
                  delta={deltaStr(totalSignups, priorSignups)}
                  formula="Σ mb_signups_daily.signups"
                  formulaNote="From signups tab. Additive across days."
                />
                <KpiTile
                  label={
                    ctx.grossNet === "gross"
                      ? "Gross Collection"
                      : "Net Collection"
                  }
                  value={inr(collection)}
                  delta={deltaStr(collection, priorCollection)}
                  hint={
                    ctx.grossNet === "net" ? "Net = Gross / 1.18" : undefined
                  }
                  formula={collectionFormula(ctx.grossNet)}
                  formulaNote="price in mb_orders is already NET of coupon."
                />
                <KpiTile
                  label="Paid Users"
                  value={intFmt(payers)}
                  delta={deltaStr(payers, priorPayers)}
                  formula="|Unique userids|"
                  formulaNote="Recomputed via Set, never summed across days."
                />
                <KpiTile
                  label="ARPU"
                  value={inr(arpuVal)}
                  delta={deltaStr(arpuVal, priorArpu)}
                  formula={arpuFormula(ctx.grossNet)}
                />
                <KpiTile
                  label="Conversion"
                  value={pct(conv, 2)}
                  delta={deltaStr(conv, priorConv)}
                  hint="Period-based"
                  formula={conversionFormula()}
                  formulaNote="Period-based: payers and signups in the same window."
                />
              </div>
            </Section>

            <Section title="Coupon Math">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiTile
                  emphasis="secondary"
                  label="Discount Given"
                  value={inr(discountGiven(ordersRange))}
                  formula={discountGivenFormula()}
                  formulaNote="Raw coupon_discount field; not divided by 1.18."
                />
                <KpiTile
                  emphasis="secondary"
                  label="List Value"
                  value={inr(listValue(ordersRange))}
                  hint="price + coupon_discount"
                  formula={listValueFormula(ctx.grossNet)}
                />
                <KpiTile
                  emphasis="secondary"
                  label="Avg Order Value"
                  value={inr(aov)}
                  delta={deltaStr(aov, priorAov)}
                  formula={aovFormula(ctx.grossNet)}
                />
                <KpiTile
                  emphasis="secondary"
                  label="Refund Rate"
                  value="0%"
                  hint="No refund data exists"
                  formula="hardcoded 0%"
                  formulaNote="No refund data exists for GyaanE — confirmed, not a gap to fix later."
                />
              </div>
            </Section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <TrendSection
                label="MoM — Month"
                grouping="month"
                range={range}
                orders={ordersRange}
                signupsForConversion={totalSignups}
                grossNet={ctx.grossNet}
              />
              <TrendSection
                label="WoW — ISO Week (Mon-start)"
                grouping="week"
                range={range}
                orders={ordersRange}
                signupsForConversion={totalSignups}
                grossNet={ctx.grossNet}
              />
              <TrendSection
                label="Last 7 Days"
                grouping="day"
                range={range}
                orders={ordersRange}
                signupsForConversion={totalSignups}
                grossNet={ctx.grossNet}
              />
            </div>

            <Section title="Buy Type Mix">
              <BuyTypeTable rows={data.mb_buy_type} />
            </Section>

            <Section title="Revenue Breakdown">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <PlatformRevenueChart
                  data={revenueByPlatform(ordersRange)}
                  grossNet={ctx.grossNet}
                />
                <GatewayRevenueChart
                  data={Object.entries(
                    ordersRange.reduce<Record<string, number>>((acc, o) => {
                      const key = `${o.gateway} · ${o.payment_method}`;
                      acc[key] = (acc[key] ?? 0) + o.price;
                      return acc;
                    }, {}),
                  )
                    .map(([method, revenue]) => ({ method, revenue }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 8)}
                  grossNet={ctx.grossNet}
                />
                <TopCouponsTable
                  orders={ordersRange}
                  grossNet={ctx.grossNet}
                />
              </div>
            </Section>
          </div>
        );
      }}
    </DashboardToolbar>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
