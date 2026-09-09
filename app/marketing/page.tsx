import { DashboardShell } from "@/components/DashboardShell";
import { StatusBar } from "@/components/StatusBar";
import { getCachedSheet } from "@/lib/sheet";
import { getAnchorDate } from "@/lib/dateRanges";
import { MarketingDashboard } from "@/components/MarketingDashboard";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
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
      title="Marketing"
      subtitle="Acquisition channels, ad spend, and attributed revenue."
      sidebarMeta={sidebarMeta}
      statusBar={
        <StatusBar
          meta={data._meta}
          refreshError={snap.ok ? null : (snap.errorMessage ?? "unknown")}
          fetchDurationMs={snap.fetchDurationMs}
        />
      }
    >
      {data.af_daily.length === 0 && data._meta.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">No snapshot yet</div>
          <p className="mt-1">
            Use the refresh button at the top of the sidebar to fetch the
            Sheet snapshot for the first time.
          </p>
        </div>
      ) : (
        <MarketingDashboard data={data} anchor={anchor} />
      )}
    </DashboardShell>
  );
}
