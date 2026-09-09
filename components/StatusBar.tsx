import type { MetaRow } from "@/types/sheet";
import { getAnchorDate } from "@/lib/dateRanges";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function StatusBar({ meta }: { meta: MetaRow[] }) {
  const failed = meta.filter((m) => m.status !== "OK");
  if (meta.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
        <AlertTriangle className="h-3.5 w-3.5" />
        No metadata returned from sheet.
      </div>
    );
  }
  if (failed.length === 0) {
    const anchor = getAnchorDate(meta);
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Data as of <span className="font-medium tabular-nums">{anchor}</span> IST
        <span className="ml-2 text-emerald-700/80">· all sources OK</span>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        Data quality warning · {failed.length} source
        {failed.length === 1 ? "" : "s"} not OK
      </div>
      <ul className="mt-1.5 space-y-1 pl-5 text-[11px]">
        {failed.map((f) => (
          <li key={f.source} className="list-disc">
            <span className="font-medium">{f.source}</span>: {f.status} — {f.note}
          </li>
        ))}
      </ul>
    </div>
  );
}
