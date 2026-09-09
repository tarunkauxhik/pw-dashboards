# PRD Addendum — Dashboard 3: Push
**Paste this into your AI IDE.** It assumes the original PRD's architecture is
already in place (Next.js app, `lib/sheet.ts`, `types/sheet.ts`, `lib/metrics.ts`,
shared `PeriodSelector`/`StatusBar` components). This document only adds what's
new — it does not repeat the data contract, fetch wrapper, or non-functional
requirements, which are unchanged.

---

## 0. Data already available — no pipeline change needed

`mb_push_daily` is already in the JSON payload (`SheetData.mb_push_daily`,
typed as `PushRow[]` in `types/sheet.ts`). Nothing to fetch, nothing to add
to `lib/sheet.ts`.

```typescript
export interface PushRow {
  report_date: string;         // "2026-09-08"
  campaign_name: string;
  sent: number;
  unique_clicks: number;
  converted_users: number;
  attributed_revenue: number;
}
```

**One correction to the original PRD:** it said to "defensively dedupe" rows
in the frontend for duplicate campaign-day entries. That's unnecessary — the
Metabase query already does `GROUP BY report_date, campaign_name` with
`SUM()` on every metric, so **one row per (date, campaign) pair is already
guaranteed by construction.** Do not add dedup logic; there is nothing to
dedupe.

---

## 1. Rules specific to this dashboard

1. **Every revenue figure on this page must carry the label "Attributed
   (no control group)".** MoEngage has no holdout group configured for
   these campaigns — this is *"revenue from users who converted after being
   sent this campaign,"* not proven incremental lift. Never present it as
   plain "Revenue".
2. **`converted_users` can be safely summed across days and campaigns for a
   KPI tile**, with one caveat to note in a tooltip: MoEngage counts
   conversions per campaign independently, so a user converting via two
   different campaigns in the same window could count twice in a summed
   total. This is a limitation of the source data itself (campaign-level,
   not user-level), not something fixable in this frontend — unlike the
   `paidUsers()` unique-count problem in Dashboard 1, there is no row-level
   `userid` here to de-duplicate against.
3. **Filter out zero-activity rows from any "top campaigns" list** —
   `sent === 0`. Many rows exist as campaign *definitions* with no send
   that day (config rows), not real activity. Don't let them clutter a
   ranked table. They're fine to leave in raw trend totals (they contribute
   0, harmlessly).
4. **Campaign volume is high (~250 campaigns/day).** Never render an
   unpaginated flat table of all of them — always sort + limit (e.g. top 15)
   with a "show more" affordance, or provide search/filter.
5. Reuse the existing `PeriodSelector` and `StatusBar` components exactly
   as used on Business/Marketing — don't build new ones.

---

## 2. Metrics — add to `lib/metrics.ts`

```typescript
export function totalSent(rows: PushRow[]): number {
  return rows.reduce((sum, r) => sum + r.sent, 0);
}

export function totalClicks(rows: PushRow[]): number {
  return rows.reduce((sum, r) => sum + r.unique_clicks, 0);
}

export function ctr(rows: PushRow[]): number {
  const sent = totalSent(rows);
  return sent === 0 ? 0 : totalClicks(rows) / sent;
}

export function totalConvertedUsers(rows: PushRow[]): number {
  // See Rule 2 above - this is a sum of independent per-campaign counts,
  // not a de-duplicated unique-user count. That's a source-data property,
  // not a bug in this function.
  return rows.reduce((sum, r) => sum + r.converted_users, 0);
}

export function totalAttributedRevenue(rows: PushRow[]): number {
  return rows.reduce((sum, r) => sum + r.attributed_revenue, 0);
}

export function revenuePerConvertedUser(rows: PushRow[]): number {
  const users = totalConvertedUsers(rows);
  return users === 0 ? 0 : totalAttributedRevenue(rows) / users;
}

export function topCampaigns(
  rows: PushRow[],
  sortBy: 'attributed_revenue' | 'converted_users' | 'sent' = 'attributed_revenue',
  limit = 15
): PushRow[] {
  // Aggregate across the selected date range - one row per campaign,
  // summed over every day it appears in the filtered range.
  const map = new Map<string, PushRow>();
  for (const r of rows) {
    if (r.sent === 0) continue; // Rule 3
    const cur = map.get(r.campaign_name);
    if (cur) {
      cur.sent += r.sent;
      cur.unique_clicks += r.unique_clicks;
      cur.converted_users += r.converted_users;
      cur.attributed_revenue += r.attributed_revenue;
    } else {
      map.set(r.campaign_name, { ...r });
    }
  }
  return [...map.values()]
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, limit);
}
```

---

## 3. Page layout — `/push`

### 3.1 KPI tiles (row of 5)
| Tile | Formula |
|---|---|
| Sends | `totalSent()` |
| Unique Clicks | `totalClicks()` |
| CTR | `ctr()`, as % |
| Converted Users | `totalConvertedUsers()` — tooltip per Rule 2 |
| Attributed Revenue | `totalAttributedRevenue()` — labeled per Rule 1 |

Each with % change vs the equal-length prior period, same pattern as
Dashboard 1.

### 3.2 Trend chart
Line chart: `sent` and `unique_clicks` over time (daily grain, from the
filtered period). Secondary axis or separate small chart for
`attributed_revenue` over time.

### 3.3 Top Campaigns table
Uses `topCampaigns()`. Columns: Campaign | Sent | Clicks | CTR | Converted
Users | Attributed Revenue. Sortable by clicking column headers (default
sort: Attributed Revenue descending). Limit 15, with a "Show more" toggle
that extends the limit rather than paginating a new request (all data is
already client-side).

### 3.4 Revenue disclaimer banner
A persistent, non-dismissible caption above the KPI tiles (not a tooltip —
this needs to be seen, not discovered):
> *"Push revenue is attributed, not measured. No control group is
> configured for these campaigns, so this reflects revenue from users who
> converted after receiving a message — some may have converted anyway."*

---

## 4. Optional, nice-to-have (only if you want it — not required for v1)

Campaign names follow recognizable patterns in the real data (`drip_...` =
lifecycle/journey campaigns, `Push-<Category>-D<N>` = day-N of a drip
sequence, festival/event-named one-offs like `RakshaBandhan_...`, and
survey pushes like `push_nps_form_...` that aren't sales-oriented at all).

If useful later: a simple `categorizeCampaign(name: string): 'drip' |
'event' | 'survey' | 'other'` classifier (basic string-matching, not
regex-heavy) could group the Top Campaigns table by category. **Don't
build this now** — ship the flat sortable table first, add grouping only
if it turns out to be genuinely useful once you're looking at real data
daily.

---

## 5. Tests to add

```typescript
describe('totalAttributedRevenue', () => {
  it('sums across all provided rows', () => {
    const rows = [
      { attributed_revenue: 749 } as PushRow,
      { attributed_revenue: 1498 } as PushRow,
    ];
    expect(totalAttributedRevenue(rows)).toBe(2247);
  });
});

describe('topCampaigns', () => {
  it('excludes zero-send rows', () => {
    const rows = [
      { campaign_name: 'A', sent: 0, unique_clicks: 0, converted_users: 0, attributed_revenue: 0, report_date: '2026-09-01' },
      { campaign_name: 'B', sent: 100, unique_clicks: 5, converted_users: 1, attributed_revenue: 749, report_date: '2026-09-01' },
    ] as PushRow[];
    const result = topCampaigns(rows);
    expect(result).toHaveLength(1);
    expect(result[0].campaign_name).toBe('B');
  });

  it('aggregates the same campaign across multiple days', () => {
    const rows = [
      { campaign_name: 'A', sent: 100, unique_clicks: 5, converted_users: 1, attributed_revenue: 749, report_date: '2026-09-01' },
      { campaign_name: 'A', sent: 200, unique_clicks: 10, converted_users: 2, attributed_revenue: 1498, report_date: '2026-09-02' },
    ] as PushRow[];
    const result = topCampaigns(rows);
    expect(result).toHaveLength(1);
    expect(result[0].sent).toBe(300);
    expect(result[0].attributed_revenue).toBe(2247);
  });
});
```

---

## 6. Non-goals

- No control-group / incrementality analysis — not configured at the
  MoEngage level, cannot be added at the frontend
- No user-level push data (open/click by individual) — source is
  campaign-level only
- No campaign categorization in v1 (see §4)
- No cross-linking converted_users to `mb_orders` — no shared `userid` in
  this data source, so a push-to-actual-order join isn't possible with
  what's available
