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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { EmptyChart } from "./EmptyChart";
import { inr, intFmt } from "@/lib/format";

interface Props {
  data: { channel: string; users: number; revenue: number }[];
  coveragePct: number;
}

export function RevenueByChannelChart({ data, coveragePct }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Channel</CardTitle>
          <CardDescription>
            Channel data covers —% of paying users. The remainder is
            unattributed due to a known tracking issue, not zero acquisition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyChart />
        </CardContent>
      </Card>
    );
  }

  const coverageLabel =
    coveragePct === 0 ? "0%" : `${(coveragePct * 100).toFixed(0)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Channel</CardTitle>
        <CardDescription>
          Channel data covers <span className="font-medium tabular-nums">{coverageLabel}</span> of paying users. The remainder is
          unattributed due to a known tracking issue, not zero acquisition.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--border))"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="channel"
                width={140}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(value: number, name: string) => {
                  if (name === "Revenue") return [inr(value), "Revenue"];
                  if (name === "Users") return [intFmt(value), "Users"];
                  return [value, name];
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="hsl(var(--foreground))"
                radius={[0, 3, 3, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
