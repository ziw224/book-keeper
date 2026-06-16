import { describe, it, expect } from 'vitest'
import { kindOf, computeSummary, rollup, visibleRows, isUpcoming } from './txn'

const expense = (amountCents: number, category = 'Dining', merchant = 'Test', date = '2026-06-01') =>
  ({ id: `e-${date}-${merchant}`, merchant, amountCents, category, date, isStatementAdjustment: false })

const income = (amountCents: number, date = '2026-06-01') =>
  ({ id: `i-${date}`, merchant: 'Paycheck', amountCents, category: 'Other', date, isStatementAdjustment: false })

const adjustment = (amountCents: number) =>
  ({ id: '3', merchant: 'Statement Adjustment', amountCents, category: 'Other', date: '2026-06-01', isStatementAdjustment: true, paymentStatus: 'pending' })

const futureDate = '2099-12-31'

describe('kindOf', () => {
  it('classifies expense', () => expect(kindOf(expense(-1000))).toBe('expense'))
  it('classifies income', () => expect(kindOf(income(3000))).toBe('income'))
  it('classifies adjustment', () => expect(kindOf(adjustment(-500))).toBe('adjustment'))
})

describe('isUpcoming', () => {
  it('past date is not upcoming', () => expect(isUpcoming(expense(-1000, 'Dining', 'X', '2020-01-01'))).toBe(false))
  it('future date is upcoming', () => expect(isUpcoming(expense(-1000, 'Dining', 'X', futureDate))).toBe(true))
})

describe('computeSummary', () => {
  it('sums expenses and income, excludes adjustments', () => {
    const rows = [expense(-5000), expense(-3000), income(10000), adjustment(-2000)]
    const s = computeSummary(rows)
    expect(s.spent).toBe(8000)
    expect(s.income).toBe(10000)
    expect(s.net).toBe(2000)
    expect(s.count).toBe(3)
  })

  it('handles refund as income', () => {
    const rows = [expense(-5000), { ...expense(1500), amountCents: 1500 }]
    const s = computeSummary(rows)
    expect(s.spent).toBe(5000)
    expect(s.income).toBe(1500)
  })

  it('excludes upcoming expense from spent/count', () => {
    const rows = [expense(-5000), expense(-3000, 'Dining', 'Future', futureDate)]
    const s = computeSummary(rows)
    expect(s.spent).toBe(5000)
    expect(s.count).toBe(1)
  })

  it('excludes upcoming income from income/count', () => {
    const rows = [income(10000), income(5000, futureDate)]
    const s = computeSummary(rows)
    expect(s.income).toBe(10000)
    expect(s.count).toBe(1)
  })

  it('excludes upcoming recurring from all totals', () => {
    const recurring = { ...expense(-2000, 'Dining', 'Netflix', futureDate), recurringRuleId: 'rule1' }
    const rows = [expense(-5000), recurring]
    const s = computeSummary(rows)
    expect(s.spent).toBe(5000)
    expect(s.count).toBe(1)
  })
})

describe('rollup', () => {
  it('groups by category with correct totals and shares', () => {
    const rows = [
      expense(-5000, 'Dining', 'A'),
      expense(-3000, 'Dining', 'B'),
      expense(-2000, 'Transport', 'C'),
    ]
    const groups = rollup(rows, 'category')
    expect(groups).toHaveLength(2)
    expect(groups[0].key).toBe('Dining')
    expect(groups[0].total).toBe(8000)
    expect(groups[0].count).toBe(2)
    expect(groups[0].share).toBeCloseTo(0.8)
    expect(groups[1].key).toBe('Transport')
    expect(groups[1].total).toBe(2000)
    expect(groups[1].share).toBeCloseTo(0.2)
  })

  it('excludes non-expense rows', () => {
    const rows = [expense(-5000), income(3000), adjustment(-1000)]
    const groups = rollup(rows, 'category')
    expect(groups).toHaveLength(1)
    expect(groups[0].total).toBe(5000)
  })

  it('returns empty for none grouping', () => {
    expect(rollup([expense(-1000)], 'none')).toEqual([])
  })

  it('excludes upcoming from group total/count but keeps in rows', () => {
    const rows = [
      expense(-5000, 'Dining', 'Past'),
      expense(-3000, 'Dining', 'Future', futureDate),
    ]
    const groups = rollup(rows, 'category')
    expect(groups).toHaveLength(1)
    expect(groups[0].total).toBe(5000)
    expect(groups[0].count).toBe(1)
    expect(groups[0].rows).toHaveLength(2)
  })

  it('sorts upcoming rows to end of group', () => {
    const rows = [
      expense(-5000, 'Dining', 'Past', '2026-06-01'),
      expense(-3000, 'Dining', 'Future', futureDate),
    ]
    const groups = rollup(rows, 'category')
    expect(groups[0].rows[0].merchant).toBe('Past')
    expect(groups[0].rows[1].merchant).toBe('Future')
  })
})

describe('visibleRows', () => {
  const rows = [expense(-1000), income(500), adjustment(-200)]

  it('default: shows only expenses', () => {
    const v = visibleRows(rows, { showIncome: false, showAdjustments: false, recurringOnly: false })
    expect(v).toHaveLength(1)
    expect(v[0].amountCents).toBe(-1000)
  })

  it('showIncome adds income', () => {
    const v = visibleRows(rows, { showIncome: true, showAdjustments: false, recurringOnly: false })
    expect(v).toHaveLength(2)
  })

  it('showAdjustments adds adjustments', () => {
    const v = visibleRows(rows, { showIncome: false, showAdjustments: true, recurringOnly: false })
    expect(v).toHaveLength(2)
  })
})
