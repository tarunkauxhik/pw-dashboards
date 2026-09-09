"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Megaphone,
  Bell,
  Gauge,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/business", label: "Business", icon: Gauge },
  { href: "/marketing", label: "Marketing", icon: BarChart3 },
  { href: "/push", label: "Push", icon: Megaphone },
] as const;

export function Sidebar({
  lastRefreshedIso,
  isStale,
}: {
  lastRefreshedIso: string | null;
  isStale: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  const [tickNow, setTickNow] = useState<number>(Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setTickNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => {
    startTransition(async () => {
      const t0 = Date.now();
      const res = await fetch("/api/sheet-refresh", { method: "POST" });
      await res.json().catch(() => null);
      const elapsed = Date.now() - t0;
      // Always revalidate, regardless of success/failure.
      router.refresh();
      console.info(
        `[refresh] ${res.ok ? "ok" : "fail"} in ${elapsed}ms`,
      );
    });
  };

  const refreshedLabel =
    lastRefreshedIso && now !== null
      ? formatRelative(lastRefreshedIso, now)
      : "loading…";

  void tickNow; // re-trigger relative format on interval

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border/60 bg-card/30 backdrop-blur md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-5">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold tracking-tight">
          GyaanE Dashboards
        </span>
        <span className="ml-auto rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          v1
        </span>
      </div>
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-1.5 w-1.5 rounded-full",
              isStale
                ? "bg-amber-500"
                : lastRefreshedIso
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/40",
            )}
            aria-hidden
          />
          <span className="text-xs font-medium tracking-tight">
            {isStale ? "Stale snapshot" : "Snapshot fresh"}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={pending}
            aria-label="Refresh data"
            className={cn(
              "ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors duration-150",
              "hover:bg-muted hover:text-foreground",
              "disabled:opacity-50",
            )}
          >
            <RefreshCw
              className={cn("h-3 w-3", pending && "animate-spin")}
              aria-hidden
            />
          </button>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {lastRefreshedIso ? `Refreshed ${refreshedLabel}` : "—"}
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (pathname?.startsWith(item.href + "/") ?? false);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors duration-200",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-4 text-[11px] leading-relaxed text-muted-foreground">
        Read-only internal tool.
        <br />
        IST dates · single data source.
      </div>
    </aside>
  );
}

function formatRelative(iso: string, nowMs: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const sec = Math.max(0, Math.round((nowMs - t) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}
