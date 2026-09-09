import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PushPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:pl-[240px]">
        <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6 md:p-8">
          <header className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Push</h1>
            <p className="text-sm text-muted-foreground">
              Campaign performance and attributed revenue.
            </p>
          </header>
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
        </div>
      </main>
    </div>
  );
}
