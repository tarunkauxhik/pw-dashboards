"use client";

import { useMemo, useState } from "react";
import { KpiTile } from "./KpiTile";
import { GrossNetToggle, type GrossNet } from "./GrossNetToggle";
import { SourceMultiSelect } from "./SourceMultiSelect";
import { SingleMetricChart } from "./SingleMetricChart";
import { FYPicker } from "./FYPicker";
import { MonthMultiPicker } from "./MonthMultiPicker";
import {
  conversionRate,
  discountGiven,
  grossCollection,
  listValue,
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

/**
 * Group rows by MoM/WoW key. Returns a sorted map: key → rows in that
 * group. Grouping is calendar-month for MoM, ISO week for WoW.
 */
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

export function BusinessGraphsDashboard({ data, anchor }: Props) {
  const sources = useMemo(() => distinctSources(data.mb_orders), [data.mb_orders]);

  const fyOptions = useMemo(
    () => distinctFYs(data.mb_orders).map((y) => `FY ${String(y).slice(-2)}-${String((y + 1) % 100).padStart(2, "0")}`),
    [data.mb_orders],
  );
  const monthOptions = useMemo(() => distinctMonths(data.mb_orders), [data.mb_orders]);

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

  // MoM filter
  const [fySelection, setFySelection] = useState<string | "all">("all");

  // WoW filter
  const [monthSelection, setMonthSelection] = useState<Set<string>>(
    () => new Set(monthOptions),
  );

  // Source + base filtering
  const baseOrdersAll = useMemo(
    () => applySourceFilter(data.mb_orders, includeSources),
    [data.mb_orders, includeSources],
  );

  // Last-7-days window — anchored to the most recent data date
  const last7Window = useMemo(() => {
    return { from: addDaysIst(anchor, -6), to: anchor };
  }, [anchor]);
  const prior7Window = useMemo(() => {
    return {
      from: addDaysIst(anchor, -13),
      to: addDaysIst(anchor, -7),
    };
  }, [anchor]);

  // Headline KPIs use the source-filtered orders, projected for Net/Gross.
  // KPIs are scoped to "Last 7 days" because that's the most useful anchor;
  // user can still toggle Net/Gross and exclude sources for the headline.
  const ordersForKpis = useMemo(
    () => projectPrice(baseOrdersAll, grossNet),
    [baseOrdersAll, grossNet],
  );
  const signupsRange = useMemo(
    () => byDateRange(data.mb_signups_daily, last7Window),
    [data.mb_signups_daily, last7Window],
  );
  const signupsPrior = useMemo(
    () => byDateRange(data.mb_signups_daily, prior7Window),
    [data.mb_signups_daily, prior7Window],
  );

  const collection = projectCollection(ordersForKpis, grossNet);
  const priorCollection = projectCollection(
    projectPrice(
      applySourceFilter(
        data.mb_orders.filter(
          (o) => o.order_date_ist >= prior7Window.from && o.order_date_ist <= prior7Window.to,
        ),
        includeSources,
      ),
      grossNet,
    ),
    grossNet,
  );
  const totalSignups = signupsRange.reduce((s, r) => s + r.signups, 0);
  const priorSignups = signupsPrior.reduce((s, r) => s + r.signups, 0);
  const payers = paidUsers(ordersForKpis);
  const priorPayers = paidUsers(
    projectPrice(
      applySourceFilter(
        data.mb_orders.filter(
          (o) => o.order_date_ist >= prior7Window.from && o.order_date_ist <= prior7Window.to,
        ),
        includeSources,
      ),
      grossNet,
    ),
  );
  const arpuVal = payers === 0 ? 0 : collection / payers;
  const priorArpu =
    priorPayers === 0 ? 0 : priorCollection / priorPayers;
  const conv = conversionRate(
    ordersForKpis,
    data.mb_signups_daily,
    last7Window.from,
    last7Window.to,
  );
  const priorConv = conversionRate(
    projectPrice(
      applySourceFilter(
        data.mb_orders.filter(
          (o) => o.order_date_ist >= prior7Window.from && o.order_date_ist <= prior7Window.to,
        ),
        includeSources,
      ),
      grossNet,
    ),
    data.mb_signups_daily,
    prior7Window.from,
    prior7Window.to,
  );

  // MoM data — all-time, filtered by FY
  const momData = useMemo(() => {
    const filtered =
      fySelection === "all"
        ? baseOrdersAll
        : baseOrdersAll.filter((o) => fyLabel(o.order_date_ist) === fySelection);
    const projected = projectPrice(filtered, grossNet);
    const grouped = groupByMonth(projected);
    return Array.from(grouped.entries()).map(([month, rows]) => {
      const collectionV = rows.reduce((s, r) => s + r.price, 0);
      const payersV = paidUsers(rows);
      const label = shortMonth(month);
      const arpuV = payersV === 0 ? 0 : collectionV / payersV;
      return {
        month,
        label,
        collection: collectionV,
        arpu: arpuV,
        payers: payersV,
      };
    });
  }, [baseOrdersAll, fySelection, grossNet]);

  // WoW data — filtered by selected months
  const wowData = useMemo(() => {
    const filtered =
      monthSelection.size === 0
        ? baseOrdersAll
        : baseOrdersAll.filter((o) =>
            monthSelection.has(o.order_date_ist.slice(0, 7)),
          );
    const projected = projectPrice(filtered, grossNet);
    const grouped = groupByWeek(projected);
    return Array.from(grouped.entries()).map(([week, rows]) => {
      const collectionV = rows.reduce((s, r) => s + r.price, 0);
      const payersV = paidUsers(rows);
      const arpuV = payersV === 0 ? 0 : collectionV / payersV;
      return {
        week,
        label: shortWeek(week),
        collection: collectionV,
        arpu: arpuV,
        payers: payersV,
      };
    });
  }, [baseOrdersAll, monthSelection, grossNet]);

  // Last-7-days data — daily grain
  const last7Data = useMemo(() => {
    const filtered = baseOrdersAll.filter(
      (o) =>
        o.order_date_ist >= last7Window.from && o.order_date_ist <= last7Window.to,
    );
    const projected = projectPrice(filtered, grossNet);
    const byDate = new Map<string, OrderRow[]>();
    for (const o of projected) {
      const arr = byDate.get(o.order_date_ist) ?? [];
      arr.push(o);
      byDate.set(o.order_date_ist, arr);
    }
    const series: { date: string; label: string; collection: number; arpu: number; payers: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDaysIst(last7Window.from, i);
      const rows = byDate.get(date) ?? [];
      const collectionV = rows.reduce((s, r) => s + r.price, 0);
      const payersV = paidUsers(rows);
      const arpuV = payersV === 0 ? 0 : collectionV / payersV;
      series.push({
        date,
        label: date.slice(5),
        collection: collectionV,
        arpu: arpuV,
        payers: payersV,
      });
    }
    return series;
  }, [baseOrdersAll, last7Window, grossNet]);

  const collectionFormula =
    grossNet === "net" ? "Σ order.price ÷ 1.18" : "Σ order.price";
  const arpuFormula = "net collection / orders";
  const payersFormula = "unique userids";
  const convFormula = "payers / signups";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
        <span className="text-xs text-muted-foreground">
          Anchor: <span className="font-medium tabular-nums text-foreground">{anchor}</span>{" "}
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

      <Section title="Headline KPIs (Last 7 days)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiTile
            label="Sign-Ups"
            value={intFmt(totalSignups)}
            delta={deltaStr(totalSignups, priorSignups)}
            formula="Σ mb_signups_daily.signups"
          />
          <KpiTile
            label={
              grossNet === "gross" ? "Gross Collection" : "Net Collection"
            }
            value={inr(collection)}
            delta={deltaStr(collection, priorCollection)}
            hint={grossNet === "net" ? "Net = Gross / 1.18" : undefined}
            formula={collectionFormula}
          />
          <KpiTile
            label="Paid Users"
            value={intFmt(payers)}
            delta={deltaStr(payers, priorPayers)}
            formula={payersFormula}
          />
          <KpiTile
            label="ARPU"
            value={inr(arpuVal)}
            delta={deltaStr(arpuVal, priorArpu)}
            formula={arpuFormula}
          />
          <KpiTile
            label="Conversion"
            value={pct(conv, 2)}
            delta={deltaStr(conv, priorConv)}
            hint="Period-based"
            formula={convFormula}
          />
          <KpiTile
            emphasis="secondary"
            label="List Value"
            value={inr(listValue(ordersForKpis))}
            formula="Σ (price + coupon_discount)"
          />
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {last7Window.from} → {last7Window.to} · discount given{" "}
          {inr(discountGiven(ordersForKpis))}
        </p>
      </Section>

      <Section title="MoM — by calendar month (all time)">
        <FYPicker
          options={fyOptions}
          value={fySelection}
          onChange={setFySelection}
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SingleMetricChart
            title="Net Collection Graph"
            formula={collectionFormula}
            formulaNote="Σ order.price per month bucket"
            data={momData.map((d) => ({ label: d.label, value: d.collection }))}
            kind="bar"
            formatValue={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <SingleMetricChart
            title="ARPU"
            formula={arpuFormula}
            data={momData.map((d) => ({ label: d.label, value: d.arpu }))}
            kind="line"
            formatValue={(v) => `₹${Math.round(v)}`}
            lineColor="#10b981"
          />
          <SingleMetricChart
            title="Total Paid Users"
            formula={payersFormula}
            data={momData.map((d) => ({ label: d.label, value: d.payers }))}
            kind="bar"
            formatValue={(v) => intFmt(v)}
            lineColor="#6366f1"
          />
          <SingleMetricChart
            title="Conversion %"
            formula={convFormula}
            formulaNote="payers / signups (signup rows pre-filtered by the global anchor window)"
            data={momData.map((d) => {
              const month = d.month;
              const monthSignups = data.mb_signups_daily
                .filter((s) => s.report_date_ist.startsWith(month))
                .reduce((s, r) => s + r.signups, 0);
              const c = monthSignups === 0 ? 0 : d.payers / monthSignups;
              return { label: d.label, value: c };
            })}
            kind="line"
            formatValue={(v) => pct(v, 2)}
            lineColor="#f59e0b"
          />
        </div>
      </Section>

      <Section title="WoW — by ISO week (all time)">
        <MonthMultiPicker
          options={monthOptions}
          selected={monthSelection}
          onChange={setMonthSelection}
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SingleMetricChart
            title="Net Collection Graph"
            formula={collectionFormula}
            formulaNote="Σ order.price per ISO-week bucket"
            data={wowData.map((d) => ({ label: d.label, value: d.collection }))}
            kind="bar"
            formatValue={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <SingleMetricChart
            title="ARPU"
            formula={arpuFormula}
            data={wowData.map((d) => ({ label: d.label, value: d.arpu }))}
            kind="line"
            formatValue={(v) => `₹${Math.round(v)}`}
            lineColor="#10b981"
          />
          <SingleMetricChart
            title="Total Paid Users"
            formula={payersFormula}
            data={wowData.map((d) => ({ label: d.label, value: d.payers }))}
            kind="bar"
            formatValue={(v) => intFmt(v)}
            lineColor="#6366f1"
          />
          <SingleMetricChart
            title="Conversion %"
            formula={convFormula}
            formulaNote="payers / signups for that week"
            data={wowData.map((d) => {
              const [yearStr, weekPart] = d.week.split("-W");
              const year = Number(yearStr);
              const week = Number(weekPart);
              const weekStart = isoWeekStart(year, week);
              const weekEnd = isoWeekEnd(year, week);
              const weekSignups = data.mb_signups_daily
                .filter(
                  (s) =>
                    s.report_date_ist >= weekStart &&
                    s.report_date_ist <= weekEnd,
                )
                .reduce((s, r) => s + r.signups, 0);
              const c = weekSignups === 0 ? 0 : d.payers / weekSignups;
              return { label: d.label, value: c };
            })}
            kind="line"
            formatValue={(v) => pct(v, 2)}
            lineColor="#f59e0b"
          />
        </div>
      </Section>

      <Section title={`Last 7 Days (${last7Window.from} → ${last7Window.to})`}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
        </div>
      </Section>
    </div>
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

/**
 * ISO-week start (Monday) for a given ISO 8601 year+week.
 * Algorithm: find Jan 4 of the year (always in week 1), subtract its
 * weekday offset (Mon=1..Sun=7) to land on Monday, then add 7 * (week-1).
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
