import { Suspense } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusBar } from "@/components/StatusBar";
import { getSheetData } from "@/lib/sheet";
import { getAnchorDate } from "@/lib/dateRanges";
import { BusinessDashboard } from "@/components/BusinessDashboard";
import {
  SkeletonBigChart,
  SkeletonChartRow,
  SkeletonKpiRow,
  SkeletonRow,
} from "@/components/DashboardSkeletons";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

function BusinessFallback() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
        <SkeletonRow widthClass="w-64" className="h-7" />
        <div className="flex gap-3">
          <SkeletonRow widthClass="w-28" className="h-7" />
          <SkeletonRow widthClass="w-44" className="h-7" />
        </div>
      </div>
      <SkeletonKpiRow count={6} />
      <SkeletonKpiRow count={4} />
      <SkeletonChartRow count={3} />
      <SkeletonKpiRow count={1} />
    </div>
  );
}

async function BusinessBody() {
  try {
    const data = await getSheetData();
    const anchor = getAnchorDate(data._meta);
    return (
      <>
        <div className="flex justify-end">
          <StatusBar meta={data._meta} />
        </div>
        <BusinessDashboard data={data} anchor={anchor} />
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

export default function BusinessPage() {
  return (
    <DashboardShell
      title="Business"
      subtitle="Orders, signups, pricing, and buyer behavior for GyaanE."
    >
      <Suspense fallback={<BusinessFallback />}>
        <BusinessBody />
      </Suspense>
    </DashboardShell>
  );
}
