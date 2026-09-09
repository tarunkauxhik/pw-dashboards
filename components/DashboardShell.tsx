import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import type { StaleReason } from "@/lib/sheet";

export function DashboardShell({
  title,
  subtitle,
  statusBar,
  sidebarMeta,
  children,
}: {
  title: string;
  subtitle: string;
  statusBar?: ReactNode;
  sidebarMeta?: { lastRefreshedIso: string | null; stale: StaleReason };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar
        lastRefreshedIso={sidebarMeta?.lastRefreshedIso ?? null}
        stale={sidebarMeta?.stale ?? "never-fetched"}
      />
      <main className="flex-1 md:pl-[240px]">
        <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6 md:p-8">
          <Breadcrumbs title={title} />
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {statusBar}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
