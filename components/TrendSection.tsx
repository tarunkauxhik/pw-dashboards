"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyChart } from "./EmptyChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { FormulaInfo } from "./FormulaInfo";
import { inr, intFmt, pct } from "@/lib/format";
import type { GrossNet } from "./GrossNetToggle";
import {
  dayKey,
  isoWeekKey,
  monthKey,
  type DateRange,
} from "@/lib/dateRanges";

type Grouping = "month" | "week" | "day";

export interface TrendableRow {
  order_date_ist: string;
  userid: string;
  price: number;
}

interface Props {
  label: string;
  grouping: Grouping;
  range: DateRange;
  rows: TrendableRow[];
  grossNet: GrossNet;
  /**
   * Absolute denominator for Conversion %.
   * Omit (or pass 0) to hide the Conversion column.
   */
  conversionDenominator?: number;
  /** Label shown on the Conversion column header. */
  conversionLabel?: string;
}

function groupRows(
  rows: TrendableRow[],
  grouping: Grouping,
): Map<string, TrendableRow[]> {
  const map = new Map<string, TrendableRow[]>();
  for (const r of rows) {
    const key =
      grouping === "month"
        ? monthKey(r.order_date_ist)
        : grouping === "week"
          ? isoWeekKey(r.order_date_ist)
          : dayKey(r.order_date_ist);
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return new Map([...map.entries()].sort());
}

function shortLabel(key: string, grouping: Grouping): string {
  if (grouping === "month") {
    const [y, m] = key.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  }
  if (grouping === "week") return key.replace("-", " · W");
  return key.slice(5);
}

function collectionFor(
  rows: TrendableRow[],
  grossNet: GrossNet,
): number {
  const sum = rows.reduce((s, r) => s + r.price, 0);
  return grossNet === "gross" ? sum : sum / 1.18;
}

export function TrendSection({
  label,
  grouping,
  range,
  rows,
  grossNet,
  conversionDenominator,
  conversionLabel = "Conv.",
}: Props) {
  const grouped = groupRows(rows, grouping);
  const showConv =
    conversionDenominator !== undefined && conversionDenominator > 0;

  const series = Array.from(grouped.entries()).map(([key, periodRows]) => {
    const collection = collectionFor(periodRows, grossNet);
    const payers = new Set(periodRows.map((r) => r.userid)).size;
    return {
      key,
      label: shortLabel(key, grouping),
      collection,
      arpu: payers === 0 ? 0 : collection / payers,
      payers,
      conversion:
        showConv && conversionDenominator > 0
          ? payers / conversionDenominator
          : 0,
    };
  });

  if (series.length === 0) {
    return (
      <Card>
        <CardHeader
          action={<FormulaInfo formula="Σ row.price · /1.18 when Net" />}
        >
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyChart />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        action={<FormulaInfo formula="Σ row.price · /1.18 when Net" />}
      >
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={series}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => {
                  if (name === "Collection") return [inr(value), name];
                  if (name === "ARPU") return [inr(value), name];
                  return [intFmt(value), name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="left"
                dataKey="collection"
                name="Collection"
                fill="hsl(var(--foreground))"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="arpu"
                name="ARPU"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1.5, fill: "#10b981" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Collection</TableHead>
              <TableHead className="text-right">ARPU</TableHead>
              <TableHead className="text-right">Paid Users</TableHead>
              {showConv && (
                <TableHead className="text-right">{conversionLabel}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium text-foreground">
                  {row.label}
                </TableCell>
                <TableCell className="text-right">
                  {inr(row.collection)}
                </TableCell>
                <TableCell className="text-right">
                  {inr(row.arpu)}
                </TableCell>
                <TableCell className="text-right">
                  {intFmt(row.payers)}
                </TableCell>
                {showConv && (
                  <TableCell className="text-right">
                    {pct(row.conversion)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="text-[11px] text-muted-foreground">
          Period: {range.from} → {range.to}. Paid Users recomputed per period
          from raw rows.
        </div>
      </CardContent>
    </Card>
  );
}
