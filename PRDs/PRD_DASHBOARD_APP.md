# PRD — GyaanE Analytics Dashboard

---

## 0. What this is

An internal analytics dashboard for GyaanE (PhysicsWallah's microlearning app).
One website, multiple dashboards, switched via a sidebar. All data comes from
ONE JSON endpoint — a Google Apps Script web app reading a Google Sheet that
refreshes itself daily at ~09:30 IST. Nothing in this app talks to Google
directly; it only calls one URL.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Recharts.
**Hosting:** Vercel (personal account).
**Data:** one `fetch()` to a token-protected Apps Script URL, cached 10 min.

---

## 1. Non-negotiable rules — read before writing any code

These come from real data problems already found and fixed. Breaking them
reproduces bugs that took real investigation to catch.

1. **Never sum a "unique users" count across days.** 41 payers Monday + 38
   Tuesday != 79 unique people. Always recompute `new Set(rows.map(r =>
   r.userid)).size` from the raw `mb_orders` rows for the selected range —
   never add up pre-aggregated daily counts of unique things.
2. **Signups and installs ARE safe to sum across days** (each event happens
   once per user). Only unique-user-style metrics are the danger.
3. **Never display "today" (D-0).** The data is only ever complete through
   yesterday. Always show data through the latest date in `_meta`, and label
   it "Data as of `<date>` IST".
4. **Never fill a missing value with `0`.** If a date/tile has no data,
   render a visible gap (blank cell, chart gap) — not a zero. A real zero and
   a missing pull must never look the same.
5. **`price` in `mb_orders` is already NET of any coupon.** Never subtract
   `coupon_discount` from it. List price = `price + coupon_discount`.
6. **Default revenue view excludes `ADMIN` and `PW_PLAN` sources.** Provide a
   toggle to include them, clearly labeled, never on by default.
   - `ADMIN` = internal free grants, not real revenue (includes a documented
     Rs 4,999 x 216-order giveaway — a 5-year free access campaign)
   - `PW_PLAN` = pw.live batch sales, belongs to a different dashboard
   - `BLANK` source = live money (pre-2026-06-16 orders + ongoing FLEXI
     autopay renewals) — NEVER exclude this one
7. **Net Collection = Gross / 1.18** (backs out 18% GST). This is a formula,
   not a separate data source. No refund data exists for GyaanE anywhere —
   confirmed, not a gap to "fix" later.
8. **`mb_buy_type` is NOT the same number as Collection.** It's subscription-
   record value (includes trial-priced rows), not collected cash. Show it as
   its own "Buy Type Mix" tile. Never add it to or compare it against Gross/
   Net Collection.
9. **Attribution is ~82% "ATTRIBUTION_MISSING" and this is expected.**
   It's a known, confirmed capture bug (not something this app can fix).
   Always show it as its own labeled category — NEVER fold it into
   "Organic". Any channel-split chart must show its coverage % prominently
   (e.g., "channel data covers 18% of paying users").
10. **Push revenue in `mb_push_daily` is ATTRIBUTED, not incremental** — no
    control group is configured. Label it "Push-attributed revenue (no
    control group)", never just "Revenue from push".
11. **All dates are IST.** The API already returns IST-bucketed dates
    (`YYYY-MM-DD` strings) — do not re-convert timezones in the frontend.
12. **Check `_meta` before rendering anything.** If any row has
    `status !== 'OK'`, show a red status banner naming which source failed.

---

## 2. Data contract — the ONE endpoint

```
GET {SHEET_API_URL}?token={SHEET_API_TOKEN}
GET {SHEET_API_URL}?token={SHEET_API_TOKEN}&tab={tabName}   // optional filter
```

Environment variables (server-side only — NEVER prefix with `NEXT_PUBLIC_`):
```
SHEET_API_URL=<the Apps Script /exec URL>
SHEET_API_TOKEN=<the token>
```

### Response shape

```typescript
// types/sheet.ts

export interface MetaRow {
  source: string;              // tab name, or '_refresh'
  status: 'OK' | 'STALE' | 'ERROR' | 'NO_EMAIL' | 'MISSING_FILE' | 'TOO_FEW_ROWS';
  data_as_of_ist: string;       // "2026-09-08 09:31 IST"
  rows: number;
  note: string;
}

export interface OrderRow {
  order_date_ist: string;       // "2026-09-08"
  userid: string;
  price: number;                // NET of coupon already
  source: 'PAYMENT' | 'PW_PLAN' | 'ADMIN' | 'BLANK' | 'APPLE_IAP' | string;
  plantype: 'DIRECT' | 'FLEXI' | string;
  platform: 'ANDROID' | 'IOS' | 'WEB' | 'BLANK';
  coupon_code: string;           // 'NO_COUPON' if none
  coupon_discount: number;
  gateway: 'PAYU' | 'PAYTM' | 'UNKNOWN';
  payment_method: string;        // 'UPI', 'UPI_CREDIT_CARD', etc.
}

export interface SignupRow {
  report_date_ist: string;
  signups: number;
}

export interface BuyTypeRow {
  plantype: string;              // YEARLY, NORMAL, MONTHLY, TRIAL, DAY
  distinct_ids: number;
  overall_rev: number;
}

export interface AttributionRow {
  userid: string;
  media_source: string;          // 'ATTRIBUTION_MISSING' is a valid, expected value
  af_channel: string;
  campaign: string;
}

export interface PushRow {
  report_date: string;
  campaign_name: string;
  sent: number;
  unique_clicks: number;
  converted_users: number;
  attributed_revenue: number;
}

export interface AppsFlyerRow {
  report_date: string;
  app_platform: 'ANDROID' | 'IOS';
  media_source: string;
  campaign: string;
  impressions: number;
  clicks: number;
  installs: number;
  cost_inr: number;
}

export interface SheetData {
  mb_orders: OrderRow[];
  mb_signups_daily: SignupRow[];
  mb_buy_type: BuyTypeRow[];
  mb_paid_user_attribution: AttributionRow[];
  mb_push_daily: PushRow[];
  af_daily: AppsFlyerRow[];
  _meta: MetaRow[];
}
```

### Fetch wrapper — implement exactly this

```typescript
// lib/sheet.ts
import 'server-only';

export async function getSheetData(): Promise<SheetData> {
  const url = `${process.env.SHEET_API_URL}?token=${process.env.SHEET_API_TOKEN}`;
  const res = await fetch(url, { next: { revalidate: 600 } }); // 10 min cache
  if (!res.ok) throw new Error(`Sheet API returned ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`Sheet API: ${data.error}`);
  return data as SheetData;
}
```

Call this ONLY from Server Components or API routes. Never from a Client
Component — that would ship the token to the browser.

---

## 3. Derived metrics — exact formulas

Implement these as pure, independently testable functions in
`lib/metrics.ts`. Every function takes `OrderRow[]` (already date-filtered by
the caller) and returns a number. This separation is deliberate — it's what
makes the metrics unit-testable.

```typescript
// lib/metrics.ts

const EXCLUDED_SOURCES = ['ADMIN', 'PW_PLAN'];

export function filterRevenueOrders(
  orders: OrderRow[],
  includeAdminAndPwPlan = false
): OrderRow[] {
  if (includeAdminAndPwPlan) return orders;
  return orders.filter(o => !EXCLUDED_SOURCES.includes(o.source));
}

export function grossCollection(orders: OrderRow[]): number {
  return orders.reduce((sum, o) => sum + o.price, 0);
}

export function netCollection(orders: OrderRow[]): number {
  return grossCollection(orders) / 1.18;
}

export function paidUsers(orders: OrderRow[]): number {
  return new Set(orders.map(o => o.userid)).size;
}

export function arpu(orders: OrderRow[]): number {
  const users = paidUsers(orders);
  return users === 0 ? 0 : grossCollection(orders) / users;
}

export function conversionRate(
  orders: OrderRow[],
  signups: SignupRow[],
  dateFrom: string,
  dateTo: string
): number {
  const payers = paidUsers(orders);
  const signupTotal = signups
    .filter(s => s.report_date_ist >= dateFrom && s.report_date_ist <= dateTo)
    .reduce((sum, s) => sum + s.signups, 0);
  return signupTotal === 0 ? 0 : payers / signupTotal;
  // NOTE: period-based definition (payers / signups in the SAME window).
  // This is NOT an M0 cohort calculation (signup AND pay in same month).
  // If the business wants M0 cohort instead, this function must be rewritten
  // to join orders back to each user's signup month — flag to the team
  // before changing, it changes every historical number on this tile.
}

export function discountGiven(orders: OrderRow[]): number {
  return orders.reduce((sum, o) => sum + o.coupon_discount, 0);
}

export function listValue(orders: OrderRow[]): number {
  return orders.reduce((sum, o) => sum + o.price + o.coupon_discount, 0);
}

export function revenueByPlatform(orders: OrderRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of orders) out[o.platform] = (out[o.platform] ?? 0) + o.price;
  return out;
}

export function revenueByCoupon(
  orders: OrderRow[]
): { code: string; orders: number; revenue: number; discount: number }[] {
  const map = new Map<string, { orders: number; revenue: number; discount: number }>();
  for (const o of orders) {
    const cur = map.get(o.coupon_code) ?? { orders: 0, revenue: 0, discount: 0 };
    cur.orders += 1;
    cur.revenue += o.price;
    cur.discount += o.coupon_discount;
    map.set(o.coupon_code, cur);
  }
  return [...map.entries()]
    .map(([code, v]) => ({ code, ...v }))
    .sort((a, b) => b.orders - a.orders);
}

// CAC - needs af_daily joined in. Android-only cost data exists for GyaanE.
export function cac(orders: OrderRow[], afRows: AppsFlyerRow[]): number {
  const cost = afRows.reduce((sum, r) => sum + r.cost_inr, 0);
  const installs = afRows.reduce((sum, r) => sum + r.installs, 0);
  return installs === 0 ? 0 : cost / installs;
}

// Revenue by acquisition channel - requires the join described in Sec 4.
export function revenueByChannel(
  orders: OrderRow[],
  attribution: AttributionRow[]
): { channel: string; users: number; revenue: number }[] {
  const channelByUser = new Map(attribution.map(a => [a.userid, a.media_source]));
  const map = new Map<string, { users: Set<string>; revenue: number }>();
  for (const o of orders) {
    const ch = channelByUser.get(o.userid) ?? 'ATTRIBUTION_MISSING';
    const cur = map.get(ch) ?? { users: new Set(), revenue: 0 };
    cur.users.add(o.userid);
    cur.revenue += o.price;
    map.set(ch, cur);
  }
  return [...map.entries()]
    .map(([channel, v]) => ({ channel, users: v.users.size, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}
```

**Write unit tests for every function above before building any UI.** See §10.

---

## 4. The revenue-by-channel join — do this exactly once, reuse everywhere

`mb_orders` has `userid` but no channel. `mb_paid_user_attribution` has
`userid` -> channel, one row per paying user. Join them in memory:

```typescript
const channelByUser = new Map(
  attribution.map(a => [a.userid, a.media_source])
);
// then: channelByUser.get(order.userid) ?? 'ATTRIBUTION_MISSING'
```

Build this map ONCE per page load (memoize it), not per-row in a loop.

---

## 5. Information architecture

```
/                       -> redirect to /business
/business               -> Dashboard 1
/marketing              -> Dashboard 2
/push                   -> Dashboard 3 (build after 1 & 2 are solid)
```

Persistent left sidebar, all pages:
```
GyaanE Dashboards
- Business
- Marketing
- Push  (can be visually "coming soon" until built)
```

Every page shares one top status bar:
```
[ Data as of 2026-09-08 09:31 IST ]          <- green
[ Data as of 2026-09-07 - af_daily STALE ]   <- red, when any _meta.status != OK
```

---

## 6. Dashboard 1 — Business

### 6.1 Period selector (shared state, top of page)
Options: **Last 7 days / Last 30 days / This month / Custom range**.
Default: Last 30 days. All tiles below react to this selector.

### 6.2 KPI tiles (row of 6)

| Tile | Formula | Notes |
|---|---|---|
| Installs | `sum(af_daily.installs)` in period | Additive, safe to sum |
| Sign-Ups | `sum(mb_signups_daily.signups)` in period | Additive |
| **Gross/Net Collection** | toggle between `grossCollection()` / `netCollection()` | Format Rs Indian style (Rs 12,34,567) |
| Paid Users | `paidUsers()` on period-filtered orders | Recomputed from rows, never summed daily |
| ARPU | `arpu()` | |
| Conversion % | `conversionRate()` | period-based, see §3 note |

Each tile also shows **% change vs the equal-length prior period** (e.g., last
30 days vs the 30 days before that).

Note: a **Gross/Net toggle** switch must sit above these tiles, applying to the
Collection tile and every revenue chart below.
Note: an **"Include ADMIN & PW_PLAN"** checkbox, off by default, next to it.

### 6.3 Three trend sections

Each is a line/bar chart + a small table underneath.

- **"MoM"** — group `mb_orders` by calendar month -> Collection, ARPU, Paid
  Users, Conversion %. X-axis = month.
- **"WoW"** — group by ISO week (week starts Monday) -> same 4 metrics.
- **"Last 7 Days"** — daily granularity -> same 4 metrics.

**Rule enforced by code, not just by convention:** these three sections must
each independently recompute `paidUsers()` / `arpu()` at their own grouping
level from the raw `mb_orders` rows — never derive the weekly number by
summing 7 daily numbers.

### 6.4 Buy Type Mix (separate section, clearly not a Collection tile)
Simple table from `mb_buy_type`: plantype | distinct_ids | overall_rev.
Caption underneath: "Subscription-record value, not collected revenue —
includes trial-priced rows. Not comparable to Collection above."

### 6.5 Breakdown charts
- Revenue by platform (`revenueByPlatform`) — donut or bar
- Revenue by payment gateway/method — bar
- Top coupons (`revenueByCoupon`, top 10 by orders) — table

---

## 7. Dashboard 2 — Marketing

### 7.1 KPI tiles
Installs, Total Ad Cost (Rs, from `af_daily`), CAC (`cac()`), Paid Users
(reuse from Business — same definition, same filter).

### 7.2 Channel performance table
From `af_daily`: media_source | installs | cost | CTR (`clicks/impressions`).
Sortable. Default sort: cost descending.

Known data issue to display as a footnote under this table:
"Some rows above are promotional coupon codes (e.g. SPIN15, JANMASHTAMI)
that have leaked into channel attribution — a known tracking bug, not a
real acquisition channel."

### 7.3 Revenue by channel (`revenueByChannel`)
Bar chart, channels sorted by revenue. "ATTRIBUTION_MISSING" must be its
own bar, not omitted, not merged into anything else.

Header caption, always visible, not just a tooltip:
"Channel data covers ~18% of paying users. The remainder is unattributed
due to a known tracking issue, not zero acquisition."
(Compute the actual coverage % live: `1 - (missingCount / totalPayers)`,
don't hardcode 18%.)

### 7.4 Installs & cost trend
Line chart, installs and cost_inr over time, from `af_daily`, daily grain.

---

## 8. Dashboard 3 — Push (build after 1 & 2 ship)

- Table from `mb_push_daily`: campaign_name | sent | unique_clicks |
  converted_users | attributed_revenue, grouped/summed by campaign
  (collapses the known duplicate campaign-day rows automatically via
  the GROUP BY already done at the SQL layer — but still dedupe defensively
  in the frontend if the same campaign+date pair appears twice).
- Every revenue number on this page carries the label: "Attributed
  (no control group configured) — not proven incremental."

---

## 9. Component structure (suggested, not mandatory)

```
app/
  layout.tsx                 -- sidebar + status bar shell
  business/page.tsx
  marketing/page.tsx
  push/page.tsx
components/
  StatusBar.tsx
  KpiTile.tsx
  PeriodSelector.tsx
  GrossNetToggle.tsx
  TrendSection.tsx           -- reused for MoM/WoW/Last7Days
  BuyTypeTable.tsx
  ChannelTable.tsx
  RevenueByChannelChart.tsx
lib/
  sheet.ts                   -- the fetch wrapper, Sec 2
  metrics.ts                 -- all pure formula functions, Sec 3
  dateRanges.ts               -- period-selector date math
  format.ts                   -- Rs Indian-number formatting, % formatting
types/
  sheet.ts                    -- interfaces from Sec 2
__tests__/
  metrics.test.ts             -- see Sec 10
```

---

## 10. Required tests

Use Vitest or Jest. **Write these before wiring up any chart** — the
formulas are the highest-risk part of this app, not the UI.

```typescript
// __tests__/metrics.test.ts (illustrative - expand with real fixtures)

describe('paidUsers', () => {
  it('counts unique users, not rows', () => {
    const orders = [
      { userid: 'a', price: 749, source: 'PAYMENT' } as OrderRow,
      { userid: 'a', price: 749, source: 'PAYMENT' } as OrderRow, // same user, 2 orders
      { userid: 'b', price: 699, source: 'PAYMENT' } as OrderRow,
    ];
    expect(paidUsers(orders)).toBe(2); // NOT 3
  });
});

describe('filterRevenueOrders', () => {
  it('excludes ADMIN and PW_PLAN by default', () => {
    const orders = [
      { source: 'PAYMENT', price: 100 } as OrderRow,
      { source: 'ADMIN',   price: 4999 } as OrderRow,
      { source: 'PW_PLAN', price: 500 } as OrderRow,
    ];
    expect(filterRevenueOrders(orders)).toHaveLength(1);
  });

  it('keeps BLANK source - it is real money', () => {
    const orders = [{ source: 'BLANK', price: 149 } as OrderRow];
    expect(filterRevenueOrders(orders)).toHaveLength(1);
  });
});

describe('netCollection', () => {
  it('divides gross by 1.18', () => {
    const orders = [{ price: 1180, source: 'PAYMENT' } as OrderRow];
    expect(netCollection(orders)).toBeCloseTo(1000, 2);
  });
});

describe('revenueByChannel', () => {
  it('buckets unattributed users under ATTRIBUTION_MISSING, not Organic', () => {
    const orders = [{ userid: 'x', price: 749, source: 'PAYMENT' } as OrderRow];
    const attribution: AttributionRow[] = []; // no match for user x
    const result = revenueByChannel(orders, attribution);
    expect(result[0].channel).toBe('ATTRIBUTION_MISSING');
  });
});

// Also test: MoM/WoW/trend grouping never sums a pre-aggregated
// unique-user metric across periods (test that weekly paidUsers !=
// sum of daily paidUsers, using a fixture with a repeat-payer across
// two days).
```

Also test:
- `_meta` STALE/ERROR states correctly trigger the red banner
- Empty/missing data renders a gap, never a `0`
- Gross/Net toggle produces `netCollection = grossCollection / 1.18` exactly

---

## 11. Non-functional requirements

- **Data volume:** ~22K rows (`mb_orders`) + ~19K (`mb_paid_user_attribution`)
  ~ under 3 MB JSON. Fine to load in full client-side; no pagination needed
  yet. (If this ever exceeds ~100K rows total, move filtering server-side —
  not a v1 concern.)
- **Caching:** `revalidate: 600` on every fetch to the Apps Script endpoint.
  Data only changes once daily — no need for anything shorter.
- **Security:** `SHEET_API_TOKEN` must never appear in any client bundle.
  Fetch only from Server Components or Route Handlers.
- **Currency formatting:** Indian numbering (Rs 12,34,567), not Western
  (Rs 1,234,567). Use `Intl.NumberFormat('en-IN', { style: 'currency',
  currency: 'INR' })`.
- **Empty/loading/error states** required on every tile and chart —
  this is a real internal tool, not a demo.
- **Mobile:** nice-to-have, not required for v1 — this is desk-checked
  internally, not phone-first.

---

## 12. Deployment

1. Push to GitHub (personal account).
2. Import into Vercel (personal account).
3. Set environment variables in Vercel project settings:
   `SHEET_API_URL`, `SHEET_API_TOKEN` — mark both as Sensitive, not
   just "Encrypted", so they never appear in build logs.
4. Deploy. Confirm the status bar shows a real, current "Data as of" date
   in production, not just locally.

---

## 13. Explicit non-goals for v1

- No user accounts / multi-tenant login — single internal audience
- No editing of any data — read-only dashboard
- No pw.live dashboard yet — separate data model, separate PRD later
- No Pre-Sales or Engagement dashboards yet — logged for later, not built now
- No net-of-refunds tile — refund data does not exist for GyaanE (confirmed)
- No Semi-Paid user segment — confirmed not in use
- No Masterclass tile — feature not launched
