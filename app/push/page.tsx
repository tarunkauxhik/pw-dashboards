import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PushPage() {
  return (
    <DashboardShell
      title="Push"
      subtitle="Campaign performance and attributed revenue."
      sidebarMeta={{ lastRefreshedIso: null, stale: "fresh", sourceFailed: false, isBehindSchedule: false }}
    >
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <Badge variant="outline">Coming soon</Badge>
          <h2 className="text-lg font-medium">
            Push dashboard is built after Business and Marketing ship
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            This page will show campaigns from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              mb_push_daily
            </code>{" "}
            with the caveat:{" "}
            <strong>
              Attributed, no control group configured — not proven
              incremental.
            </strong>
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
