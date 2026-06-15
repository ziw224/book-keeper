# CardCycle

Track credit card spending by real statement cycles, not calendar months.

Each credit card closes on a different day. CardCycle organizes your transactions by each card's actual billing cycle so totals match your statement.

## Quick Start

```bash
npm install
npx prisma migrate dev      # create SQLite database
npm run db:seed              # seed sample data (2 cards, 17 transactions)
npm run dev                  # start at http://localhost:3000
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm test` | Run unit tests (Vitest) |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed sample data (skips if data exists) |
| `npm run db:reset` | Wipe DB, re-migrate, re-seed |
| `npm run db:studio` | Open Prisma Studio (browse/edit data) |

## Environment

Create a `.env` file (already included):

```
DATABASE_URL="file:./dev.db"
```

## Local Development

### Database location

The SQLite database file lives at `prisma/dev.db`. It is gitignored and persists across dev server restarts.

### Data safety

- **Restarting the dev server does NOT reset your data.** Your cards and transactions survive `npm run dev` restarts and code changes.
- **`npm run db:seed`** is safe to run — it checks if data already exists and skips if so.
- **`npm run db:reset`** is the ONLY command that wipes data. Use it intentionally when you want a fresh start.
- **`npm run db:studio`** opens Prisma Studio at `http://localhost:5555` where you can browse and edit data directly.

### Setup from scratch

```bash
npm install                  # install dependencies
npx prisma migrate dev       # create SQLite DB + tables
npm run db:seed              # insert sample data (3 cards, 21 transactions)
npm run dev                  # start at http://localhost:3000
```

### Intentionally reset

```bash
npm run db:reset             # wipes DB, re-runs migrations, re-seeds
```

---

## How to test locally

### 1. Install dependencies

```bash
npm install
```

### 2. Run migrations and seed data

```bash
npx prisma migrate dev      # creates SQLite DB + tables
npm run db:seed              # inserts 2 cards (close days 15 and 28) and 17 transactions
```

To start fresh at any point:

```bash
npm run db:reset             # drops DB, re-migrates, re-seeds
```

### 3. Start the dev server

```bash
npm run dev                  # http://localhost:3000
```

### 4. Open Prisma Studio

```bash
npx prisma studio            # http://localhost:5555
```

Prisma Studio lets you browse and edit Card/Transaction rows directly. Useful for verifying seed data or manually inserting edge-case transactions.

### 5. Manual QA checklist

Run `npm run db:seed` first so the checks below have data to work with.

**Close day 15 (Sapphire Reserve)**

- [ ] Go to `/transactions`, filter by Sapphire Reserve + June 2026. Confirm 6 transactions appear (dates 5/16 through 6/15), including the Amazon refund.
- [ ] Filter by July 2026. Confirm 4 transactions appear (dates 6/16 through 7/10). The 6/15 Netflix charge should NOT appear here.
- [ ] On the Dashboard, select Sapphire Reserve + June 2026. Total should be $172.11.

**Close day 31 (edge cases)**

- [ ] In Prisma Studio or via `/cards`, create a test card with close day 31.
- [ ] Add a transaction dated `2026-02-28`. On `/transactions`, confirm its cycle label is "February 2026" (close day 31 clamps to Feb 28).
- [ ] Add a transaction dated `2026-03-01`. Confirm its cycle label is "March 2026" (the March cycle starts on Mar 1 because the Feb cycle ended on Feb 28).
- [ ] Add a transaction dated `2024-02-29` (leap year). Confirm the cycle label is "February 2024".

**Refunds**

- [ ] On `/transactions`, find the Amazon refund (-$15.00) on 6/5. It should display in green.
- [ ] On the Dashboard (Sapphire Reserve, June 2026), confirm Shopping category total is $17.99 (= $32.99 charge minus $15.00 refund), not $32.99.
- [ ] Confirm the overall cycle total ($172.11) is reduced by the refund — without it the total would be $187.11.

**Category and merchant totals**

- [ ] On the Dashboard (Sapphire Reserve, June 2026), verify category breakdown sums to the total: Groceries $87.43 + Transport $45.20 + Shopping $17.99 + Entertainment $15.99 + Dining $5.50 = $172.11.
- [ ] Verify merchant breakdown shows Amazon at $17.99 (net of refund, 2 transactions).

**Card filters**

- [ ] On `/transactions`, switch the card filter from Sapphire Reserve to Gold Card. Confirm only Gold Card transactions appear.
- [ ] On the Dashboard, switch to Gold Card. Confirm the cycle dropdown updates to reflect close day 28 cycles (e.g., June 2026 = May 29 – Jun 28).
- [ ] Clear the card filter on `/transactions`. Confirm transactions from both cards appear.

**Empty states**

- [ ] On `/transactions`, pick a cycle with no transactions. Confirm an empty state message appears instead of a broken table.
- [ ] Delete all cards (via `/cards`). Confirm the Dashboard shows a "Welcome" prompt instead of empty charts.

**Unit tests**

```bash
npm test                     # should report 24 passing tests
```

Covers cycle math (close day 15 boundaries, close day 31 in Feb, leap year 2024-02-29, Dec→Jan rollover) and money utilities (toCents, fromCents, formatUSD with negatives).

---

## Architecture

- **Next.js** (App Router) — single codebase for UI + API
- **SQLite** via Prisma — zero-ops database
- **Tailwind CSS** — styling
- **Recharts** — charts (pie, bar, trend)
- **Zod** — request validation
- **Vitest** — unit tests

### Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard — summary cards, category pie, merchant bars, cycle trend |
| `/cards` | Card management (CRUD) |
| `/transactions` | Transaction list with filters |

### Conventions

**Money in cents.** All amounts are stored and computed as integer cents (`amountCents: Int`). Conversion to dollars happens only at the API/UI boundary. This eliminates floating-point rounding bugs.

**Date-only strings.** Dates are `YYYY-MM-DD` strings with no timezone. A purchase happens on a calendar day, not an instant.

**Derived cycles.** The cycle a transaction belongs to is computed from `(date, card.statementCloseDay)` — never stored. Changing a card's close day instantly re-buckets all transactions.

### Cycle Rule

A cycle is named by the month its statement closes. For close day 15:

| Transaction range | Belongs to cycle |
|---|---|
| May 16 – Jun 15 | June 2026 (closes Jun 15) |
| Jun 16 – Jul 15 | July 2026 (closes Jul 15) |

Close day 31 in February clamps to Feb 28 (or 29 in leap years). Cycles are always contiguous with no gaps or overlaps.

### API

All monetary values in API responses are in **cents**. Endpoints:

- `GET/POST /api/cards` — list/create cards
- `GET/PATCH/DELETE /api/cards/:id` — single card
- `GET /api/cards/:id/cycles` — cycle list for dropdowns
- `GET/POST /api/transactions` — list (with filters)/create
- `GET/PATCH/DELETE /api/transactions/:id` — single transaction
- `GET /api/summary` — aggregations (total, byCategory, byMerchant, byCard)
- `GET /api/summary/trend` — per-cycle totals for trend chart

Refunds are negative `amountCents` values and correctly reduce category/merchant/total sums.
