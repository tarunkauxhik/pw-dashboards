"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  options: string[];
  excluded: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function SourceMultiSelect({ options, excluded, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle(opt: string) {
    const next = new Set(excluded);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    onChange(next);
  }

  const allChecked = excluded.size === 0;
  const badgeText = allChecked
    ? `all ${options.length}`
    : excluded.size === options.length
      ? "none"
      : `${options.length - excluded.size}/${options.length}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>Sources</span>
        <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-foreground tabular-nums">
          {badgeText}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-40 w-[260px] rounded-lg border border-border/60 bg-popover p-1.5 shadow-lg">
          <div className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Include in Collection
          </div>
          <ul role="listbox" className="max-h-[280px] overflow-auto">
            {options.map((opt) => {
              const checked = !excluded.has(opt);
              return (
                <li key={opt}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(opt)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      "hover:bg-muted/60",
                      checked && "text-foreground",
                      !checked && "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        checked
                          ? "border-foreground bg-foreground text-background"
                          : "border-border/60 bg-background",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="font-mono text-xs">{opt}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex items-center justify-between border-t border-border/60 px-2 pt-1.5">
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Include all
            </button>
            <button
              type="button"
              onClick={() => onChange(new Set(options))}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Exclude all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
