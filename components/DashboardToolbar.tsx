"use client";

import { useMemo, useState } from "react";
import { PeriodSelector, type PeriodKind } from "./PeriodSelector";
import { GrossNetToggle, type GrossNet } from "./GrossNetToggle";
import { SourceMultiSelect } from "./SourceMultiSelect";
import type { Period } from "@/lib/dateRanges";

interface Props {
  sourceOptions: string[];
  defaultExcluded: string[];
  showGrossNet?: boolean;
  showSources?: boolean;
  children: (ctx: {
    period: Period;
    grossNet: GrossNet;
    includeSources: Set<string>;
  }) => React.ReactNode;
}

export function DashboardToolbar({
  sourceOptions,
  defaultExcluded,
  showGrossNet = true,
  showSources = sourceOptions.length > 0,
  children,
}: Props) {
  const [periodKind, setPeriodKind] = useState<PeriodKind>("last30");
  const period: Period = useMemo(
    () =>
      periodKind === "last7"
        ? { kind: "last7" }
        : periodKind === "last30"
          ? { kind: "last30" }
          : { kind: "thisMonth" },
    [periodKind],
  );
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
    () => ({ period, grossNet, includeSources }),
    [period, grossNet, includeSources],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
        <PeriodSelector value={periodKind} onChange={setPeriodKind} />
        <div className="flex items-center gap-4">
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
