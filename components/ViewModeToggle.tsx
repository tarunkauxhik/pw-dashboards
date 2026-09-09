"use client";

import { cn } from "@/lib/utils";

export type ViewMode = "overall" | "unique";

/**
 * Small 2-option segmented control for in-tile mode switching.
 * Visual style mirrors the toolbar's Gross/Net toggle but scaled down
 * to fit inside a KpiTile's top-right corner.
 */
export function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded border border-border/60 bg-background p-px"
      role="group"
      aria-label="Toggle between overall and unique metric"
    >
      {(["overall", "unique"] as const).map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={cn(
              "h-4 rounded-[3px] px-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors duration-150",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt === "overall" ? "Overall" : "Unique"}
          </button>
        );
      })}
    </div>
  );
}
