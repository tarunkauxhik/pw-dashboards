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
import { cn } from "@/lib/utils";
import { inr, intFmt, pct } from "@/lib/format";
import type { AppsFlyerRow } from "@/types/sheet";

type SortKey = "media_source" | "installs" | "cost" | "ctr";
type SortDir = "asc" | "desc";

export function ChannelTable({ rows }: { rows: AppsFlyerRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const aggregated = useMemo(() => {
    const map = new Map<string, { installs: number; cost: number; impressions: number; clicks: number }>();
    for (const r of rows) {
      const cur = map.get(r.media_source) ?? {
        installs: 0,
        cost: 0,
        impressions: 0,
        clicks: 0,
      };
      cur.installs += r.installs;
      cur.cost += r.cost_inr;
      cur.impressions += r.impressions;
      cur.clicks += r.clicks;
      map.set(r.media_source, cur);
    }
    return [...map.entries()].map(([media_source, v]) => ({
      media_source,
      installs: v.installs,
      cost: v.cost,
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: v.impressions === 0 ? 0 : v.clicks / v.impressions,
    }));
  }, [rows]);

  const sorted = useMemo(() => {
    const copy = [...aggregated];
    copy.sort((a, b) => {
      const av: number | string = a[sortKey];
      const bv: number | string = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [aggregated, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "media_source" ? "asc" : "desc");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Performance</CardTitle>
        <CardDescription>
          Some rows above are promotional coupon codes (e.g. SPIN15,
          JANMASHTAMI) that have leaked into channel attribution — a known
          tracking bug, not a real acquisition channel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton
                  active={sortKey === "media_source"}
                  dir={sortDir}
                  onClick={() => toggleSort("media_source")}
                >
                  Media Source
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton
                  active={sortKey === "installs"}
                  dir={sortDir}
                  onClick={() => toggleSort("installs")}
                >
                  Installs
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton
                  active={sortKey === "cost"}
                  dir={sortDir}
                  onClick={() => toggleSort("cost")}
                >
                  Cost
                </SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton
                  active={sortKey === "ctr"}
                  dir={sortDir}
                  onClick={() => toggleSort("ctr")}
                >
                  CTR
                </SortButton>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  —
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => (
                <TableRow key={r.media_source}>
                  <TableCell className="font-medium">{r.media_source}</TableCell>
                  <TableCell className="text-right">
                    {intFmt(r.installs)}
                  </TableCell>
                  <TableCell className="text-right">{inr(r.cost)}</TableCell>
                  <TableCell className="text-right">{pct(r.ctr, 2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SortButton({
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <span aria-hidden>{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}
