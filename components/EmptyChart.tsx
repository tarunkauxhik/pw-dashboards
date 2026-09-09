import { cn } from "@/lib/utils";

export function EmptyChart({
  message = "No data in this period",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[200px] w-full items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground",
        className,
      )}
    >
      {message}
    </div>
  );
}
