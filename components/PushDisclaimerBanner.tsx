import { AlertCircle } from "lucide-react";

export function PushDisclaimerBanner() {
  return (
    <div
      role="note"
      aria-label="Push revenue attribution disclaimer"
      className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">
          Push revenue is attributed, not measured
        </div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-amber-800">
          No control group is configured for these campaigns, so figures
          reflect revenue from users who converted after receiving a message
          — some may have converted anyway.
        </p>
      </div>
    </div>
  );
}
