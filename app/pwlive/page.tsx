import { DashboardShell } from "@/components/DashboardShell";
import { StatusBar } from "@/components/StatusBar";
import { fetchSheetCached } from "@/lib/sheet";
import { computeFreshness } from "@/lib/freshness";
import { PwLiveDashboard } from "@/components/PwLiveDashboard";

export const dynamic = "force-dynamic";

export default async function PwLivePage() {
  const result = await fetchSheetCached();
  if (!result.ok || !result.data) {
    return (
      <DashboardShell
        title="pw.live"
        subtitle="Orders, funnel, and per-batch performance for pw.live."
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
  const anchorDate =
    data._meta.length > 0
      ? data._meta
          .map((m) => m.data_as_of_ist.slice(0, 10))
          .sort()
          .reverse()[0]
      : result.fetchedAtIso.slice(0, 10);
  const freshness = computeFreshness({
    ok: true,
    fetchedAtIso: result.fetchedAtIso,
    data: { _meta: data._meta },
  });

  return (
    <DashboardShell
      title="pw.live"
      subtitle="Orders, funnel, and per-batch performance for pw.live."
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
      {data.mb_pwlive_orders.length === 0 &&
      data.mb_pwlive_funnel.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">No pw.live data yet</div>
          <p className="mt-1">
            The Sheet API returned no rows for{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              mb_pwlive_*
            </code>
            . Hit the refresh button in the sidebar to retry.
          </p>
        </div>
      ) : (
        <PwLiveDashboard data={data} anchor={anchorDate} />
      )}
    </DashboardShell>
  );
}
