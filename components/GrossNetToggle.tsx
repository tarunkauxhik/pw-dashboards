"use client";

import { cn } from "@/lib/utils";

export type GrossNet = "gross" | "net";

export function GrossNetToggle({
  value,
  onChange,
}: {
  value: GrossNet;
  onChange: (next: GrossNet) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        Collection
      </span>
      <div className="inline-flex rounded-md border border-border/60 bg-background p-0.5">
        {(["gross", "net"] as const).map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "h-7 rounded-[5px] px-3 text-xs font-medium uppercase tracking-wider transition-colors duration-150",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt === "gross" ? "Gross" : "Net"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
