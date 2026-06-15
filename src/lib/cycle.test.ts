import { describe, it, expect } from 'vitest'
import { getCycleForDate, getCycleRange, daysInMonth, listRecentCycles } from './cycle'

describe('daysInMonth', () => {
  it('returns 28 for Feb 2026 (non-leap)', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
  })
  it('returns 29 for Feb 2024 (leap year)', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
  })
  it('returns 31 for January', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
  })
  it('returns 30 for April', () => {
    expect(daysInMonth(2026, 4)).toBe(30)
  })
})

describe('getCycleForDate — close day 15', () => {
  const cd = 15

  it('5/16 → June cycle (2026-06), range 05-16..06-15', () => {
    const c = getCycleForDate('2026-05-16', cd)
    expect(c.key).toBe('2026-06')
    expect(c.startDate).toBe('2026-05-16')
    expect(c.endDate).toBe('2026-06-15')
  })

  it('6/15 (exactly on close day) → June cycle', () => {
    const c = getCycleForDate('2026-06-15', cd)
    expect(c.key).toBe('2026-06')
  })

  it('6/16 → July cycle (2026-07), range 06-16..07-15', () => {
    const c = getCycleForDate('2026-06-16', cd)
    expect(c.key).toBe('2026-07')
    expect(c.startDate).toBe('2026-06-16')
    expect(c.endDate).toBe('2026-07-15')
  })

  it('December 20 → January next year (2027-01), range 12-16..01-15', () => {
    const c = getCycleForDate('2026-12-20', cd)
    expect(c.key).toBe('2027-01')
    expect(c.startDate).toBe('2026-12-16')
    expect(c.endDate).toBe('2027-01-15')
  })
})

describe('getCycleForDate — close day 31 (month-end clamping)', () => {
  const cd = 31

  it('Feb 28 in non-leap year → Feb cycle (2026-02), range 02-01..02-28', () => {
    const c = getCycleForDate('2026-02-28', cd)
    expect(c.key).toBe('2026-02')
    expect(c.startDate).toBe('2026-02-01')
    expect(c.endDate).toBe('2026-02-28')
  })

  it('Feb 29 in leap year 2024 → Feb cycle (2024-02)', () => {
    const c = getCycleForDate('2024-02-29', cd)
    expect(c.key).toBe('2024-02')
    expect(c.endDate).toBe('2024-02-29')
  })

  it('cycles are contiguous: Jan end+1 = Feb start for close day 31', () => {
    const jan = getCycleRange(2026, 1, 31)
    const feb = getCycleRange(2026, 2, 31)
    // Jan ends 01-31, Feb starts 02-01
    expect(jan.endDate).toBe('2026-01-31')
    expect(feb.startDate).toBe('2026-02-01')
  })

  it('March 31 with close day 30 → April cycle', () => {
    const c = getCycleForDate('2026-03-31', 30)
    expect(c.key).toBe('2026-04')
    expect(c.startDate).toBe('2026-03-31')
    expect(c.endDate).toBe('2026-04-30')
  })
})

describe('getCycleRange is inverse of getCycleForDate', () => {
  it('range for a dates computed cycle always contains that date', () => {
    const testCases = [
      { date: '2026-01-01', cd: 15 },
      { date: '2026-06-15', cd: 15 },
      { date: '2026-06-16', cd: 15 },
      { date: '2026-12-31', cd: 15 },
      { date: '2026-02-28', cd: 31 },
      { date: '2024-02-29', cd: 31 },
      { date: '2026-03-31', cd: 30 },
      { date: '2026-11-30', cd: 30 },
    ]
    for (const { date, cd } of testCases) {
      const cycle = getCycleForDate(date, cd)
      const [closeY, closeM] = cycle.key.split('-').map(Number)
      const range = getCycleRange(closeY, closeM, cd)
      expect(date >= range.startDate && date <= range.endDate).toBe(true)
    }
  })
})

describe('listRecentCycles', () => {
  it('returns requested count of cycles, newest first', () => {
    const cycles = listRecentCycles(15, 3, new Date(Date.UTC(2026, 5, 10)))
    expect(cycles).toHaveLength(3)
    expect(cycles[0].key).toBe('2026-06')
    expect(cycles[1].key).toBe('2026-05')
    expect(cycles[2].key).toBe('2026-04')
  })

  it('handles year boundary', () => {
    const cycles = listRecentCycles(15, 3, new Date(Date.UTC(2026, 0, 10)))
    expect(cycles[0].key).toBe('2026-01')
    expect(cycles[1].key).toBe('2025-12')
    expect(cycles[2].key).toBe('2025-11')
  })
})
