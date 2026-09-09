import { cn } from "@/lib/utils";

export function SkeletonKpiRow({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border/60 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-7 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChartRow({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-[200px] w-full animate-pulse rounded bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonBigChart() {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
      )}
    >
      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-[260px] w-full animate-pulse rounded bg-muted/40" />
    </div>
  );
}

export function SkeletonRow({
  className,
  widthClass = "w-full",
}: {
  className?: string;
  widthClass?: string;
}) {
  return (
    <div
      className={cn(
        "h-3 animate-pulse rounded bg-muted",
        widthClass,
        className,
      )}
    />
  );
}
