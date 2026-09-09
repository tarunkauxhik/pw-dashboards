"use client";

import { cn } from "@/lib/utils";

export type PeriodKind = "last7" | "last30" | "thisMonth";

const OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
];

export function PeriodSelector({
  value,
  onChange,
}: {
  value: PeriodKind;
  onChange: (next: PeriodKind) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border/60 bg-background p-0.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-7 rounded-[5px] px-3 transition-colors duration-150",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
