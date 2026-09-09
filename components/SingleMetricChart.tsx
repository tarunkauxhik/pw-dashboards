"use client";

import {
  Bar,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { FormulaInfo } from "./FormulaInfo";

interface SeriesPoint {
  label: string;
  value: number;
}

interface Props {
  title: string;
  formula: string;
  formulaNote?: string;
  data: SeriesPoint[];
  /** "bar" or "line" — pick the visual treatment */
  kind: "bar" | "line";
  /** Value formatter for the y-axis ticks and tooltip */
  formatValue: (v: number) => string;
  /** An optional highlight color for the line variant */
  lineColor?: string;
  /** Height of the chart, defaults to 220 */
  height?: number;
  /** Show empty state if data is empty */
  emptyMessage?: string;
}

export function SingleMetricChart({
  title,
  formula,
  formulaNote,
  data,
  kind,
  formatValue,
  lineColor = "#10b981",
  height = 220,
  emptyMessage = "No data in this period",
}: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader action={<FormulaInfo formula={formula} note={formulaNote} />}>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex h-[120px] w-full items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground"
          >
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader action={<FormulaInfo formula={formula} note={formulaNote} />}>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
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
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatValue(v)}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(value: number) => formatValue(value)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
              />
              {kind === "bar" ? (
                <Bar
                  dataKey="value"
                  name={title}
                  fill="hsl(var(--foreground))"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  name={title}
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1.5, fill: lineColor }}
                  activeDot={{ r: 5 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
