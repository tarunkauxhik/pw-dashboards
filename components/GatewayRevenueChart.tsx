"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { EmptyChart } from "./EmptyChart";
import { FormulaInfo } from "./FormulaInfo";
import { inr } from "@/lib/format";
import type { GrossNet } from "./GrossNetToggle";

export function GatewayRevenueChart({
  data,
  grossNet,
}: {
  data: { method: string; revenue: number }[];
  grossNet: GrossNet;
}) {
  const formula = grossNet === "net" ? "Σ order.price ÷ 1.18" : "Σ order.price";
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader action={<FormulaInfo formula={formula} />}>
          <CardTitle>Revenue by Payment Method</CardTitle>
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
          <FormulaInfo
            formula={formula}
            note='Grouped by `${order.gateway} · ${order.payment_method}`, summed.'
          />
        }
      >
        <CardTitle>Revenue by Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="method"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(v: number) => inr(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--foreground))"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
