"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  formula: string;
  /** Optional supplemental note that appears under the formula. */
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
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute right-0 top-full z-50 mt-1.5 w-[260px] rounded-md border border-border/60 bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg"
        >
          <span className="block font-mono text-[11px] text-foreground">
            {formula}
          </span>
          {note && (
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {note}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
