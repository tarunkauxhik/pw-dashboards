import { DashboardShell } from "@/components/DashboardShell";
import { StatusBar } from "@/components/StatusBar";
import { getCachedSheet, computeFreshness } from "@/lib/sheet";
import { MarketingDashboard } from "@/components/MarketingDashboard";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const snap = await getCachedSheet();
  const data = snap.data;
  const freshness = computeFreshness(snap);
  const anchor =
    freshness.anchorDate ??
    (snap.fetchedAtIso.slice(0, 10) || "1970-01-01");

  return (
    <DashboardShell
      title="Marketing"
      subtitle="Acquisition channels, ad spend, and attributed revenue."
      sidebarMeta={{
        lastRefreshedIso: snap.ok ? snap.fetchedAtIso : null,
        stale: freshness.staleReason,
        sourceFailed: freshness.sourceFailed,
        isBehindSchedule: freshness.isBehindSchedule,
      }}
      statusBar={
        <StatusBar
          meta={data._meta}
          refreshError={snap.ok ? null : (snap.errorMessage ?? "unknown")}
          fetchDurationMs={snap.fetchDurationMs}
          sourceFailed={freshness.sourceFailed}
          isBehindSchedule={freshness.isBehindSchedule}
          anchorDate={freshness.anchorDate}
          expectedThrough={freshness.expectedThrough}
        />
      }
    >
      {data.af_daily.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">No data yet</div>
          <p className="mt-1">
            Hit the refresh button in the sidebar to fetch the first snapshot.
          </p>
        </div>
      ) : (
        <MarketingDashboard data={data} anchor={anchor} />
      )}
    </DashboardShell>
  );
}
