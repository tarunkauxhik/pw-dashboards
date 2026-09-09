import { DashboardShell } from "@/components/DashboardShell";
import { StatusBar } from "@/components/StatusBar";
import { getCachedSheet } from "@/lib/sheet";
import { getAnchorDate } from "@/lib/dateRanges";
import { BusinessDashboard } from "@/components/BusinessDashboard";

export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  const snap = await getCachedSheet();
  const data = snap.data;
  const anchor =
    data._meta.length > 0
      ? getAnchorDate(data._meta)
      : snap.fetchedAtIso.slice(0, 10);
  const sidebarMeta = {
    lastRefreshedIso: snap.ok ? snap.fetchedAtIso : null,
    isStale: !snap.ok || data._meta.some((m) => m.status !== "OK"),
  };

  return (
    <DashboardShell
      title="Business"
      subtitle="Orders, signups, pricing, and buyer behavior for GyaanE."
      sidebarMeta={sidebarMeta}
      statusBar={
        <StatusBar
          meta={data._meta}
          refreshError={snap.ok ? null : (snap.errorMessage ?? "unknown")}
          fetchDurationMs={snap.fetchDurationMs}
        />
      }
    >
      {data.mb_orders.length === 0 && data._meta.length === 0 ? (
        <FirstRunNotice />
      ) : (
        <BusinessDashboard data={data} anchor={anchor} />
      )}
    </DashboardShell>
  );
}

function FirstRunNotice() {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
      <div className="font-medium text-foreground">
        No snapshot yet
      </div>
      <p className="mt-1">
        This dashboard reads from a local cache. The first refresh takes one
        round-trip to the Sheet API. Use the refresh button at the top of the
        sidebar to populate the cache.
      </p>
    </div>
  );
}
