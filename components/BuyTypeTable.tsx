import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
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
import type { BuyTypeRow } from "@/types/sheet";

export function BuyTypeTable({ rows }: { rows: BuyTypeRow[] }) {
  return (
    <Card>
      <CardHeader
        action={
          <FormulaInfo
            formula="Σ mb_buy_type.overall_rev"
            note="Subscription-record value, not collected revenue. Includes trial-priced rows."
          />
        }
      >
        <CardTitle>Buy Type Mix</CardTitle>
        <CardDescription>
          Subscription-record value, not collected revenue — includes
          trial-priced rows. Not comparable to Collection above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Type</TableHead>
              <TableHead className="text-right">Distinct IDs</TableHead>
              <TableHead className="text-right">Overall Rev</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.plantype}>
                <TableCell className="font-medium">{r.plantype}</TableCell>
                <TableCell className="text-right">
                  {intFmt(r.distinct_ids)}
                </TableCell>
                <TableCell className="text-right">{inr(r.overall_rev)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
