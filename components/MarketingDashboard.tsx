"use client";

import { DashboardToolbar } from "./DashboardToolbar";
import { KpiTile } from "./KpiTile";
import { ChannelTable } from "./ChannelTable";
import { RevenueByChannelChart } from "./RevenueByChannelChart";
import { InstallsCostTrend } from "./InstallsCostTrend";
import {
  cac,
  filterRevenueOrders,
  grossCollection,
  paidUsers,
  revenueByChannel,
} from "@/lib/metrics";
import {
  byAfDateRange,
  byOrderDateRange,
} from "@/lib/filters";
import { channelCoverage } from "@/lib/channel";
import { priorPeriod, resolvePeriod } from "@/lib/dateRanges";
import { deltaStr, inr, intFmt } from "@/lib/format";
import type { SheetData } from "@/types/sheet";

interface Props {
  data: SheetData;
  anchor: string;
}

export function MarketingDashboard({ data, anchor }: Props) {
  return (
    <DashboardToolbar>
      {(ctx) => {
        const range = resolvePeriod(ctx.period, anchor);
        const prior = priorPeriod(range);

        const orders = filterRevenueOrders(
          byOrderDateRange(data.mb_orders, range),
          ctx.includeAdmin,
        );
        const ordersPrior = filterRevenueOrders(
          byOrderDateRange(data.mb_orders, prior),
          ctx.includeAdmin,
        );
        const af = byAfDateRange(data.af_daily, range);
        const afPrior = byAfDateRange(data.af_daily, prior);

        const installs = af.reduce((s, r) => s + r.installs, 0);
        const priorInstalls = afPrior.reduce((s, r) => s + r.installs, 0);
        const cost = af.reduce((s, r) => s + r.cost_inr, 0);
        const priorCost = afPrior.reduce((s, r) => s + r.cost_inr, 0);

        const cacVal = cac(orders, af);
        const priorCacVal = cac(ordersPrior, afPrior);

        const payers = paidUsers(orders);
        const priorPayers = paidUsers(ordersPrior);

        const channels = revenueByChannel(orders, data.mb_paid_user_attribution);
        const coverage = channelCoverage(
          orders.map((o) => o.userid),
          data.mb_paid_user_attribution,
        );

        return (
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Headline KPIs
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiTile
                  label="Installs"
                  value={intFmt(installs)}
                  delta={deltaStr(installs, priorInstalls)}
                />
                <KpiTile
                  label="Total Ad Cost"
                  value={inr(cost)}
                  delta={deltaStr(cost, priorCost)}
                />
                <KpiTile
                  label="CAC"
                  value={inr(cacVal)}
                  delta={deltaStr(cacVal, priorCacVal)}
                  hint="cost / installs"
                />
                <KpiTile
                  label="Paid Users"
                  value={intFmt(payers)}
                  delta={deltaStr(payers, priorPayers)}
                />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Acquisition
              </h2>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChannelTable rows={af} />
                <RevenueByChannelChart
                  data={channels}
                  coveragePct={coverage.pct}
                />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Trend
              </h2>
              <InstallsCostTrend rows={af} />
            </section>
          </div>
        );
      }}
    </DashboardToolbar>
  );
}
