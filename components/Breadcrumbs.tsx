"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = {
  "/business": "Business",
  "/marketing": "Marketing",
  "/push": "Push",
};

export function Breadcrumbs({ title }: { title: string }) {
  const pathname = usePathname();
  const crumb = TITLES[pathname] ?? title;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-xs text-muted-foreground"
    >
      <Link
        href="/business"
        className="transition-colors hover:text-foreground"
      >
        GyaanE
      </Link>
      <ChevronRight className="h-3 w-3" />
      <span className={cn("text-foreground")}>{crumb}</span>
    </nav>
  );
}
