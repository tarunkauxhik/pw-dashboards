# PRD Addendum — Dashboard 4: pw.live
**Paste this into your AI IDE.** Assumes the existing architecture is in
place (fetch wrapper, `types/sheet.ts`, `lib/metrics.ts`, shared
`PeriodSelector`/`StatusBar`/`TrendSection` components from Dashboards 1-3).
This only adds what's new.

---

## 0. Data already available

`mb_pwlive_orders`, `mb_pwlive_funnel`, `mb_pwlive_qa` are already in the
JSON payload. Add these types:

```typescript
export interface PwLiveOrderRow {
  order_date_ist: string;
  batch_name: string;
  userid: string;
  price: number | null;   // null only if order_details is missing - see mb_pwlive_qa
}

export interface PwLiveFunnelRow {
  event_date_ist: string;
  batch_name: string;
  funnel_stage: 'batch_description_view' | 'order_page_view';
  total_views: number;    // raw event count - a repeat visit counts twice
  unique_users: number;   // deduped per day per batch - see caveat in Rule 2
}

export interface PwLiveQaRow {
  batch_name: string;
  total_paid_orders: number;
  orders_with_price: number;
  orders_missing_price: number;
  first_seen: string;
  last_seen: string;
}
```

Add `mb_pwlive_orders`, `mb_pwlive_funnel`, `mb_pwlive_qa` (all arrays of the
above) to the `SheetData` interface.

---

## 1. Rules specific to this dashboard

1. **Money is NOT `gold_orders.source='PW_PLAN'`.** That field is a
   GyaanE-side access marker with fixed system prices that don't match real
   checkout amounts (confirmed by direct investigation). The correct source
   is already baked into `mb_pwlive_orders` — just use `price` from there,
   never touch `gold_orders` for pw.live money.
2. **`unique_users` in `mb_pwlive_funnel` is deduped per day per batch, not
   all-time.** Summing it across a date range gives "daily active viewers
   in this period" (correct for a trend/KPI tile), not "distinct people
   who ever viewed" (a repeat visitor across multiple days is counted once
   per day they visited). This is a source-data property from the daily
   grain of the query, not a bug — don't try to "fix" it by deduping again
   client-side, there's no `userid` at that grain to dedupe against.
3. **`total_views` vs `unique_users` are genuinely different numbers, show
   both.** A user who views a batch page twice is 2 in `total_views`, 1 in
   `unique_users`. Don't let one silently stand in for the other.
4. **A `price: null` row still represents a real paid enrolment** — the
   user paid, but the order-details record is missing (rare — the current
   dataset has zero of these, per `mb_pwlive_qa`, but don't assume this
   stays true forever). Count it in Paid Users, exclude it from revenue
   sums, and surface it if `mb_pwlive_qa.orders_missing_price > 0` for any
   batch — a small warning badge on that batch's row in the per-batch table
   is enough, don't block the page.
5. **Net Collection = Gross ÷ 1.18, computed separately from the app-side
   Dashboard 1 number.** Never pool or compare pw.live Net Collection
   against Dashboard 1's Net Collection as if they're one figure — they are
   two genuinely separate revenue streams.
6. **The batch list grows over time.** Never hardcode batch names in the
   frontend. Derive the list of batches from `mb_pwlive_orders` /
   `mb_pwlive_funnel` themselves (`[...new Set(rows.map(r => r.batch_name))]`)
   so a new course appears automatically with zero code changes.
7. Reuse `PeriodSelector`, `StatusBar`, and **`TrendSection`** exactly as
   built for Dashboard 1 — see §3 for how to feed pw.live data into
   `TrendSection` without forking it.

---

## 2. Metrics — add to `lib/metrics.ts`

```typescript
export function pwLiveGross(orders: PwLiveOrderRow[]): number {
  return orders.reduce((sum, o) => sum + (o.price ?? 0), 0);
}

export function pwLiveNet(orders: PwLiveOrderRow[]): number {
  return pwLiveGross(orders) / 1.18;
}

export function pwLivePaidUsers(orders: PwLiveOrderRow[]): number {
  return new Set(orders.map(o => o.userid)).size;
}

export function pwLiveArpu(orders: PwLiveOrderRow[]): number {
  const users = pwLivePaidUsers(orders);
  return users === 0 ? 0 : pwLiveGross(orders) / users;
}

export function funnelTotals(
  funnel: PwLiveFunnelRow[],
  stage: 'batch_description_view' | 'order_page_view'
): { totalViews: number; uniqueUsers: number } {
  const rows = funnel.filter(r => r.funnel_stage === stage);
  return {
    totalViews: rows.reduce((s, r) => s + r.total_views, 0),
    uniqueUsers: rows.reduce((s, r) => s + r.unique_users, 0),
  };
}

export function pwLiveConversionRate(
  orders: PwLiveOrderRow[],
  funnel: PwLiveFunnelRow[]
): number {
  const payers = pwLivePaidUsers(orders);
  const { uniqueUsers } = funnelTotals(funnel, 'batch_description_view');
  return uniqueUsers === 0 ? 0 : payers / uniqueUsers;
  // Denominator = Batch Description (Listing) unique viewers, per the
  // agreed formula: Total Paid Users / Batch Listing Unique Users.
}
```

### Per-batch period table (image 2 — the horizontal scroll table)

```typescript
// lib/dateRanges.ts - add this helper
export function fiscalYearStartIst(todayIst: string): string {
  // PW's own reporting convention is FY starting 1 April, not calendar year.
  // Confirm this is still correct before shipping - flagged in §4.
  const [y, m] = todayIst.split('-').map(Number);
  const fyYear = m >= 4 ? y : y - 1;
  return `${fyYear}-04-01`;
}

export function shiftDateIst(dateIst: string, days: number): string {
  const d = new Date(dateIst + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
```

```typescript
// lib/metrics.ts

export interface BatchPeriodStats {
  batchName: string;
  ytd: { paidUsers: number; netCollection: number };
  mtd: { paidUsers: number; netCollection: number };
  d1: { paidUsers: number; netCollection: number };
  d2: { paidUsers: number; netCollection: number };
  d3: { paidUsers: number; netCollection: number };
}

export function perBatchPeriodTable(
  orders: PwLiveOrderRow[],
  todayIst: string   // pass _meta's latest complete date, NOT client "today"
): BatchPeriodStats[] {
  const batches = [...new Set(orders.map(o => o.batch_name))];
  const fyStart = fiscalYearStartIst(todayIst);
  const monthStart = todayIst.slice(0, 7) + '-01';
  const d1 = shiftDateIst(todayIst, -1);
  const d2 = shiftDateIst(todayIst, -2);
  const d3 = shiftDateIst(todayIst, -3);

  const statsFor = (rows: PwLiveOrderRow[]) => ({
    paidUsers: pwLivePaidUsers(rows),
    netCollection: pwLiveNet(rows),
  });
  const inRange = (rows: PwLiveOrderRow[], from: string, to: string) =>
    rows.filter(o => o.order_date_ist >= from && o.order_date_ist <= to);

  return batches.map(batchName => {
    const b = orders.filter(o => o.batch_name === batchName);
    return {
      batchName,
      ytd: statsFor(inRange(b, fyStart, todayIst)),
      mtd: statsFor(inRange(b, monthStart, todayIst)),
      d1: statsFor(inRange(b, d1, d1)),
      d2: statsFor(inRange(b, d2, d2)),
      d3: statsFor(inRange(b, d3, d3)),
    };
  }).sort((a, b) => b.mtd.netCollection - a.mtd.netCollection);
}
```

---

## 3. Making `TrendSection` reusable across dashboards

The 3 visual sections you want (image 1) are the **exact same MoM/WoW/
Last-7-Days pattern already built for Dashboard 1** — same visual, same
metrics (Net Collection, ARPU, Total Paid Users, Conversion %), just scoped
to pw.live data instead of app data.

**Don't fork `TrendSection`.** If it currently accepts `OrderRow[]`
directly, generalize its prop type to a minimal shared shape both data
sources can satisfy:

```typescript
interface TrendableRow {
  date: string;      // order_date_ist from either source
  userid: string;
  price: number;
}
```

Map both sources into this shape before passing to `TrendSection`:

```typescript
const trendRows: TrendableRow[] = pwLiveOrders.map(o => ({
  date: o.order_date_ist,
  userid: o.userid,
  price: o.price ?? 0,
}));
```

If `TrendSection` also computes Conversion %, it will need an optional
`conversionDenominator` prop (signups for Dashboard 1, batch-description
unique viewers for pw.live) — pass `pwLiveConversionRate`'s inputs through
rather than hardcoding Dashboard 1's signup logic inside the component.

---

## 4. One thing to confirm before shipping, not assume

`fiscalYearStartIst()` above assumes **YTD = 1 April**, matching the
convention seen elsewhere in this project's reporting (an "FY targets"
tracker used "YTD from 1 Apr"). If the business actually means calendar-year
YTD (1 January) for this specific dashboard, swap the function — a one-line
change, but it silently changes every YTD number if guessed wrong. Confirm
this with whoever reads the YTD column before trusting it.

---

## 5. Page layout — `/pwlive`

Add to the sidebar: `pw.live`, alongside Business / Marketing / Push.

### 5.1 Headline KPI row

| Tile | Formula | Notes |
|---|---|---|
| Batch Page Views | `funnelTotals(funnel, 'batch_description_view').totalViews` | Raw count, repeats included |
| Batch Unique Users | `funnelTotals(funnel, 'batch_description_view').uniqueUsers` | Deduped per day — show as the subtitle under Page Views, e.g. "60,329 views · 28,385 unique users", rather than two separate tiles, to keep the headline row at 6 |
| Order Page Unique Users | `funnelTotals(funnel, 'order_page_view').uniqueUsers` | Same views/unique pairing available if wanted later |
| Net Collection | `pwLiveNet(orders)` | Gross/Net toggle, same pattern as Dashboard 1 |
| Total Paid Users | `pwLivePaidUsers(orders)` | |
| ARPU | `pwLiveArpu(orders)` | |
| Conversion % | `pwLiveConversionRate(orders, funnel)` | Paid Users ÷ Batch Unique Users, per the agreed formula |

All reactive to the shared `PeriodSelector`, same as Dashboard 1. Each tile
shows % change vs the equal-length prior period.

### 5.2 Three trend sections (image 1)
Reuse `TrendSection` exactly, per §3:
- **Section 1 "MoM"** — Net Collection, ARPU, Total Paid Users, Conversion %
- **Section 2 "WoW"** — same 4 metrics
- **Section 3 "Last 7 Days"** — same 4 metrics

Pooled across all pw.live batches (not per-batch) — the per-batch breakdown
is §5.3.

### 5.3 Per-batch period table (image 2 — horizontal scroll)

Uses `perBatchPeriodTable()`. Columns: Batch Name (sticky, doesn't scroll)
| YTD (Paid Users, Net Collection) | MTD (same pair) | D-1 | D-2 | D-3.

Implementation notes:
- Wrap in a horizontally scrolling container (`overflow-x-auto`), first
  column `sticky left-0` so the batch name stays visible while scrolling
  through the date-window columns
- Sort by MTD Net Collection descending by default (already done in
  `perBatchPeriodTable`)
- If a batch has zero orders in a given window, show `0`, not a blank —
  this is a real, computed zero (the batch genuinely had no sales that
  window), which is different from a missing data pull. This is the one
  place in the whole app where showing `0` is correct, precisely because
  it's derived client-side from real rows, not a raw pipeline value that
  could be a masked failure.
- A batch flagged in `mb_pwlive_qa` with `orders_missing_price > 0` gets a
  small warning icon next to its name in this table (Rule 4).

---

## 6. Tests

```typescript
describe('pwLivePaidUsers', () => {
  it('counts unique users, not orders', () => {
    const orders = [
      { userid: 'a', price: 749 } as PwLiveOrderRow,
      { userid: 'a', price: 749 } as PwLiveOrderRow,
      { userid: 'b', price: 749 } as PwLiveOrderRow,
    ];
    expect(pwLivePaidUsers(orders)).toBe(2);
  });
});

describe('pwLiveGross', () => {
  it('treats null price as 0, not an error', () => {
    const orders = [
      { userid: 'a', price: 749 } as PwLiveOrderRow,
      { userid: 'b', price: null } as PwLiveOrderRow,
    ];
    expect(pwLiveGross(orders)).toBe(749);
  });
});

describe('funnelTotals', () => {
  it('keeps total_views and unique_users distinct', () => {
    const funnel = [
      { funnel_stage: 'batch_description_view', total_views: 100, unique_users: 40 } as PwLiveFunnelRow,
      { funnel_stage: 'batch_description_view', total_views: 50,  unique_users: 20 } as PwLiveFunnelRow,
      { funnel_stage: 'order_page_view',         total_views: 10,  unique_users: 8  } as PwLiveFunnelRow,
    ];
    const result = funnelTotals(funnel, 'batch_description_view');
    expect(result.totalViews).toBe(150);
    expect(result.uniqueUsers).toBe(60);
  });
});

describe('perBatchPeriodTable', () => {
  it('never hardcodes batch names - derives them from the data', () => {
    const orders = [
      { batch_name: 'A New Course Nobody Coded For', userid: 'x', price: 749, order_date_ist: '2026-09-08' } as PwLiveOrderRow,
    ];
    const result = perBatchPeriodTable(orders, '2026-09-09');
    expect(result.map(r => r.batchName)).toContain('A New Course Nobody Coded For');
  });
});
```

---

## 7. Non-goals

- No per-course engagement (that's the separate, not-yet-built Engagement
  dashboard, different data model entirely)
- No cross-linking pw.live buyers back to app-side GyaanE users — the two
  systems use different user IDs and phone-hash matching is confirmed
  incomplete; don't attempt a join that isn't already proven
- No refund handling — same as Dashboard 1, no refund data exists for
  GyaanE in the warehouse currently
