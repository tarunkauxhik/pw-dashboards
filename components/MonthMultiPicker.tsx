"use client";

import { cn } from "@/lib/utils";

interface Props {
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Override the prefix label. Default: "Months". */
  label?: string;
}

export function MonthMultiPicker({
  options,
  selected,
  onChange,
  label = "Months",
}: Props) {
  function toggle(opt: string) {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    onChange(next);
  }

  const allOn = selected.size === options.length;
  const noneOn = selected.size === 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(new Set(options))}
        className={cn(
          "h-7 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150",
          allOn
            ? "border-foreground bg-foreground text-background"
            : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        All
      </button>
      <button
        type="button"
        onClick={() => onChange(new Set())}
        className={cn(
          "h-7 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150",
          noneOn
            ? "border-foreground bg-foreground text-background"
            : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        None
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cn(
            "h-7 rounded-md border px-2 text-xs font-medium transition-colors duration-150 tabular-nums",
            selected.has(opt)
              ? "border-foreground bg-foreground text-background"
              : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
