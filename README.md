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
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Reset DB and re-seed |

## Environment

Create a `.env` file (already included):

```
DATABASE_URL="file:./dev.db"
```

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
