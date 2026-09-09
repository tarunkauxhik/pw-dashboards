"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Period, PeriodKind } from "@/lib/dateRanges";
import { lastDayOfMonth } from "@/lib/dateRanges";

interface Props {
  value: Period;
  onChange: (next: Period) => void;
  /** Available months for the "Month" picker. */
  monthOptions: string[];
  /** Available financial-year start years for the "YTD" picker. */
  fyOptions: number[];
  /** Anchor date — the most recent data_as_of date. */
  anchor: string;
}

export function PeriodSelector({
  value,
  onChange,
  monthOptions,
  fyOptions,
  anchor,
}: Props) {
  const [open, setOpen] = useState<PeriodKind | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div
      ref={ref}
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Period
      </span>
      <QuickButton
        active={value.kind === "last7"}
        onClick={() => {
          onChange({ kind: "last7" });
          setOpen(null);
        }}
      >
        Last 7 days
      </QuickButton>
      <QuickButton
        active={value.kind === "thisMonth"}
        onClick={() => {
          onChange({ kind: "thisMonth" });
          setOpen(null);
        }}
      >
        This Month (MTD)
      </QuickButton>
      <QuickButton
        active={value.kind === "prevMonth"}
        onClick={() => {
          onChange({ kind: "prevMonth" });
          setOpen(null);
        }}
      >
        Prev Month
      </QuickButton>

      <DropdownTrigger
        active={value.kind === "month"}
        open={open === "month"}
        label="Month"
        valueLabel={
          value.kind === "month" ? humanMonth(value.ym) : "Select month"
        }
        onClick={() => setOpen(open === "month" ? null : "month")}
      />
      <DropdownTrigger
        active={value.kind === "ytd"}
        open={open === "ytd"}
        label="YTD"
        valueLabel={
          value.kind === "ytd"
            ? `FY ${String(value.fyStartYear).slice(-2)}-${String((value.fyStartYear + 1) % 100).padStart(2, "0")}`
            : "Select FY"
        }
        onClick={() => setOpen(open === "ytd" ? null : "ytd")}
      />
      <DropdownTrigger
        active={value.kind === "custom"}
        open={open === "custom"}
        label="Custom"
        valueLabel={
          value.kind === "custom"
            ? `${value.from} → ${value.to}`
            : "Pick dates"
        }
        onClick={() => setOpen(open === "custom" ? null : "custom")}
      />

      {open === "month" && (
        <Popover onClose={() => setOpen(null)}>
          <MonthPicker
            options={monthOptions}
            current={value.kind === "month" ? value.ym : undefined}
            anchor={anchor}
            onPick={(ym) => {
              onChange({ kind: "month", ym });
              setOpen(null);
            }}
          />
        </Popover>
      )}

      {open === "ytd" && (
        <Popover onClose={() => setOpen(null)}>
          <YTDPicker
            options={fyOptions}
            current={value.kind === "ytd" ? value.fyStartYear : undefined}
            onPick={(fyStartYear) => {
              onChange({ kind: "ytd", fyStartYear });
              setOpen(null);
            }}
          />
        </Popover>
      )}

      {open === "custom" && (
        <Popover onClose={() => setOpen(null)}>
          <CustomRangePicker
            anchor={anchor}
            current={
              value.kind === "custom" ? { from: value.from, to: value.to } : null
            }
            minDate={
              monthOptions.length > 0
                ? `${monthOptions[0]}-01`
                : undefined
            }
            onApply={(from, to) => {
              if (from > to) return;
              onChange({ kind: "custom", from, to });
              setOpen(null);
            }}
          />
        </Popover>
      )}
    </div>
  );
}

function QuickButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
      {children}
    </button>
  );
}

function DropdownTrigger({
  active,
  open,
  label,
  valueLabel,
  onClick,
}: {
  active: boolean;
  open: boolean;
  label: string;
  valueLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      <Calendar className="h-3 w-3" />
      <span>{label}:</span>
      <span className={cn("tabular-nums", !active && "text-foreground")}>
        {valueLabel}
      </span>
      <ChevronDown
        className={cn(
          "h-3 w-3 transition-transform duration-150",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

function Popover({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-md border border-border/60 bg-popover p-3 text-foreground shadow-lg"
    >
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      {children}
    </div>
  );
}

function humanMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function MonthPicker({
  options,
  current,
  anchor,
  onPick,
}: {
  options: string[];
  current: string | undefined;
  anchor: string;
  onPick: (ym: string) => void;
}) {
  // Build the list to display: distinct months present in data, plus
  // the current month (anchor's month) even if not in data, so users
  // can always pick "the current one". Always show month options in
  // reverse-chronological order.
  const [yAnchor, mAnchor] = anchor.split("-").map(Number);
  const currentYm = `${yAnchor}-${String(mAnchor).padStart(2, "0")}`;
  const list = useMemo(() => {
    const set = new Set(options);
    set.add(currentYm);
    return [...set].sort().reverse();
  }, [options, currentYm]);

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Pick a calendar month
      </div>
      <ul className="max-h-[260px] space-y-0.5 overflow-auto pr-1">
        {list.map((ym) => (
          <li key={ym}>
            <button
              type="button"
              onClick={() => onPick(ym)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                current === ym
                  ? "bg-foreground text-background"
                  : "hover:bg-muted/60",
              )}
            >
              <span>{humanMonth(ym)}</span>
              <span className="text-[10px] tabular-nums opacity-70">
                {lastDayOfMonth(ym)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function YTDPicker({
  options,
  current,
  onPick,
}: {
  options: number[];
  current: number | undefined;
  onPick: (fyStartYear: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Pick a financial year
      </div>
      <ul className="max-h-[260px] space-y-0.5 overflow-auto pr-1">
        {options.map((y) => (
          <li key={y}>
            <button
              type="button"
              onClick={() => onPick(y)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                current === y
                  ? "bg-foreground text-background"
                  : "hover:bg-muted/60",
              )}
            >
              <span className="tabular-nums">
                FY {String(y).slice(-2)}-{String((y + 1) % 100).padStart(2, "0")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CustomRangePicker({
  anchor,
  current,
  minDate,
  onApply,
}: {
  anchor: string;
  current: { from: string; to: string } | null;
  minDate: string | undefined;
  onApply: (from: string, to: string) => void;
}) {
  const [from, setFrom] = useState<string>(current?.from ?? anchor);
  const [to, setTo] = useState<string>(current?.to ?? anchor);

  // Sync local state when current prop changes (e.g. when re-opening)
  useEffect(() => {
    if (current) {
      setFrom(current.from);
      setTo(current.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.from, current?.to]);

  const invalid = from > to;

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Custom date range
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From">
          <input
            type="date"
            value={from}
            min={minDate}
            max={anchor}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 w-full rounded-md border border-border/60 bg-background px-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            value={to}
            min={minDate}
            max={anchor}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 w-full rounded-md border border-border/60 bg-background px-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
      </div>
      {invalid && (
        <p className="text-[11px] text-rose-600">
          From date must be on or before To date.
        </p>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const last7 = addDays(anchor, -6);
            setFrom(last7);
            setTo(anchor);
          }}
          className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Last 7 days
        </button>
        <button
          type="button"
          disabled={invalid}
          onClick={() => onApply(from, to)}
          className={cn(
            "h-7 rounded-md border px-3 text-xs font-medium transition-colors",
            invalid
              ? "cursor-not-allowed border-border/60 bg-muted text-muted-foreground"
              : "border-foreground bg-foreground text-background hover:opacity-90",
          )}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
