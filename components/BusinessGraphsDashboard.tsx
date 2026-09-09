"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useMemo, useState } from "react";
import { KpiTile } from "./KpiTile";
import { GrossNetToggle, type GrossNet } from "./GrossNetToggle";
import { SourceMultiSelect } from "./SourceMultiSelect";
import { SingleMetricChart } from "./SingleMetricChart";
import { FYPicker } from "./FYPicker";
import { MonthMultiPicker } from "./MonthMultiPicker";
import {
  conversionRate,
  grossCollection,
  netCollection,
  paidUsers,
} from "@/lib/metrics";
import { byDateRange } from "@/lib/filters";
import {
  addDaysIst,
  distinctFYs,
  distinctMonths,
  fyLabel,
  isoWeekKey,
  monthKey,
} from "@/lib/dateRanges";
import { deltaStr, inr, intFmt, pct } from "@/lib/format";
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
  return orders.map((o) => ({ ...o, price: o.price / GST_DIVISOR }));
}

function computeSectionKPIs(
  range: { from: string; to: string },
  orders: OrderRow[],
  signups: { report_date_ist: string; signups: number }[],
  grossNet: GrossNet,
) {
  const projected = projectPrice(orders, grossNet);
  const collection =
    grossNet === "gross"
      ? grossCollection(projected)
      : netCollection(projected);
  const payers = paidUsers(projected);
  const arpu = payers === 0 ? 0 : collection / payers;
  const conv = conversionRate(
    projected,
    signups,
    range.from,
    range.to,
  );
  const totalSignups = signups
    .filter(
      (s) => s.report_date_ist >= range.from && s.report_date_ist <= range.to,
    )
    .reduce((s, r) => s + r.signups, 0);
  return { collection, payers, arpu, conv, totalSignups };
}

function groupByMonth(orders: OrderRow[]): Map<string, OrderRow[]> {
  const m = new Map<string, OrderRow[]>();
  for (const o of orders) {
    const k = monthKey(o.order_date_ist);
    const arr = m.get(k) ?? [];
    arr.push(o);
    m.set(k, arr);
  }
  return new Map([...m.entries()].sort());
}

function groupByWeek(orders: OrderRow[]): Map<string, OrderRow[]> {
  const m = new Map<string, OrderRow[]>();
  for (const o of orders) {
    const k = isoWeekKey(o.order_date_ist);
    const arr = m.get(k) ?? [];
    arr.push(o);
    m.set(k, arr);
  }
  return new Map([...m.entries()].sort());
}

function shortMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

function shortWeek(iso: string): string {
  return iso.replace("-", " · W");
}

/**
 * ISO-week start (Monday) and end (Sunday) for a given ISO 8601 year+week.
 * Algorithm: Jan 4 is always in week 1. Subtract its weekday offset
 * (Mon=1..Sun=7) to get Monday of week 1, then add 7 * (week-1).
 */
function isoWeekStart(year: number, week: number): string {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + 7 * (week - 1));
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoWeekEnd(year: number, week: number): string {
  return addDaysIst(isoWeekStart(year, week), 6);
}

/**
 * Compute MoM / WoW / Daily series with collection/arpu/payers per bucket.
 * `collectionFor` returns the gross-or-net collection given the grossNet toggle.
 */
function buildBucketSeries(
  rows: OrderRow[],
  grossNet: GrossNet,
  groupFn: (o: OrderRow[]) => Map<string, OrderRow[]>,
  labelFn: (key: string) => string,
): {
  bucket: string;
  label: string;
  collection: number;
  arpu: number;
  payers: number;
}[] {
  const div = grossNet === "gross" ? 1 : GST_DIVISOR;
  const grouped = groupFn(rows);
  return Array.from(grouped.entries()).map(([key, groupRows]) => {
    const collection = groupRows.reduce((s, r) => s + r.price, 0) / div;
    const payers = paidUsers(groupRows);
    return {
      bucket: key,
      label: labelFn(key),
      collection,
      arpu: payers === 0 ? 0 : collection / payers,
      payers,
    };
  });
}

export function BusinessGraphsDashboard({ data, anchor }: Props) {
  const sources = useMemo(() => distinctSources(data.mb_orders), [data.mb_orders]);

  const fyOptions = useMemo(
    () =>
      distinctFYs(data.mb_orders).map(
        (y) =>
          `FY ${String(y).slice(-2)}-${String((y + 1) % 100).padStart(2, "0")}`,
      ),
    [data.mb_orders],
  );
  const monthOptions = useMemo(
    () => distinctMonths(data.mb_orders),
    [data.mb_orders],
  );

  return (
    <GraphsInner
      data={data}
      anchor={anchor}
      sources={sources}
      fyOptions={fyOptions}
      monthOptions={monthOptions}
    />
  );
}

function GraphsInner({
  data,
  anchor,
  sources,
  fyOptions,
  monthOptions,
}: {
  data: SheetData;
  anchor: string;
  sources: string[];
  fyOptions: string[];
  monthOptions: string[];
}) {
  const [grossNet, setGrossNet] = useState<GrossNet>("net");
  const [excludedSources, setExcludedSources] = useState<Set<string>>(
    () => new Set(sources.filter((s) => DEFAULT_EXCLUDED.includes(s))),
  );
  const includeSources = useMemo(() => {
    const out = new Set<string>();
    for (const s of sources) if (!excludedSources.has(s)) out.add(s);
    return out;
  }, [sources, excludedSources]);

  const [fySelection, setFySelection] = useState<string | "all">("all");
  const [monthSelection, setMonthSelection] = useState<Set<string>>(
    () => new Set(monthOptions),
  );

  const baseOrdersAll = useMemo(
    () => applySourceFilter(data.mb_orders, includeSources),
    [data.mb_orders, includeSources],
  );

  const collectionFormula =
    grossNet === "net" ? "Σ order.price ÷ 1.18" : "Σ order.price";
  const arpuFormula = "net collection / orders";
  const payersFormula = "unique userids";
  const convFormula = "payers / signups";

  // ── MoM ────────────────────────────────────────────────────────────
  // MoM range = full FY if selected, else all-time. We derive the
  // section window from the bucket keys present.
  const momOrders = useMemo(() => {
    const filtered =
      fySelection === "all"
        ? baseOrdersAll
        : baseOrdersAll.filter(
            (o) => fyLabel(o.order_date_ist) === fySelection,
          );
    return projectPrice(filtered, grossNet);
  }, [baseOrdersAll, fySelection, grossNet]);

  const momSeries = useMemo(
    () =>
      buildBucketSeries(momOrders, "gross", groupByMonth, shortMonth).map(
        (d) => ({
          month: d.bucket,
          label: d.label,
          collection: d.collection,
          arpu: d.arpu,
          payers: d.payers,
        }),
      ),
    [momOrders],
  );

  const momKpis = useMemo(() => {
    // Range: from the first month present → last month present
    if (momSeries.length === 0)
      return { collection: 0, arpu: 0, payers: 0, conv: 0 };
    const first = momSeries[0].month + "-01";
    const lastBucket = momSeries[momSeries.length - 1].month;
    const [ly, lm] = lastBucket.split("-").map(Number);
    const last = new Date(ly, lm, 0).toISOString().slice(0, 10);
    const projectedSignups = data.mb_signups_daily
      .filter((s) => s.report_date_ist >= first && s.report_date_ist <= last)
      .reduce((s, r) => s + r.signups, 0);
    return computeSectionKPIs(
      { from: first, to: last },
      momOrders,
      data.mb_signups_daily,
      "gross",
    );
  }, [momSeries, momOrders]);

  const momConversionSeries = useMemo(
    () =>
      momSeries.map((d) => {
        const monthSignups = data.mb_signups_daily
          .filter((s) => s.report_date_ist.startsWith(d.month))
          .reduce((s, r) => s + r.signups, 0);
        const c = monthSignups === 0 ? 0 : d.payers / monthSignups;
        return { label: d.label, value: c };
      }),
    [momSeries],
  );

  // ── WoW ────────────────────────────────────────────────────────────
  const wowOrders = useMemo(() => {
    const filtered =
      monthSelection.size === 0
        ? []
        : baseOrdersAll.filter((o) =>
            monthSelection.has(o.order_date_ist.slice(0, 7)),
          );
    return projectPrice(filtered, grossNet);
  }, [baseOrdersAll, monthSelection, grossNet]);

  const wowSeries = useMemo(
    () =>
      buildBucketSeries(wowOrders, "gross", groupByWeek, shortWeek).map(
        (d) => ({
          week: d.bucket,
          label: d.label,
          collection: d.collection,
          arpu: d.arpu,
          payers: d.payers,
        }),
      ),
    [wowOrders],
  );

  const wowKpis = useMemo(() => {
    // Range: union of weeks present
    if (wowSeries.length === 0) return { collection: 0, arpu: 0, payers: 0, conv: 0 };
    const firstWeek = wowSeries[0].week;
    const lastWeek = wowSeries[wowSeries.length - 1].week;
    const [fyStr, fw] = firstWeek.split("-W");
    const [lyStr, lw] = lastWeek.split("-W");
    const first = isoWeekStart(Number(fyStr), Number(fw));
    const last = isoWeekEnd(Number(lyStr), Number(lw));
    return computeSectionKPIs(
      { from: first, to: last },
      wowOrders,
      data.mb_signups_daily,
      "gross",
    );
  }, [wowSeries, wowOrders]);

  const wowConversionSeries = useMemo(
    () =>
      wowSeries.map((d) => {
        const [yearStr, weekPart] = d.week.split("-W");
        const year = Number(yearStr);
        const week = Number(weekPart);
        const weekStart = isoWeekStart(year, week);
        const weekEnd = isoWeekEnd(year, week);
        const weekSignups = data.mb_signups_daily
          .filter(
            (s) =>
              s.report_date_ist >= weekStart && s.report_date_ist <= weekEnd,
          )
          .reduce((s, r) => s + r.signups, 0);
        const c = weekSignups === 0 ? 0 : d.payers / weekSignups;
        return { label: d.label, value: c };
      }),
    [wowSeries],
  );

  // ── Last 7 Days ────────────────────────────────────────────────────
  const last7Window = useMemo(
    () => ({ from: addDaysIst(anchor, -6), to: anchor }),
    [anchor],
  );
  const last7Orders = useMemo(() => {
    const filtered = baseOrdersAll.filter(
      (o) =>
        o.order_date_ist >= last7Window.from &&
        o.order_date_ist <= last7Window.to,
    );
    return projectPrice(filtered, grossNet);
  }, [baseOrdersAll, last7Window, grossNet]);

  const last7Data = useMemo(() => {
    const byDate = new Map<string, OrderRow[]>();
    for (const o of last7Orders) {
      const arr = byDate.get(o.order_date_ist) ?? [];
      arr.push(o);
      byDate.set(o.order_date_ist, arr);
    }
    const series: {
      date: string;
      label: string;
      collection: number;
      arpu: number;
      payers: number;
    }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDaysIst(last7Window.from, i);
      const rows = byDate.get(date) ?? [];
      const collectionV = rows.reduce((s, r) => s + r.price, 0);
      const payersV = paidUsers(rows);
      series.push({
        date,
        label: date.slice(5),
        collection: collectionV,
        arpu: payersV === 0 ? 0 : collectionV / payersV,
        payers: payersV,
      });
    }
    return series;
  }, [last7Orders, last7Window]);

  const last7Kpis = useMemo(
    () =>
      computeSectionKPIs(
        last7Window,
        last7Orders,
        data.mb_signups_daily,
        "gross",
      ),
    [last7Window, last7Orders],
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <span className="text-xs text-muted-foreground">
          Anchor:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {anchor}
          </span>{" "}
          IST · all-time data
        </span>
        <div className="flex items-center gap-4">
          <GrossNetToggle value={grossNet} onChange={setGrossNet} />
          <SourceMultiSelect
            options={sources}
            excluded={excludedSources}
            onChange={setExcludedSources}
          />
        </div>
      </div>

      {/* MoM */}
      <SectionShell title="MoM — by calendar month (all time)">
        <SubToolbar>
          <FYPicker
            options={fyOptions}
            value={fySelection}
            onChange={setFySelection}
          />
        </SubToolbar>
        <SectionKPIs kpis={momKpis} grossNet={grossNet} />
        <ChartsGrid>
          <SingleMetricChart
            title="Net Collection Graph"
            formula={collectionFormula}
            formulaNote="Σ order.price per month bucket"
            data={momSeries.map((d) => ({ label: d.label, value: d.collection }))}
            kind="bar"
            formatValue={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <SingleMetricChart
            title="ARPU"
            formula={arpuFormula}
            data={momSeries.map((d) => ({ label: d.label, value: d.arpu }))}
            kind="line"
            formatValue={(v) => `₹${Math.round(v)}`}
            lineColor="#10b981"
          />
          <SingleMetricChart
            title="Total Paid Users"
            formula={payersFormula}
            data={momSeries.map((d) => ({ label: d.label, value: d.payers }))}
            kind="bar"
            formatValue={(v) => intFmt(v)}
            lineColor="#6366f1"
          />
          <SingleMetricChart
            title="Conversion %"
            formula={convFormula}
            formulaNote="payers / signups for that month"
            data={momConversionSeries}
            kind="line"
            formatValue={(v) => pct(v, 2)}
            lineColor="#f59e0b"
          />
        </ChartsGrid>
      </SectionShell>

      {/* WoW */}
      <SectionShell title="WoW — by ISO week (all time)">
        <SubToolbar>
          <MonthMultiPicker
            options={monthOptions}
            selected={monthSelection}
            onChange={setMonthSelection}
          />
        </SubToolbar>
        <SectionKPIs kpis={wowKpis} grossNet={grossNet} />
        <ChartsGrid>
          <SingleMetricChart
            title="Net Collection Graph"
            formula={collectionFormula}
            formulaNote="Σ order.price per ISO-week bucket"
            data={wowSeries.map((d) => ({ label: d.label, value: d.collection }))}
            kind="bar"
            formatValue={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <SingleMetricChart
            title="ARPU"
            formula={arpuFormula}
            data={wowSeries.map((d) => ({ label: d.label, value: d.arpu }))}
            kind="line"
            formatValue={(v) => `₹${Math.round(v)}`}
            lineColor="#10b981"
          />
          <SingleMetricChart
            title="Total Paid Users"
            formula={payersFormula}
            data={wowSeries.map((d) => ({ label: d.label, value: d.payers }))}
            kind="bar"
            formatValue={(v) => intFmt(v)}
            lineColor="#6366f1"
          />
          <SingleMetricChart
            title="Conversion %"
            formula={convFormula}
            formulaNote="payers / signups for that week"
            data={wowConversionSeries}
            kind="line"
            formatValue={(v) => pct(v, 2)}
            lineColor="#f59e0b"
          />
        </ChartsGrid>
      </SectionShell>

      {/* Last 7 Days */}
      <SectionShell
        title={`Last 7 Days (${last7Window.from} → ${last7Window.to})`}
      >
        <SectionKPIs kpis={last7Kpis} grossNet={grossNet} />
        <ChartsGrid>
          <SingleMetricChart
            title="Net Collection Graph"
            formula={collectionFormula}
            data={last7Data.map((d) => ({ label: d.label, value: d.collection }))}
            kind="bar"
            formatValue={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <SingleMetricChart
            title="ARPU"
            formula={arpuFormula}
            data={last7Data.map((d) => ({ label: d.label, value: d.arpu }))}
            kind="line"
            formatValue={(v) => `₹${Math.round(v)}`}
            lineColor="#10b981"
          />
          <SingleMetricChart
            title="Total Paid Users"
            formula={payersFormula}
            data={last7Data.map((d) => ({ label: d.label, value: d.payers }))}
            kind="bar"
            formatValue={(v) => intFmt(v)}
            lineColor="#6366f1"
          />
        </ChartsGrid>
      </SectionShell>
    </div>
  );
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

function SubToolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function ChartsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>
  );
}

/**
 * The 4-tile KPI strip scoped to a single section's data range. Values
 * come straight from the section's filtered orders + signups; they do
 * not reflect a global "Last 7 days" window.
 */
function SectionKPIs({
  kpis,
  grossNet,
}: {
  kpis: {
    collection: number;
    arpu: number;
    payers: number;
    conv: number;
    totalSignups?: number;
  };
  grossNet: GrossNet;
}) {
  const collectionFormula =
    grossNet === "net" ? "Σ order.price ÷ 1.18" : "Σ order.price";
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiTile
        label={grossNet === "gross" ? "Gross Collection" : "Net Collection"}
        value={inr(kpis.collection)}
        formula={collectionFormula}
      />
      <KpiTile
        label="Paid Users"
        value={intFmt(kpis.payers)}
        formula="unique userids"
      />
      <KpiTile
        label="ARPU"
        value={inr(kpis.arpu)}
        formula="net collection / orders"
      />
      <KpiTile
        label="Conversion"
        value={pct(kpis.conv, 2)}
        formula="payers / signups"
      />
    </div>
  );
}
