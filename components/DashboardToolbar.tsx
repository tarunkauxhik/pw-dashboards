"use client";

import { useMemo, useState } from "react";
import { PeriodSelector, type PeriodKind } from "./PeriodSelector";
import { GrossNetToggle, type GrossNet } from "./GrossNetToggle";
import { IncludeAdminToggle } from "./IncludeAdminToggle";
import type { Period } from "@/lib/dateRanges";

interface Props {
  children: (ctx: {
    period: Period;
    grossNet: GrossNet;
    includeAdmin: boolean;
  }) => React.ReactNode;
}

export function DashboardToolbar({ children }: Props) {
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
  const [grossNet, setGrossNet] = useState<GrossNet>("gross");
  const [includeAdmin, setIncludeAdmin] = useState(false);

  const ctx = useMemo(
    () => ({ period, grossNet, includeAdmin }),
    [period, grossNet, includeAdmin],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
        <PeriodSelector value={periodKind} onChange={setPeriodKind} />
        <div className="flex items-center gap-4">
          <GrossNetToggle value={grossNet} onChange={setGrossNet} />
          <IncludeAdminToggle
            checked={includeAdmin}
            onChange={setIncludeAdmin}
          />
        </div>
      </div>
      {children(ctx)}
    </div>
  );
}
