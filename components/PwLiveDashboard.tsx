"use client";

import { useMemo, useState } from "react";
import { DashboardToolbar } from "./DashboardToolbar";
import { KpiTile } from "./KpiTile";
import { TrendSection } from "./TrendSection";
import { SingleMetricChart } from "./SingleMetricChart";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";
import { PwLiveBatchTable } from "./PwLiveBatchTable";
import {
  funnelTotals,
  perBatchPeriodTable,
  pwLiveArpu,
  pwLiveConversionRate,
  pwLiveNet,
  pwLivePaidUsers,
  type BatchPeriodStats,
} from "@/lib/metrics";
import {
  addDaysIst,
  fiscalYearStartIst,
  isoWeekKey,
  monthKey,
  priorPeriod,
  resolvePeriod,
  shiftDateIst,
} from "@/lib/dateRanges";
import type { PwLiveOrderRow } from "@/types/sheet";
import { deltaStr, inr, intFmt, pct } from "@/lib/format";
import type { GrossNet } from "./GrossNetToggle";
import type { SheetData } from "@/types/sheet";

interface Props {
  data: SheetData;
  anchor: string;
}

const PW_LIVE_GST = 1.18;

function projectPrice(
  rows: PwLiveOrderRow[],
  grossNet: GrossNet,
): PwLiveOrderRow[] {
  if (grossNet === "gross") return rows;
  return rows.map((o) => ({
    ...o,
    price: o.price === null ? null : o.price / PW_LIVE_GST,
  }));
}

function ordersInRange(
  rows: PwLiveOrderRow[],
  from: string,
  to: string,
): PwLiveOrderRow[] {
  return rows.filter(
    (o) => o.order_date_ist >= from && o.order_date_ist <= to,
  );
}

function funnelViewsInRange(
  rows: SheetData["mb_pwlive_funnel"],
  stage: "batch_description_view" | "order_page_view",
  from: string,
  to: string,
): { totalViews: number; uniqueUsers: number } {
  return rows.reduce(
    (acc, r) => {
      if (
        r.funnel_stage === stage &&
        r.event_date_ist >= from &&
        r.event_date_ist <= to
      ) {
        acc.totalViews += r.total_views;
        acc.uniqueUsers += r.unique_users;
      }
      return acc;
    },
    { totalViews: 0, uniqueUsers: 0 },
  );
}

/**
 * Number of unique batch-description viewers inside a [from,to] window.
 * Used as the denominator of the agreed Conversion % formula.
 */
function batchDescriptionUniqueViewers(
  rows: SheetData["mb_pwlive_funnel"],
  from: string,
  to: string,
): number {
  return rows.reduce((s, r) => {
    if (
      r.funnel_stage === "batch_description_view" &&
      r.event_date_ist >= from &&
      r.event_date_ist <= to
    ) {
      return s + r.unique_users;
    }
    return s;
  }, 0);
}

export function PwLiveDashboard({ data, anchor }: Props) {
  const sourceOptions = useMemo(
    () =>
      [...new Set(data.mb_pwlive_orders.map((o) => o.batch_name))].sort(),
    [data.mb_pwlive_orders],
  );

  const batchRows = useMemo(
    () => perBatchPeriodTable(data.mb_pwlive_orders, anchor),
    [data.mb_pwlive_orders, anchor],
  );

  // Per-tile display-only mode: doesn't affect formulas, conversion
  // denominators, or any other calculation — purely a "which number to
  // show in this tile" toggle. State is local + ephemeral (no
  // persistence). Independent per tile.
  const [batchViewMode, setBatchViewMode] = useState<ViewMode>("unique");
  const [orderViewMode, setOrderViewMode] = useState<ViewMode>("unique");

  return (
    <DashboardToolbar
      data={data}
      sourceOptions={sourceOptions}
      defaultExcluded={[]}
      showGrossNet={true}
      showSources={false}
    >
      {(ctx) => {
        const range = resolvePeriod(ctx.period, anchor);
        const prior = priorPeriod(range);

        const ordersAll = data.mb_pwlive_orders;

        // Current-period values
        const ordersRange = ordersInRange(ordersAll, range.from, range.to);
        const ordersRangeNet = projectPrice(ordersRange, ctx.grossNet);
        const ordersPrior = ordersInRange(ordersAll, prior.from, prior.to);
        const ordersPriorNet = projectPrice(ordersPrior, ctx.grossNet);

        const fyStart = fiscalYearStartIst(anchor);

        const batchViews = funnelViewsInRange(
          data.mb_pwlive_funnel,
          "batch_description_view",
          range.from,
          range.to,
        );
        const batchViewsPrior = funnelViewsInRange(
          data.mb_pwlive_funnel,
          "batch_description_view",
          prior.from,
          prior.to,
        );
        const orderPageUsers = funnelViewsInRange(
          data.mb_pwlive_funnel,
          "order_page_view",
          range.from,
          range.to,
        );
        const orderPageUsersPrior = funnelViewsInRange(
          data.mb_pwlive_funnel,
          "order_page_view",
          prior.from,
          prior.to,
        );

        const netCollection = ordersRangeNet.reduce(
          (s, o) => s + (o.price ?? 0),
          0,
        );
        const priorNetCollection = ordersPriorNet.reduce(
          (s, o) => s + (o.price ?? 0),
          0,
        );
        const payers = new Set(ordersRange.map((o) => o.userid)).size;
        const priorPayers = new Set(ordersPrior.map((o) => o.userid)).size;
        const totalSignups = 0; // pw.live has no signup rows; conversion denominator comes from funnel
        const arpu = payers === 0 ? 0 : netCollection / payers;
        const priorArpu = priorPayers === 0 ? 0 : priorNetCollection / priorPayers;
        const conv = pwLiveConversionRate(
          ordersRange,
          data.mb_pwlive_funnel,
          range.from,
          range.to,
        );
        const priorConv = pwLiveConversionRate(
          ordersPrior,
          data.mb_pwlive_funnel,
          prior.from,
          prior.to,
        );

        // ── MoM / WoW / Last 7 (all-time + all-batches, no FY filter here) ──

        const projectedAll = projectPrice(ordersAll, ctx.grossNet);

        // MoM totals — for the per-section KPIs
        const momAllStart = projectedAll[0]?.order_date_ist.slice(0, 7) ?? "0000-00"; // unused marker for clarity
        void momAllStart;
        const momMap = groupByMonth(projectedAll);
        const momSeries = [...momMap.entries()].map(([month, rows]) => {
          const collection = rows.reduce((s, r) => s + (r.price ?? 0), 0);
          const payersV = new Set(rows.map((r) => r.userid)).size;
          const arpuV = payersV === 0 ? 0 : collection / payersV;
          return { month, label: shortMonth(month), collection, arpu: arpuV, payers: payersV };
        });
        const emptyKpis = { collection: 0, arpu: 0, payers: 0, conv: 0, batchDenominator: 0 };
        const momKpis =
          momSeries.length === 0
            ? emptyKpis
            : computeKpis(
                projectedAll.filter((r) => isMonthInRange(r, momSeries[0].month, momSeries[momSeries.length - 1].month)),
                data.mb_pwlive_funnel,
                `${momSeries[0].month}-01`,
                lastDayOfMonthIso(momSeries[momSeries.length - 1].month),
              );

        const wowMap = groupByWeek(projectedAll);
        const wowSeries = [...wowMap.entries()].map(([week, rows]) => {
          const collection = rows.reduce((s, r) => s + (r.price ?? 0), 0);
          const payersV = new Set(rows.map((r) => r.userid)).size;
          return { week, label: shortWeek(week), collection, arpu: payersV === 0 ? 0 : collection / payersV, payers: payersV };
        });
        const wowKpis =
          wowSeries.length === 0
            ? emptyKpis
            : computeKpis(
                projectedAll.filter((r) => isWeekInRange(r, wowSeries[0].week, wowSeries[wowSeries.length - 1].week)),
                data.mb_pwlive_funnel,
                isoWeekStartOf(wowSeries[0].week),
                isoWeekEndOf(wowSeries[wowSeries.length - 1].week),
              );

        const last7Window = { from: addDaysIst(anchor, -6), to: anchor };
        const last7Series = Array.from({ length: 7 }, (_, i) => {
          const date = addDaysIst(last7Window.from, i);
          const rows = projectedAll.filter((r) => r.order_date_ist === date);
          const collection = rows.reduce((s, r) => s + (r.price ?? 0), 0);
          const payersV = new Set(rows.map((r) => r.userid)).size;
          return {
            date,
            label: date.slice(5),
            collection,
            arpu: payersV === 0 ? 0 : collection / payersV,
            payers: payersV,
          };
        });
        const last7Kpis = computeKpis(
          ordersInRange(ordersAll, last7Window.from, last7Window.to),
          data.mb_pwlive_funnel,
          last7Window.from,
          last7Window.to,
        );

        // ── Per-batch table — uses non-projected orders for buyer counts,
        //    but Net figures flow through the projected sums so the
        //    Gross/Net toggle still applies to revenue columns. ──


        return (
          <div className="space-y-6">
            {/* Headline KPI row */}
            <SectionShell title="Headline KPIs">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <KpiTile
                  label={
                    batchViewMode === "overall"
                      ? "Batch Page Views"
                      : "Batch Page Unique Users"
                  }
                  value={intFmt(
                    batchViewMode === "overall"
                      ? batchViews.totalViews
                      : batchViews.uniqueUsers,
                  )}
                  delta={deltaStr(
                    batchViewMode === "overall"
                      ? batchViews.totalViews
                      : batchViews.uniqueUsers,
                    batchViewMode === "overall"
                      ? batchViewsPrior.totalViews
                      : batchViewsPrior.uniqueUsers,
                  )}
                  action={
                    <ViewModeToggle
                      value={batchViewMode}
                      onChange={setBatchViewMode}
                    />
                  }
                />
                <KpiTile
                  label={
                    orderViewMode === "overall"
                      ? "Order Page Views"
                      : "Order Page Unique Users"
                  }
                  value={intFmt(
                    orderViewMode === "overall"
                      ? orderPageUsers.totalViews
                      : orderPageUsers.uniqueUsers,
                  )}
                  delta={deltaStr(
                    orderViewMode === "overall"
                      ? orderPageUsers.totalViews
                      : orderPageUsers.uniqueUsers,
                    orderViewMode === "overall"
                      ? orderPageUsersPrior.totalViews
                      : orderPageUsersPrior.uniqueUsers,
                  )}
                  action={
                    <ViewModeToggle
                      value={orderViewMode}
                      onChange={setOrderViewMode}
                    />
                  }
                />
                <KpiTile
                  label={
                    ctx.grossNet === "gross"
                      ? "Gross Collection"
                      : "Net Collection"
                  }
                  value={inr(netCollection)}
                  delta={deltaStr(netCollection, priorNetCollection)}
                  hint={ctx.grossNet === "net" ? "Net = Gross / 1.18" : undefined}
                  formula={
                    ctx.grossNet === "net"
                      ? "Σ order.price ÷ 1.18"
                      : "Σ order.price"
                  }
                />
                <KpiTile
                  label="Total Paid Users"
                  value={intFmt(payers)}
                  delta={deltaStr(payers, priorPayers)}
                  formula="unique userids"
                />
                <KpiTile
                  label="ARPU"
                  value={inr(arpu)}
                  delta={deltaStr(arpu, priorArpu)}
                  formula="gross collection / payers"
                />
                <KpiTile
                  label="Conversion"
                  value={pct(conv, 2)}
                  delta={deltaStr(conv, priorConv)}
                  formula="paid users / batch description unique viewers"
                  formulaNote="per agreed formula"
                />
              </div>
            </SectionShell>

            {/* MoM */}
            <SectionShell title="MoM — by calendar month (all batches)">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiTile
                  emphasis="secondary"
                  label="MoM Collection"
                  value={inr(momKpis.collection)}
                  formula="Σ pwLiveNet for selected months"
                />
                <KpiTile
                  emphasis="secondary"
                  label="MoM Paid Users"
                  value={intFmt(momKpis.payers)}
                  formula="unique users in selected months"
                />
                <KpiTile
                  emphasis="secondary"
                  label="MoM ARPU"
                  value={inr(momKpis.arpu)}
                  formula="collection / payers"
                />
                <KpiTile
                  emphasis="secondary"
                  label="MoM Conversion"
                  value={pct(momKpis.conv, 2)}
                  formula="payers / batch description unique viewers"
                />
              </div>
              <TrendSection
                label="MoM — Month"
                grouping="month"
                range={range}
                rows={projectedAll as never}
                grossNet={ctx.grossNet}
                conversionDenominator={momKpis.batchDenominator}
                conversionLabel="Conv."
              />
            </SectionShell>

            {/* WoW */}
            <SectionShell title="WoW — by ISO week (all batches)">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiTile
                  emphasis="secondary"
                  label="WoW Collection"
                  value={inr(wowKpis.collection)}
                  formula="Σ pwLiveNet for selected weeks"
                />
                <KpiTile
                  emphasis="secondary"
                  label="WoW Paid Users"
                  value={intFmt(wowKpis.payers)}
                  formula="unique users in selected weeks"
                />
                <KpiTile
                  emphasis="secondary"
                  label="WoW ARPU"
                  value={inr(wowKpis.arpu)}
                  formula="collection / payers"
                />
                <KpiTile
                  emphasis="secondary"
                  label="WoW Conversion"
                  value={pct(wowKpis.conv, 2)}
                  formula="payers / batch description unique viewers"
                />
              </div>
              <TrendSection
                label="WoW — ISO Week (Mon-start)"
                grouping="week"
                range={range}
                rows={projectedAll as never}
                grossNet={ctx.grossNet}
                conversionDenominator={wowKpis.batchDenominator}
                conversionLabel="Conv."
              />
            </SectionShell>

            {/* Last 7 Days — 3 charts only, no Conversion per PRD §5.2 */}
            <SectionShell
              title={`Last 7 Days (${last7Window.from} → ${last7Window.to})`}
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiTile
                  emphasis="secondary"
                  label="Last 7 Collection"
                  value={inr(last7Kpis.collection)}
                  formula="Σ pwLiveNet (7-day)"
                />
                <KpiTile
                  emphasis="secondary"
                  label="Last 7 Paid Users"
                  value={intFmt(last7Kpis.payers)}
                  formula="unique users (7-day)"
                />
                <KpiTile
                  emphasis="secondary"
                  label="Last 7 ARPU"
                  value={inr(last7Kpis.arpu)}
                  formula="collection / payers"
                />
                <KpiTile
                  emphasis="secondary"
                  label="Last 7 Conversion"
                  value={pct(last7Kpis.conv, 2)}
                  formula="payers / batch description unique viewers"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SingleCollectionChart
                  data={last7Series}
                  title="Net Collection Graph"
                />
                <SingleArpuChart
                  data={last7Series}
                  title="ARPU"
                />
                <SinglePayersChart data={last7Series} title="Total Paid Users" />
              </div>
            </SectionShell>

            {/* Per-batch table — independent of the period selector (PRD §5.3) */}
            <SectionShell title="Per-Batch Snapshot (independent of period)">
              <p className="text-xs text-muted-foreground">
                Time windows here are pinned to today ({anchor}): YTD from
                {" "}
                {fyStart}, MTD from {anchor.slice(0, 7)}-01, D-1 ={" "}
                {shiftDateIst(anchor, -1)}, D-2 = {shiftDateIst(anchor, -2)},
                D-3 = {shiftDateIst(anchor, -3)}. Not affected by the period
                selector above.
              </p>
              <PwLiveBatchTable
                rows={batchRows}
                qa={data.mb_pwlive_qa}
              />
            </SectionShell>
          </div>
        );
      }}
    </DashboardToolbar>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function groupByMonth(
  rows: PwLiveOrderRow[],
): Map<string, PwLiveOrderRow[]> {
  const map = new Map<string, PwLiveOrderRow[]>();
  for (const r of rows) {
    const k = monthKey(r.order_date_ist);
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return new Map([...map.entries()].sort());
}

function groupByWeek(
  rows: PwLiveOrderRow[],
): Map<string, PwLiveOrderRow[]> {
  const map = new Map<string, PwLiveOrderRow[]>();
  for (const r of rows) {
    const k = isoWeekKey(r.order_date_ist);
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return new Map([...map.entries()].sort());
}

function shortMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

function shortWeek(iso: string): string {
  return iso.replace("-", " · W");
}

function lastDayOfMonthIso(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  const yy = last.getUTCFullYear();
  const mm = String(last.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(last.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function isMonthInRange(r: PwLiveOrderRow, fromYm: string, toYm: string) {
  const ym = r.order_date_ist.slice(0, 7);
  return ym >= fromYm && ym <= toYm;
}

function isWeekInRange(r: PwLiveOrderRow, fromWeek: string, toWeek: string) {
  const w = isoWeekKey(r.order_date_ist);
  return w >= fromWeek && w <= toWeek;
}

/** ISO-week start (Monday) for "YYYY-Wxx". */
function isoWeekStartOf(weekKey: string): string {
  const [yStr, wPart] = weekKey.split("-W");
  const year = Number(yStr);
  const week = Number(wPart);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + 7 * (week - 1));
  const yy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(target.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function isoWeekEndOf(weekKey: string): string {
  return addDaysIst(isoWeekStartOf(weekKey), 6);
}

/**
 * Compute section KPIs scoped to an explicit [from, to] range.
 * `batchDenominator` is the unique-viewer count across the same range,
 * pre-computed so we can pass it into `TrendSection.conversionDenominator`
 * as an absolute number that all buckets share.
 */
function computeKpis(
  orders: PwLiveOrderRow[],
  funnel: SheetData["mb_pwlive_funnel"],
  from: string,
  to: string,
): {
  collection: number;
  arpu: number;
  payers: number;
  conv: number;
  batchDenominator: number;
} {
  const collection = orders.reduce((s, o) => s + (o.price ?? 0), 0);
  const payers = new Set(orders.map((o) => o.userid)).size;
  const arpu = payers === 0 ? 0 : collection / payers;
  const batchDenominator = batchDescriptionUniqueViewers(funnel, from, to);
  const conv = batchDenominator === 0 ? 0 : payers / batchDenominator;
  return { collection, arpu, payers, conv, batchDenominator };
}

function SectionShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-slate-900/[0.04] shadow-inner space-y-4 p-5 dark:bg-slate-50/[0.04]">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SingleCollectionChart({
  data,
  title,
}: {
  data: { label: string; collection: number }[];
  title: string;
}) {
  return (
    <SingleMetricChart
      title={title}
      formula="Σ pwLiveNet per day"
      kind="bar"
      data={data.map((d) => ({ label: d.label, value: d.collection }))}
      formatValue={(v) => `₹${(v / 1000).toFixed(0)}k`}
    />
  );
}

function SingleArpuChart({
  data,
  title,
}: {
  data: { label: string; arpu: number }[];
  title: string;
}) {
  return (
    <SingleMetricChart
      title={title}
      formula="Σ pwLiveNet / payers"
      kind="line"
      data={data.map((d) => ({ label: d.label, value: d.arpu }))}
      formatValue={(v) => `₹${Math.round(v)}`}
      lineColor="#10b981"
    />
  );
}

function SinglePayersChart({
  data,
  title,
}: {
  data: { label: string; payers: number }[];
  title: string;
}) {
  return (
    <SingleMetricChart
      title={title}
      formula="unique userids per day"
      kind="bar"
      data={data.map((d) => ({ label: d.label, value: d.payers }))}
      formatValue={(v) => intFmt(v)}
      lineColor="#6366f1"
    />
  );
}
