"use client";

import { useMemo, useState } from "react";
import { PeriodSelector } from "./PeriodSelector";
import { GrossNetToggle, type GrossNet } from "./GrossNetToggle";
import { SourceMultiSelect } from "./SourceMultiSelect";
import {
  distinctFYs,
  distinctMonths,
  getAnchorDate,
  type Period,
} from "@/lib/dateRanges";
import type { SheetData } from "@/types/sheet";

interface Props {
  data: SheetData;
  sourceOptions: string[];
  defaultExcluded: string[];
  showGrossNet?: boolean;
  showSources?: boolean;
  children: (ctx: {
    period: Period;
    grossNet: GrossNet;
    includeSources: Set<string>;
    anchor: string;
  }) => React.ReactNode;
}

export function DashboardToolbar({
  data,
  sourceOptions,
  defaultExcluded,
  showGrossNet = true,
  showSources = sourceOptions.length > 0,
  children,
}: Props) {
  const anchor = useMemo(() => {
    try {
      return getAnchorDate(data._meta);
    } catch {
      // Fall back to "today" if _meta is empty or all non-OK.
      return new Date().toISOString().slice(0, 10);
    }
  }, [data._meta]);

  const monthOptions = useMemo(() => distinctMonths(data.mb_orders), [
    data.mb_orders,
  ]);
  const fyOptions = useMemo(() => distinctFYs(data.mb_orders), [data.mb_orders]);

  const [period, setPeriod] = useState<Period>({ kind: "last7" });
  const [grossNet, setGrossNet] = useState<GrossNet>("net");
  const initiallyExcluded = useMemo(
    () => new Set(sourceOptions.filter((s) => defaultExcluded.includes(s))),
    [sourceOptions, defaultExcluded],
  );
  const [excludedSources, setExcludedSources] =
    useState<Set<string>>(initiallyExcluded);
  const includeSources = useMemo(() => {
    const out = new Set<string>();
    for (const s of sourceOptions) if (!excludedSources.has(s)) out.add(s);
    return out;
  }, [sourceOptions, excludedSources]);

  const ctx = useMemo(
    () => ({ period, grossNet, includeSources, anchor }),
    [period, grossNet, includeSources, anchor],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          monthOptions={monthOptions}
          fyOptions={fyOptions}
          anchor={anchor}
        />
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Anchor: <span className="font-medium text-foreground">{anchor}</span> IST
          </span>
          {showGrossNet && (
            <GrossNetToggle value={grossNet} onChange={setGrossNet} />
          )}
          {showSources && (
            <SourceMultiSelect
              options={sourceOptions}
              excluded={excludedSources}
              onChange={setExcludedSources}
            />
          )}
        </div>
      </div>
      {children(ctx)}
    </div>
  );
}
