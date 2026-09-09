"use client";

import { useMemo } from "react";
import { DashboardToolbar } from "./DashboardToolbar";
import { KpiTile } from "./KpiTile";
import { TrendSection } from "./TrendSection";
import { BuyTypeTable } from "./BuyTypeTable";
import { PlatformRevenueChart } from "./PlatformRevenueChart";
import { GatewayRevenueChart } from "./GatewayRevenueChart";
import { TopCouponsTable } from "./TopCouponsTable";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  grossCollection,
  netCollection,
  paidUsers,
  filterRevenueOrders,
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
import type { OrderRow, SheetData } from "@/types/sheet";

interface Props {
  data: SheetData;
  anchor: string;
}

const DEFAULT_EXCLUDED = ["ADMIN", "PW_PLAN"];

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

        const ordersRangeAll = byOrderDateRange(data.mb_orders, range);
        const ordersRange = applySourceFilter(ordersRangeAll, ctx.includeSources);
        const ordersPriorAll = byOrderDateRange(data.mb_orders, prior);
        const ordersPrior = applySourceFilter(ordersPriorAll, ctx.includeSources);
        const signupsRange = byDateRange(data.mb_signups_daily, range);
        const signupsPrior = byDateRange(data.mb_signups_daily, prior);
        const afRange = byAfDateRange(data.af_daily, range);
        const afPrior = byAfDateRange(data.af_daily, prior);

        const collection =
          ctx.grossNet === "gross"
            ? grossCollection(ordersRange)
            : netCollection(ordersRange);
        const priorCollection =
          ctx.grossNet === "gross"
            ? grossCollection(ordersPrior)
            : netCollection(ordersPrior);

        const totalSignups = signupsRange.reduce((s, r) => s + r.signups, 0);
        const priorSignups = signupsPrior.reduce((s, r) => s + r.signups, 0);

        const installs = afRange.reduce((s, r) => s + r.installs, 0);
        const priorInstalls = afPrior.reduce((s, r) => s + r.installs, 0);

        const payers = paidUsers(ordersRange);
        const priorPayers = paidUsers(ordersPrior);

        const arpuVal =
          payers === 0 ? 0 : grossCollection(ordersRange) / payers;
        const priorArpu =
          priorPayers === 0 ? 0 : grossCollection(ordersPrior) / priorPayers;

        // Conv uses period-filtered SIGNUPS vs period-filtered PAYERS.
        // Conversion is intentionally based on orders that match the user's
        // source selection (so the headline reflects what they see in Collection).
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
          ordersRange.length === 0
            ? 0
            : grossCollection(ordersRange) / ordersRange.length;
        const priorAov =
          ordersPrior.length === 0
            ? 0
            : grossCollection(ordersPrior) / ordersPrior.length;

        return (
          <div className="space-y-6">
            <Section title="Headline KPIs">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <KpiTile
                  label="Installs"
                  value={intFmt(installs)}
                  delta={deltaStr(installs, priorInstalls)}
                />
                <KpiTile
                  label="Sign-Ups"
                  value={intFmt(totalSignups)}
                  delta={deltaStr(totalSignups, priorSignups)}
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
                />
                <KpiTile
                  label="Paid Users"
                  value={intFmt(payers)}
                  delta={deltaStr(payers, priorPayers)}
                />
                <KpiTile
                  label="ARPU"
                  value={inr(arpuVal)}
                  delta={deltaStr(arpuVal, priorArpu)}
                />
                <KpiTile
                  label="Conversion"
                  value={pct(conv, 2)}
                  delta={deltaStr(conv, priorConv)}
                  hint="Period-based"
                />
              </div>
            </Section>

            <Section title="Coupon Math">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiTile
                  emphasis="secondary"
                  label="Discount Given"
                  value={inr(discountGiven(ordersRange))}
                />
                <KpiTile
                  emphasis="secondary"
                  label="List Value"
                  value={inr(listValue(ordersRange))}
                  hint="price + coupon_discount"
                />
                <KpiTile
                  emphasis="secondary"
                  label="Avg Order Value"
                  value={inr(aov)}
                  delta={deltaStr(aov, priorAov)}
                />
                <KpiTile
                  emphasis="secondary"
                  label="Refund Rate"
                  value="0%"
                  hint="No refund data exists"
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
              />
              <TrendSection
                label="WoW — ISO Week (Mon-start)"
                grouping="week"
                range={range}
                orders={ordersRange}
                signupsForConversion={totalSignups}
              />
              <TrendSection
                label="Last 7 Days"
                grouping="day"
                range={range}
                orders={ordersRange}
                signupsForConversion={totalSignups}
              />
            </div>

            <Section title="Buy Type Mix">
              <BuyTypeTable rows={data.mb_buy_type} />
            </Section>

            <Section title="Revenue Breakdown">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <PlatformRevenueChart data={revenueByPlatform(ordersRange)} />
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
                />
                <TopCouponsTable orders={ordersRange} />
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
