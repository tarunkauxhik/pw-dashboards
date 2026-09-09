import type { MetaRow } from "@/types/sheet";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  meta: MetaRow[];
  refreshError?: string | null;
  fetchDurationMs?: number;
  sourceFailed: boolean;
  isBehindSchedule: boolean;
  anchorDate: string | null;
  expectedThrough: string | null;
}

export function StatusBar({
  meta,
  refreshError,
  fetchDurationMs,
  sourceFailed,
  isBehindSchedule,
  anchorDate,
  expectedThrough,
}: Props) {
  if (refreshError) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <div className="font-medium">Last refresh failed</div>
          <div className="mt-0.5 text-amber-800/90">{refreshError}</div>
          <div className="mt-1 text-[11px] text-amber-700/80">
            Showing the last good snapshot. Hit refresh in the sidebar to retry.
          </div>
        </div>
      </div>
    );
  }

  const failed = meta.filter((m) => m.status !== "OK");
  const dur =
    typeof fetchDurationMs === "number" && fetchDurationMs > 0
      ? `${fetchDurationMs}ms`
      : null;

  if (sourceFailed && failed.length > 0) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" />
          Data sources reporting problems · {failed.length} source
          {failed.length === 1 ? "" : "s"} not OK
        </div>
        <ul className="mt-1.5 space-y-1 pl-5 text-[11px]">
          {failed.map((f) => (
            <li key={f.source} className="list-disc">
              <span className="font-medium">{f.source}</span>: {f.status} — {f.note}
            </li>
          ))}
        </ul>
        {dur && (
          <div className="mt-1 text-[10px] text-red-700/70">fetched in {dur}</div>
        )}
      </div>
    );
  }

  if (isBehindSchedule && anchorDate && expectedThrough) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <div className="font-medium">
            Data behind schedule · expected through {expectedThrough} IST
          </div>
          <div className="mt-0.5 text-amber-800/90">
            Latest available data is from{" "}
            <span className="font-medium tabular-nums">{anchorDate}</span>. The
            daily Metabase/AppsFlyer email may not have arrived yet — this is a
            pipeline freshness issue, not an API error.
          </div>
          {dur && (
            <div className="mt-1 text-[10px] text-amber-700/70">
              fetched in {dur}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (anchorDate) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Data as of <span className="font-medium tabular-nums">{anchorDate}</span>{" "}
        IST
        <span className="ml-2 text-emerald-700/80">· on schedule</span>
        {dur && <span className="ml-2 text-emerald-700/80">· {dur}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
      <AlertTriangle className="h-3.5 w-3.5" />
      No metadata returned from sheet.
      {dur && <span className="ml-2 text-amber-700/80">· {dur}</span>}
    </div>
  );
}
