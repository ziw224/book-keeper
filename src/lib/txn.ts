import { categoryColor } from '@/lib/categories'

export type TxnKind = 'expense' | 'income' | 'adjustment'

export interface TxnRow {
  id: string
  merchant: string
  amountCents: number
  category: string
  date: string
  isStatementAdjustment?: boolean
  isRecurringGenerated?: boolean
  recurringRuleId?: string | null
  paymentStatus?: string
  [key: string]: unknown
}

export function kindOf(t: TxnRow): TxnKind {
  if (t.isStatementAdjustment) return 'adjustment'
  return t.amountCents < 0 ? 'expense' : 'income'
}

function todayStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export function isUpcoming(t: TxnRow): boolean {
  return t.date > todayStr()
}

export interface ViewState {
  showIncome: boolean
  showAdjustments: boolean
  recurringOnly: boolean
}

export function visibleRows(rows: TxnRow[], view: ViewState): TxnRow[] {
  return rows.filter(t => {
    const kind = kindOf(t)
    if (kind === 'adjustment') return view.showAdjustments
    if (kind === 'income') return view.showIncome
    if (view.recurringOnly) return !!t.recurringRuleId
    return true
  })
}

export interface Summary {
  spent: number
  income: number
  net: number
  count: number
}

export function computeSummary(rows: TxnRow[]): Summary {
  let spent = 0, income = 0, count = 0
  for (const t of rows) {
    if (isUpcoming(t)) continue
    const kind = kindOf(t)
    if (kind === 'adjustment') continue
    if (kind === 'expense') { spent += -t.amountCents; count++ }
    else { income += t.amountCents; count++ }
  }
  return { spent, income, net: income - spent, count }
}

export interface RollupGroup {
  key: string
  label: string
  color: string
  total: number
  share: number
  count: number
  rows: TxnRow[]
}

export type GroupBy = 'category' | 'merchant' | 'card' | 'none'

export function rollup(expenses: TxnRow[], groupBy: GroupBy): RollupGroup[] {
  if (groupBy === 'none') return []

  const map = new Map<string, { label: string; color: string; total: number; count: number; rows: TxnRow[] }>()

  for (const t of expenses) {
    if (kindOf(t) !== 'expense') continue
    let key: string, label: string, color: string

    if (groupBy === 'category') {
      key = t.category
      label = t.category
      color = categoryColor(t.category)
    } else if (groupBy === 'merchant') {
      key = t.merchant
      label = t.merchant
      color = '#6366f1'
    } else {
      const card = t.card as { id: string; name: string; last4?: string } | undefined
      key = card?.id || t.cardId as string || 'unknown'
      label = card ? `${card.name}${card.last4 ? ` •••• ${card.last4}` : ''}` : 'Unknown'
      color = '#6366f1'
    }

    const upcoming = isUpcoming(t)
    const g = map.get(key) || { label, color, total: 0, count: 0, rows: [] }
    if (!upcoming) {
      g.total += -t.amountCents
      g.count += 1
    }
    g.rows.push(t)
    map.set(key, g)
  }

  const totalSpent = [...map.values()].reduce((s, g) => s + g.total, 0)

  return [...map.entries()]
    .map(([key, g]) => ({
      key,
      label: g.label,
      color: g.color,
      total: g.total,
      share: totalSpent > 0 ? g.total / totalSpent : 0,
      count: g.count,
      rows: g.rows.sort((a, b) => {
        const aUp = isUpcoming(a), bUp = isUpcoming(b)
        if (aUp !== bUp) return aUp ? 1 : -1
        return b.date.localeCompare(a.date)
      }),
    }))
    .filter(g => g.count > 0 || g.rows.length > 0)
    .sort((a, b) => b.total - a.total)
}
