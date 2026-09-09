import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { FormulaInfo } from "./FormulaInfo";
import { inr, intFmt } from "@/lib/format";
import { revenueByCoupon } from "@/lib/metrics";
import type { GrossNet } from "./GrossNetToggle";
import type { OrderRow } from "@/types/sheet";

export function TopCouponsTable({
  orders,
  topN = 10,
  grossNet,
}: {
  orders: OrderRow[];
  topN?: number;
  grossNet: GrossNet;
}) {
  const ordersForRevenue =
    grossNet === "gross"
      ? orders
      : orders.map((o) => ({ ...o, price: o.price / 1.18 }));
  const rows = revenueByCoupon(ordersForRevenue).slice(0, topN);
  return (
    <Card>
      <CardHeader action={<FormulaInfo formula="Σ order.price per coupon · /1.18 if Net" />}>
        <CardTitle>Top Coupons</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Discount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  —
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="font-medium">{r.code}</TableCell>
                  <TableCell className="text-right">{intFmt(r.orders)}</TableCell>
                  <TableCell className="text-right">{inr(r.revenue)}</TableCell>
                  <TableCell className="text-right">{inr(r.discount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
