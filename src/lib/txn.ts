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

  const map = new Map<string, { label: string; color: string; total: number; rows: TxnRow[] }>()

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

    const g = map.get(key) || { label, color, total: 0, rows: [] }
    g.total += -t.amountCents
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
      count: g.rows.length,
      rows: g.rows.sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => b.total - a.total)
}
