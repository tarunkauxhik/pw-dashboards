import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBar } from "@/components/StatusBar";
import { getSheetData } from "@/lib/sheet";
import { getAnchorDate } from "@/lib/dateRanges";
import { MarketingDashboard } from "@/components/MarketingDashboard";
import {
  SkeletonBigChart,
  SkeletonKpiRow,
  SkeletonRow,
} from "@/components/DashboardSkeletons";

export const dynamic = "force-dynamic";

function MarketingFallback() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
        <SkeletonRow widthClass="w-64" className="h-7" />
        <div className="flex gap-3">
          <SkeletonRow widthClass="w-28" className="h-7" />
          <SkeletonRow widthClass="w-44" className="h-7" />
        </div>
      </div>
      <SkeletonKpiRow count={4} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <SkeletonRow widthClass="w-40" />
          <div className="mt-4 h-[260px] w-full animate-pulse rounded bg-muted/40" />
        </div>
        <SkeletonBigChart />
      </div>
      <SkeletonBigChart />
    </div>
  );
}

async function MarketingBody() {
  try {
    const data = await getSheetData();
    const anchor = getAnchorDate(data._meta);
    return (
      <>
        <div className="flex justify-end">
          <StatusBar meta={data._meta} />
        </div>
        <MarketingDashboard data={data} anchor={anchor} />
      </>
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-medium">Failed to load sheet data</div>
          <div className="mt-1 text-xs text-red-800/90">{msg}</div>
        </div>
      </div>
    );
  }
}

export default function MarketingPage() {
  return (
    <DashboardShell
      title="Marketing"
      subtitle="Acquisition channels, ad spend, and attributed revenue."
    >
      <Suspense fallback={<MarketingFallback />}>
        <MarketingBody />
      </Suspense>
    </DashboardShell>
  );
}
