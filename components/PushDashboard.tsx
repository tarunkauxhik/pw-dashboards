"use client";

import { useMemo } from "react";
import { DashboardToolbar } from "./DashboardToolbar";
import { KpiTile } from "./KpiTile";
import { PushDisclaimerBanner } from "./PushDisclaimerBanner";
import { PushTrendChart } from "./PushTrendChart";
import { TopCampaignsTable } from "./TopCampaignsTable";
import { byPushDateRange } from "@/lib/filters";
import { priorPeriod, resolvePeriod } from "@/lib/dateRanges";
import { deltaStr, inr, intFmt, pct } from "@/lib/format";
import {
  ctr,
  revenuePerConvertedUser,
  totalAttributedRevenue,
  totalClicks,
  totalConvertedUsers,
  totalSent,
} from "@/lib/metrics";
import type { SheetData } from "@/types/sheet";

interface Props {
  data: SheetData;
  anchor: string;
}

export function PushDashboard({ data, anchor }: Props) {
  return (
    <DashboardToolbar
      sourceOptions={[]}
      defaultExcluded={[]}
      showGrossNet={false}
    >
      {(ctx) => {
        const range = resolvePeriod(ctx.period, anchor);
        const prior = priorPeriod(range);
        const push = byPushDateRange(data.mb_push_daily, range);
        const pushPrior = byPushDateRange(data.mb_push_daily, prior);

        const sent = totalSent(push);
        const priorSent = totalSent(pushPrior);
        const clicks = totalClicks(push);
        const priorClicks = totalClicks(pushPrior);
        const ctrVal = ctr(push);
        const priorCtr = ctr(pushPrior);
        const converted = totalConvertedUsers(push);
        const priorConverted = totalConvertedUsers(pushPrior);
        const arpuVal = revenuePerConvertedUser(push);
        const priorArpuVal = revenuePerConvertedUser(pushPrior);

        return (
          <div className="space-y-6">
            <PushDisclaimerBanner />

            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Headline KPIs
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <KpiTile
                  label="Sends"
                  value={intFmt(sent)}
                  delta={deltaStr(sent, priorSent)}
                  formula="Σ mb_push_daily.sent"
                />
                <KpiTile
                  label="Unique Clicks"
                  value={intFmt(clicks)}
                  delta={deltaStr(clicks, priorClicks)}
                  formula="Σ mb_push_daily.unique_clicks"
                />
                <KpiTile
                  label="CTR"
                  value={pct(ctrVal, 2)}
                  delta={deltaStr(ctrVal, priorCtr)}
                  formula="Σ clicks ÷ Σ sent"
                />
                <KpiTile
                  label="Converted Users"
                  value={intFmt(converted)}
                  delta={deltaStr(converted, priorConverted)}
                  formula="Σ mb_push_daily.converted_users"
                  formulaNote="Per-campaign counts; one user across two campaigns in the same window may count twice."
                />
                <KpiTile
                  label="Attributed Revenue"
                  value={inr(totalAttributedRevenue(push))}
                  delta={deltaStr(
                    totalAttributedRevenue(push),
                    totalAttributedRevenue(pushPrior),
                  )}
                  hint="Attributed (no control group)"
                  formula="Σ mb_push_daily.attributed_revenue"
                  formulaNote="Attributed, not measured. Not proven incremental."
                />
              </div>
              {converted > 0 && (
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  Avg revenue per converted user{" "}
                  <span className="font-medium text-foreground">
                    {inr(arpuVal)}
                  </span>{" "}
                  {priorConverted > 0 ? (
                    <>
                      · prior period{" "}
                      <span className="font-medium">{inr(priorArpuVal)}</span>
                      ·{" "}
                      <span
                        className={
                          deltaStr(arpuVal, priorArpuVal)?.tone === "up"
                            ? "text-emerald-600"
                            : deltaStr(arpuVal, priorArpuVal)?.tone === "down"
                              ? "text-rose-600"
                              : ""
                        }
                      >
                        {deltaStr(arpuVal, priorArpuVal)?.text}
                      </span>
                    </>
                  ) : null}
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Trend
              </h2>
              <PushTrendChart rows={push} />
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Campaigns
              </h2>
              <TopCampaignsTable rows={push} />
            </section>
          </div>
        );
      }}
    </DashboardToolbar>
  );
}
