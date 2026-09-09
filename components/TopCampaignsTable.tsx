"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { FormulaInfo } from "./FormulaInfo";
import { cn } from "@/lib/utils";
import { inr, intFmt, pct } from "@/lib/format";
import { topCampaigns, type PushSortKey } from "@/lib/metrics";
import type { PushRow } from "@/types/sheet";

const DEFAULT_LIMIT = 15;
const EXTENDED_LIMIT = 250;
const SORT_LABELS: Record<PushSortKey, string> = {
  attributed_revenue: "Attributed Revenue",
  converted_users: "Converted Users",
  sent: "Sent",
  unique_clicks: "Unique Clicks",
  ctr: "CTR",
};

type SortDir = "asc" | "desc";

export function TopCampaignsTable({ rows }: { rows: PushRow[] }) {
  const [sortKey, setSortKey] = useState<PushSortKey>("attributed_revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAll, setShowAll] = useState(false);

  const data = useMemo(() => {
    return topCampaigns(rows, sortKey, showAll ? EXTENDED_LIMIT : DEFAULT_LIMIT);
    // PushSortKey changes drive limit only; sortKey isn't applied twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir, showAll]);

  const totalCount = useMemo(
    () => topCampaigns(rows, sortKey, EXTENDED_LIMIT).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, sortKey],
  );

  function toggleSort(key: PushSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "ctr" || key === "sent" || key === "unique_clicks"
          ? "desc"
          : "desc",
      );
    }
  }

  return (
    <Card>
      <CardHeader
        action={
          <FormulaInfo
            formula="Σ mb_push_daily.* per campaign"
            note="Zero-send rows excluded. Same campaign across multiple days aggregated."
          />
        }
      >
        <CardTitle>Top Campaigns</CardTitle>
        <CardDescription>
          Sorted by {SORT_LABELS[sortKey]} {sortDir === "asc" ? "↑" : "↓"} ·
          showing {data.length} of {totalCount} active campaign
          {totalCount === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTh
                active={sortKey === "attributed_revenue"}
                dir={sortDir}
                onClick={() => toggleSort("attributed_revenue")}
              >
                Campaign
              </SortableTh>
              <SortableTh
                active={sortKey === "sent"}
                dir={sortDir}
                onClick={() => toggleSort("sent")}
              >
                Sent
              </SortableTh>
              <SortableTh
                active={sortKey === "unique_clicks"}
                dir={sortDir}
                onClick={() => toggleSort("unique_clicks")}
              >
                Unique Clicks
              </SortableTh>
              <SortableTh
                active={sortKey === "ctr"}
                dir={sortDir}
                onClick={() => toggleSort("ctr")}
              >
                CTR
              </SortableTh>
              <SortableTh
                active={sortKey === "converted_users"}
                dir={sortDir}
                onClick={() => toggleSort("converted_users")}
              >
                Converted Users
              </SortableTh>
              <SortableTh
                active={sortKey === "attributed_revenue"}
                dir={sortDir}
                onClick={() => toggleSort("attributed_revenue")}
              >
                Attributed Revenue
              </SortableTh>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No campaigns with sends in this period
                </TableCell>
              </TableRow>
            ) : (
              data.map((r) => (
                <TableRow key={r.campaign_name}>
                  <TableCell className="font-medium">
                    <div className="truncate max-w-[280px]" title={r.campaign_name}>
                      {r.campaign_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {intFmt(r.sent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {intFmt(r.unique_clicks)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(r.ctr, 2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {intFmt(r.converted_users)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {inr(r.attributed_revenue)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalCount > DEFAULT_LIMIT && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {showAll
                ? `Show only top ${DEFAULT_LIMIT}`
                : `Show all ${totalCount} active campaigns`}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SortableTh({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <TableHead className="text-right">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {children}
        <span aria-hidden>{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </TableHead>
  );
}
