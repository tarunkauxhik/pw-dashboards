"use client";

import { cn } from "@/lib/utils";

interface Props {
  options: string[];
  value: string | "all";
  onChange: (next: string | "all") => void;
  /** Override the prefix label shown before the chips. Default: "FY". */
  label?: string;
}

export function FYPicker({ options, value, onChange, label = "FY" }: Props) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Chip
        active={value === "all"}
        onClick={() => onChange("all")}
        label="All"
      />
      {options.map((opt) => (
        <Chip
          key={opt}
          active={value === opt}
          onClick={() => onChange(opt)}
          label={opt}
        />
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
