"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Megaphone,
  Bell,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/business", label: "Business", icon: Gauge },
  { href: "/marketing", label: "Marketing", icon: BarChart3 },
  { href: "/push", label: "Push", icon: Megaphone },
] as const;

export function Sidebar() {
  const pathname = usePathname();
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
