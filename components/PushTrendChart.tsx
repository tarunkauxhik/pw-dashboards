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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { EmptyChart } from "./EmptyChart";
import { FormulaInfo } from "./FormulaInfo";
import { inr, intFmt } from "@/lib/format";
import type { PushRow } from "@/types/sheet";

interface Props {
  rows: PushRow[];
}

export function PushTrendChart({ rows }: Props) {
  const data = (() => {
    const map = new Map<
      string,
      { sent: number; unique_clicks: number; attributed_revenue: number }
    >();
    for (const r of rows) {
      const cur = map.get(r.report_date) ?? {
        sent: 0,
        unique_clicks: 0,
        attributed_revenue: 0,
      };
      cur.sent += r.sent;
      cur.unique_clicks += r.unique_clicks;
      cur.attributed_revenue += r.attributed_revenue;
      map.set(r.report_date, cur);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([report_date, v]) => ({
        date: report_date.slice(5),
        sent: v.sent,
        unique_clicks: v.unique_clicks,
        attributed_revenue: v.attributed_revenue,
      }));
  })();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader
          action={
            <FormulaInfo
              formula="Σ mb_push_daily.{sent, unique_clicks, attributed_revenue} per day"
            />
          }
        >
          <CardTitle>Send &amp; Click Trend</CardTitle>
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
        action={
          <FormulaInfo formula="Σ mb_push_daily.{sent, unique_clicks, attributed_revenue} per day" />
        }
      >
        <CardTitle>Send &amp; Click Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
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
                width={50}
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
                  if (name === "Attributed Revenue") return [inr(value), name];
                  return [intFmt(value), name];
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
                dataKey="sent"
                name="Sent"
                fill="hsl(var(--foreground))"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                yAxisId="left"
                dataKey="unique_clicks"
                name="Unique Clicks"
                fill="#6366f1"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="attributed_revenue"
                name="Attributed Revenue"
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
