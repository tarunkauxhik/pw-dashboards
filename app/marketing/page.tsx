import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";
import { getSheetData } from "@/lib/sheet";
import { getAnchorDate } from "@/lib/dateRanges";
import { MarketingDashboard } from "@/components/MarketingDashboard";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  try {
    const data = await getSheetData();
    const anchor = getAnchorDate(data._meta);
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:pl-[240px]">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6 md:p-8">
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Marketing
                </h1>
                <p className="text-sm text-muted-foreground">
                  Acquisition channels, ad spend, and attributed revenue.
                </p>
              </div>
              <StatusBar meta={data._meta} />
            </header>
            <MarketingDashboard data={data} anchor={anchor} />
          </div>
        </main>
      </div>
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:pl-[240px]">
          <div className="mx-auto w-full max-w-[1400px] p-6 md:p-8">
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">Failed to load sheet data</div>
                <div className="mt-1 text-xs text-red-800/90">{msg}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
}
