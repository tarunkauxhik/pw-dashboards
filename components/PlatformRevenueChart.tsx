"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { EmptyChart } from "./EmptyChart";
import { FormulaInfo } from "./FormulaInfo";
import { inr } from "@/lib/format";
import type { GrossNet } from "./GrossNetToggle";

const COLORS = ["#0f172a", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#94a3b8"];

export function PlatformRevenueChart({
  data,
  grossNet,
}: {
  data: Record<string, number>;
  grossNet: GrossNet;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader action={<FormulaInfo formula="Σ order.price per platform" />}>
          <CardTitle>Revenue by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyChart />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader action={<FormulaInfo formula="Σ order.price per platform · /1.18 if Net" />}>
        <CardTitle>Revenue by Platform</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-[180px] w-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={entries}
                  dataKey="1"
                  nameKey="0"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {entries.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [inr(v), n]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1.5 text-sm">
            {entries.map(([k, v], i) => (
              <li key={k} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{k}</span>
                <span className="ml-auto font-medium tabular-nums">
                  {inr(v)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
