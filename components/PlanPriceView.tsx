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
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { EmptyChart } from "./EmptyChart";
import { FormulaInfo } from "./FormulaInfo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { inr, intFmt } from "@/lib/format";
import type { GrossNet } from "./GrossNetToggle";

interface Row {
  price: number;
  buyers: number;
  orders: number;
  revenue: number;
}

interface Props {
  rows: Row[];
  grossNet: GrossNet;
}

export function PlanPriceView({ rows, grossNet }: Props) {
  const projected: Row[] =
    grossNet === "gross"
      ? rows
      : rows.map((r) => ({
          price: r.price / 1.18,
          buyers: r.buyers,
          orders: r.orders,
          revenue: r.revenue / 1.18,
        }));

  const buyersTotal = projected.reduce((s, r) => s + r.buyers, 0);
  const revenueTotal = projected.reduce((s, r) => s + r.revenue, 0);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader action={<FormulaInfo formula="Σ order.price per price point" />}>
          <CardTitle>Plan Price View</CardTitle>
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
            formula="Σ order.price per price point"
            note="Buyers = unique userids (does not double-count under toggle). Revenue and avg flip with Net."
          />
        }
      >
        <CardTitle>Plan Price View</CardTitle>
        <CardDescription>
          Buyers use the raw order.price — they don&apos;t double-count across
          Gross/Net toggles. Only Revenue and Avg per buyer flip with the
          toggle.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Price (Rs)</TableHead>
                <TableHead className="text-right">Buyers</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg / buyer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projected.map((r) => (
                <TableRow key={r.price}>
                  <TableCell className="text-right font-medium tabular-nums">
                    {inr(r.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {intFmt(r.buyers)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {intFmt(r.orders)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {inr(r.revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {inr(r.buyers === 0 ? 0 : r.revenue / r.buyers)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-[11px] text-muted-foreground tabular-nums">
            {intFmt(buyersTotal)} buyer{buyersTotal === 1 ? "" : "s"} across{" "}
            {intFmt(projected.length)} price points ·{" "}
            {inr(revenueTotal)} total revenue
          </p>
        </div>
        <div className="xl:col-span-2 h-[220px] min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={projected}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--border))"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={(v: number) => intFmt(v)}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey={(r: Row) => inr(r.price)}
                width={80}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(value: number) => intFmt(value)}
                labelFormatter={(label: string) => `Price ${label}`}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="buyers"
                name="Buyers"
                fill="hsl(var(--foreground))"
                radius={[0, 3, 3, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
