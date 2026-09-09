import { cn } from "@/lib/utils";
import { FormulaInfo } from "./FormulaInfo";

interface Delta {
  text: string;
  tone: "up" | "down" | "flat";
}

interface Props {
  label: string;
  value: string;
  delta?: Delta | null;
  hint?: string;
  emphasis?: "primary" | "secondary";
  formula?: string;
  formulaNote?: string;
}

export function KpiTile({
  label,
  value,
  delta,
  hint,
  emphasis = "primary",
  formula,
  formulaNote,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-4 transition-shadow",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {formula && (
          <FormulaInfo formula={formula} note={formulaNote} className="shrink-0" />
        )}
      </div>
      <div
        className={cn(
          "mt-1.5 tabular-nums tracking-tight",
          emphasis === "primary"
            ? "text-3xl font-semibold"
            : "text-xl font-semibold",
        )}
      >
        {value}
      </div>
      <div className="mt-1 flex h-4 items-center gap-2 text-[11px]">
        {delta ? (
          <span
            className={cn(
              "font-medium",
              delta.tone === "up" && "text-emerald-600",
              delta.tone === "down" && "text-rose-600",
              delta.tone === "flat" && "text-muted-foreground",
            )}
          >
            {delta.text}
          </span>
        ) : (
          <span className="text-muted-foreground/70">vs prior period</span>
        )}
        {hint && (
          <span className="truncate text-muted-foreground/80" title={hint}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
