import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

export default function PwLivePage() {
  return (
    <DashboardShell
      title="pw.live"
      subtitle="A separate analytics surface for the pw.live product line."
    >
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <Badge variant="outline" className="gap-1.5">
            <Construction className="h-3 w-3" />
            In development
          </Badge>
          <h2 className="text-lg font-medium">In dev phase, will be visible soon!</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            pw.live has its own data model — separate Orders, separate
            attribution, separate ad spend. We&apos;re scoping the next
            iteration now and will publish a PRD, schemas, and metrics
            before the first row lands on this page.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
