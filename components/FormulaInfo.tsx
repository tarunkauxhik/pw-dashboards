"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  formula: string;
  /** Optional supplemental note shown below the formula. */
  note?: string;
  /** Override the icon's aria-label. Default is "Show formula". */
  label?: string;
  className?: string;
}

export function FormulaInfo({ formula, note, label, className }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label ?? "Show formula"}
        aria-describedby={id}
        className="inline-flex h-3 w-3 items-center justify-center text-muted-foreground/70 transition-colors duration-150 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        <Info className="h-2.5 w-2.5" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute right-0 top-full z-50 mt-1 w-[180px] rounded border border-border/60 bg-popover px-2 py-1 text-[10px] leading-snug text-popover-foreground shadow-md"
        >
          <span className="block font-medium text-foreground">{formula}</span>
          {note && (
            <span className="mt-0.5 block text-muted-foreground">{note}</span>
          )}
        </span>
      )}
    </span>
  );
}
