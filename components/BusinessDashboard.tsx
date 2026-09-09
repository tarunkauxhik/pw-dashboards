"use client";

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
import type { SheetData } from "@/types/sheet";

interface Props {
  data: SheetData;
  anchor: string;
}

export function BusinessDashboard({ data, anchor }: Props) {
  return (
    <DashboardToolbar>
      {(ctx) => {
        const range = resolvePeriod(ctx.period, anchor);
        const prior = priorPeriod(range);

        const ordersAll = filterRevenueOrders(
          byOrderDateRange(data.mb_orders, range),
          ctx.includeAdmin,
        );
        const ordersPrior = filterRevenueOrders(
          byOrderDateRange(data.mb_orders, prior),
          ctx.includeAdmin,
        );
        const signupsRange = byDateRange(data.mb_signups_daily, range);
        const signupsPrior = byDateRange(data.mb_signups_daily, prior);
        const afRange = byAfDateRange(data.af_daily, range);
        const afPrior = byAfDateRange(data.af_daily, prior);

        const collection =
          ctx.grossNet === "gross"
            ? grossCollection(ordersAll)
            : netCollection(ordersAll);
        const priorCollection =
          ctx.grossNet === "gross"
            ? grossCollection(ordersPrior)
            : netCollection(ordersPrior);

        const totalSignups = signupsRange.reduce((s, r) => s + r.signups, 0);
        const priorSignups = signupsPrior.reduce((s, r) => s + r.signups, 0);

        const installs = afRange.reduce((s, r) => s + r.installs, 0);
        const priorInstalls = afPrior.reduce((s, r) => s + r.installs, 0);

        const payers = paidUsers(ordersAll);
        const priorPayers = paidUsers(ordersPrior);

        const arpuVal = payers === 0 ? 0 : grossCollection(ordersAll) / payers;
        const priorArpu =
          priorPayers === 0 ? 0 : grossCollection(ordersPrior) / priorPayers;

        const conv = conversionRate(
          ordersAll,
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
          ordersAll.length === 0 ? 0 : grossCollection(ordersAll) / ordersAll.length;
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
                  hint="Net = Gross / 1.18"
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
                  value={inr(discountGiven(ordersAll))}
                />
                <KpiTile
                  emphasis="secondary"
                  label="List Value"
                  value={inr(listValue(ordersAll))}
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
                orders={ordersAll}
                signupsForConversion={totalSignups}
              />
              <TrendSection
                label="WoW — ISO Week (Mon-start)"
                grouping="week"
                range={range}
                orders={ordersAll}
                signupsForConversion={totalSignups}
              />
              <TrendSection
                label="Last 7 Days"
                grouping="day"
                range={range}
                orders={ordersAll}
                signupsForConversion={totalSignups}
              />
            </div>

            <Section title="Buy Type Mix">
              <BuyTypeTable rows={data.mb_buy_type} />
            </Section>

            <Section title="Revenue Breakdown">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <PlatformRevenueChart data={revenueByPlatform(ordersAll)} />
                <GatewayRevenueChart
                  data={Object.entries(
                    ordersAll.reduce<Record<string, number>>((acc, o) => {
                      const key = `${o.gateway} · ${o.payment_method}`;
                      acc[key] = (acc[key] ?? 0) + o.price;
                      return acc;
                    }, {}),
                  )
                    .map(([method, revenue]) => ({ method, revenue }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 8)}
                />
                <TopCouponsTable orders={ordersAll} />
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
