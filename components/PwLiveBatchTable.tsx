"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { FormulaInfo } from "./FormulaInfo";
import { cn } from "@/lib/utils";
import { inr, intFmt } from "@/lib/format";
import { AlertTriangle } from "lucide-react";
import { type BatchPeriodStats } from "@/lib/metrics";
import { type PwLiveQaRow } from "@/types/sheet";

interface Props {
  rows: BatchPeriodStats[];
  qa: PwLiveQaRow[];
}

export function PwLiveBatchTable({ rows, qa }: Props) {
  const flaggedBatches = new Set(
    qa.filter((q) => q.orders_missing_price > 0).map((q) => q.batch_name),
  );

  return (
    <Card>
      <CardHeader
        action={
          <FormulaInfo
            formula="Σ orders per batch over selected window"
            note="Sorted by MTD Net Collection desc. A 0 means the batch had no sales in that window — that's a real, computed zero (PRD §5.3)."
          />
        }
      >
        <CardTitle>Per-Batch (YTD / MTD / D-1 / D-2 / D-3)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border/60">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left">
                  Batch
                </th>
                <th colSpan={2} className="px-3 py-2 text-right">
                  YTD
                </th>
                <th colSpan={2} className="px-3 py-2 text-right">
                  MTD
                </th>
                <th colSpan={2} className="px-3 py-2 text-right">
                  D-1
                </th>
                <th colSpan={2} className="px-3 py-2 text-right">
                  D-2
                </th>
                <th colSpan={2} className="px-3 py-2 text-right">
                  D-3
                </th>
              </tr>
              <tr className="border-b border-border/60 bg-muted/20 text-[11px] font-normal text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted/20" />
                <th className="px-3 py-1 text-right font-normal">Users</th>
                <th className="px-3 py-1 text-right font-normal">Net</th>
                <th className="px-3 py-1 text-right font-normal">Users</th>
                <th className="px-3 py-1 text-right font-normal">Net</th>
                <th className="px-3 py-1 text-right font-normal">Users</th>
                <th className="px-3 py-1 text-right font-normal">Net</th>
                <th className="px-3 py-1 text-right font-normal">Users</th>
                <th className="px-3 py-1 text-right font-normal">Net</th>
                <th className="px-3 py-1 text-right font-normal">Users</th>
                <th className="px-3 py-1 text-right font-normal">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No batches in this period.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const flagged = flaggedBatches.has(row.batchName);
                  return (
                    <tr
                      key={row.batchName}
                      className={cn(
                        "border-b border-border/30 last:border-0",
                        flagged &&
                          "bg-amber-50/40 dark:bg-amber-950/30",
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-card px-3 py-2 text-left">
                        <span className="inline-flex items-center gap-1.5">
                          {flagged && (
                            <span
                              title="This batch has at least one paid order with missing price data (qa.orders_missing_price > 0). Paid-user counts include them; revenue totals exclude them."
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <span className="font-medium">
                            {row.batchName}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {intFmt(row.ytd.paidUsers)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {inr(row.ytd.netCollection)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {intFmt(row.mtd.paidUsers)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {inr(row.mtd.netCollection)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {intFmt(row.d1.paidUsers)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {inr(row.d1.netCollection)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {intFmt(row.d2.paidUsers)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {inr(row.d2.netCollection)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {intFmt(row.d3.paidUsers)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {inr(row.d3.netCollection)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {flaggedBatches.size > 0 && (
          <p className="mt-3 text-[11px] text-amber-700">
            ⚠︎ Flagged batches have at least one paid order with missing
            price data (<code className="rounded bg-amber-100/60 px-1">
            qa.orders_missing_price &gt; 0
            </code>
            ). Paid-user counts include them; revenue totals exclude them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
