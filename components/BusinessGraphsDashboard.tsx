"use client";

import { useMemo } from "react";
import { DashboardToolbar } from "./DashboardToolbar";
import { KpiTile } from "./KpiTile";
import { TrendSection } from "./TrendSection";
import {
  grossCollection,
  netCollection,
  paidUsers,
  conversionRate,
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

export function BusinessGraphsDashboard({ data, anchor }: Props) {
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

        return (
          <div className="space-y-6">
            <Section title="Headline KPIs">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <KpiTile
                  label="Installs"
                  value={intFmt(installs)}
                  delta={deltaStr(installs, priorInstalls)}
                  formula="Σ af_daily.installs"
                />
                <KpiTile
                  label="Sign-Ups"
                  value={intFmt(totalSignups)}
                  delta={deltaStr(totalSignups, priorSignups)}
                  formula="Σ mb_signups_daily.signups"
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
                  formula={
                    ctx.grossNet === "net"
                      ? "Σ order.price ÷ 1.18"
                      : "Σ order.price"
                  }
                />
                <KpiTile
                  label="Paid Users"
                  value={intFmt(payers)}
                  delta={deltaStr(payers, priorPayers)}
                  formula="unique userids"
                />
                <KpiTile
                  label="ARPU"
                  value={inr(arpuVal)}
                  delta={deltaStr(arpuVal, priorArpu)}
                  formula="net collection / orders"
                />
                <KpiTile
                  label="Conversion"
                  value={pct(conv, 2)}
                  delta={deltaStr(conv, priorConv)}
                  hint="Period-based"
                  formula="payers / signups"
                />
              </div>
            </Section>

            <Section title="MoM">
              <p className="text-xs text-muted-foreground">
                Net Collection Graph · ARPU · Total Paid Users · Conversion %
                — by calendar month
              </p>
              <TrendSection
                label="MoM — Month"
                grouping="month"
                range={range}
                orders={ordersRange}
                signupsForConversion={totalSignups}
                grossNet={ctx.grossNet}
              />
            </Section>

            <Section title="WoW">
              <p className="text-xs text-muted-foreground">
                Net Collection Graph · ARPU · Total Paid Users · Conversion %
                — by ISO week (Mon-start)
              </p>
              <TrendSection
                label="WoW — ISO Week (Mon-start)"
                grouping="week"
                range={range}
                orders={ordersRange}
                signupsForConversion={totalSignups}
                grossNet={ctx.grossNet}
              />
            </Section>

            <Section title="Last 7 Days">
              <p className="text-xs text-muted-foreground">
                Net Collection Graph · ARPU · Total Paid Users · Conversion %
                — daily grain
              </p>
              <TrendSection
                label="Last 7 Days"
                grouping="day"
                range={range}
                orders={ordersRange}
                signupsForConversion={totalSignups}
                grossNet={ctx.grossNet}
              />
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
