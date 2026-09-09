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
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { EmptyChart } from "./EmptyChart";
import { FormulaInfo } from "./FormulaInfo";
import { inr, intFmt } from "@/lib/format";
import type { AppsFlyerRow } from "@/types/sheet";

export function InstallsCostTrend({ rows }: { rows: AppsFlyerRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader action={<FormulaInfo formula="Σ af_daily.installs + Σ cost_inr per day" />}>
          <CardTitle>Installs & Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyChart />
        </CardContent>
      </Card>
    );
  }
  const map = new Map<string, { installs: number; cost: number }>();
  for (const r of rows) {
    const cur = map.get(r.report_date) ?? { installs: 0, cost: 0 };
    cur.installs += r.installs;
    cur.cost += r.cost_inr;
    map.set(r.report_date, cur);
  }
  const data = Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date: date.slice(5),
      installs: v.installs,
      cost: v.cost,
    }));

  return (
    <Card>
      <CardHeader action={<FormulaInfo formula="Σ af_daily.installs (bar) + Σ cost_inr (line) per day" />}>
        <CardTitle>Installs & Cost</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(value: number, name: string) => {
                  if (name === "Cost") return [inr(value), "Cost"];
                  return [intFmt(value), name];
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="left"
                dataKey="installs"
                name="Installs"
                fill="hsl(var(--foreground))"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cost"
                name="Cost"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 2.5, strokeWidth: 1.5, fill: "#10b981" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
