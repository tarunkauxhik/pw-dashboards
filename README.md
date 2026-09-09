# GyaanE Analytics Dashboard

Internal analytics for GyaanE (PhysicsWallah microlearning app). One Next.js
app, three dashboards, one Google Apps Script data source.

Stack: Next.js 14 (App Router) · TypeScript strict · Tailwind · shadcn-style UI primitives · Recharts · Vitest.

See [`PRD_DASHBOARD_APP.md`](./PRD_DASHBOARD_APP.md) for the full product spec and the 12 non-negotiable data rules.

## Quick start

```bash
cp .env.example .env.local        # fill in SHEET_API_URL, SHEET_API_TOKEN
npm install
npm run dev                       # http://localhost:3000
```

## Scripts

```bash
npm run dev        # Next.js dev server
npm run build      # Production build
npm start          # Serve production build
npm run lint       # Next.js / ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest, single run
npm run test:watch # Vitest watch mode
```

## Project layout

```
app/
  layout.tsx              # html shell, font, providers
  page.tsx                # redirects to /business
  business/page.tsx       # Server Component — fetches sheet, renders dashboard
  marketing/page.tsx      # same pattern
  push/page.tsx           # coming-soon stub
components/
  Sidebar.tsx             # left nav
  StatusBar.tsx           # green/red banner per _meta
  DashboardToolbar.tsx    # period + gross/net + include-admin
  PeriodSelector.tsx
  GrossNetToggle.tsx
  IncludeAdminToggle.tsx
  KpiTile.tsx
  EmptyChart.tsx          # gap rule (PRD rule 4): no data → no zero
  TrendSection.tsx        # reused for MoM / WoW / Last 7 Days
  BusinessDashboard.tsx   # client wrapper
  MarketingDashboard.tsx
  BuyTypeTable.tsx
  PlatformRevenueChart.tsx
  GatewayRevenueChart.tsx
  TopCouponsTable.tsx
  ChannelTable.tsx        # sortable
  RevenueByChannelChart.tsx
  InstallsCostTrend.tsx
  ui/                     # button, card, switch, badge, table, separator
lib/
  sheet.ts                # fetch wrapper, server-only, revalidate 10m
  metrics.ts              # pure formula functions from PRD §3
  filters.ts              # date-range filters
  dateRanges.ts           # period math, ISO week, anchor date
  format.ts               # en-IN currency, %, deltas
  channel.ts              # channel coverage %
  utils.ts                # cn()
types/
  sheet.ts                # row interfaces from PRD §2
__tests__/
  metrics.test.ts         # PRD §10 + week-rollup safety test
  dateRanges.test.ts
  format.test.ts
```

## Deploy to Vercel

1. Push to GitHub (personal account).
2. Import into Vercel.
3. Set `SHEET_API_URL` and `SHEET_API_TOKEN` in project settings. Mark both as
   **Sensitive** (PRD §12) so they don't appear in build logs.
4. Deploy. The status bar should show a current "Data as of" date immediately.

## Testing the formulas

`npm test` runs the pure-function tests. The most important test is the
weekly-rollup safety in `__tests__/metrics.test.ts` — it locks PRD rule 1
(`paidUsers` is always recomputed via `new Set`, never summed across days).

## Security note

`npm audit` will flag `next@14.2.x` with high/critical advisories. The only
fix is `next@16`, which is a breaking change (App Router + React 19 +
turbopack-default behavior changes). For v1 we stay on the latest 14.x
(14.2.35) because this app does **not** use any of the affected surfaces
(no `next/image`, no middleware, no rewrites, no server actions, no
WebSocket upgrades, no custom server). The flagged CVEs are unreachable in
this codebase. Upgrade to Next 16 in a dedicated PR.
