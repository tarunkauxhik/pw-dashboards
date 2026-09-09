import { DashboardShell } from "@/components/DashboardShell";
import { StatusBar } from "@/components/StatusBar";
import { fetchSheetCached } from "@/lib/sheet";
import { computeFreshness } from "@/lib/freshness";
import { BusinessDashboard } from "@/components/BusinessDashboard";

export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  const result = await fetchSheetCached();
  if (!result.ok || !result.data) {
    return (
      <DashboardShell
        title="Business"
        subtitle="Orders, signups, pricing, and buyer behavior for GyaanE."
        sidebarMeta={{
          lastRefreshedIso: null,
          stale: "fetch-failed",
          sourceFailed: false,
          isBehindSchedule: false,
        }}
        statusBar={
          <StatusBar
            meta={[]}
            refreshError={result.errorMessage ?? "Sheet API unreachable"}
            fetchDurationMs={result.fetchDurationMs}
            sourceFailed={false}
            isBehindSchedule={false}
            anchorDate={null}
            expectedThrough={null}
          />
        }
      >
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          <div className="font-medium">Failed to load sheet data</div>
          <p className="mt-1 text-xs text-red-800/90">
            {result.errorMessage ?? "Unknown error"}.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const data = result.data;
  const freshness = computeFreshness({
    ok: true,
    fetchedAtIso: result.fetchedAtIso,
    data: { _meta: data._meta },
  });

  return (
    <DashboardShell
      title="Business"
      subtitle="Orders, signups, pricing, and buyer behavior for GyaanE."
      sidebarMeta={{
        lastRefreshedIso: result.fetchedAtIso,
        stale: freshness.staleReason,
        sourceFailed: freshness.sourceFailed,
        isBehindSchedule: freshness.isBehindSchedule,
      }}
      statusBar={
        <StatusBar
          meta={data._meta}
          refreshError={null}
          fetchDurationMs={result.fetchDurationMs}
          sourceFailed={freshness.sourceFailed}
          isBehindSchedule={freshness.isBehindSchedule}
          anchorDate={freshness.anchorDate}
          expectedThrough={freshness.expectedThrough}
        />
      }
    >
      {data.mb_orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">No data yet</div>
          <p className="mt-1">
            The Sheet API returned empty rows. Check the Apps Script log or
            hit the refresh button in the sidebar.
          </p>
        </div>
      ) : (
        <BusinessDashboard data={data} />
      )}
    </DashboardShell>
  );
}

