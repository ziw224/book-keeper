import { describe, it, expect } from 'vitest'
import { generateOccurrences } from './recurring'

describe('generateOccurrences — monthly', () => {
  it('generates monthly occurrences from start through end', () => {
    const results = generateOccurrences('monthly', 15, '2026-06-15', null, '2026-09-30', new Set())
    expect(results.map(r => r.date)).toEqual([
      '2026-06-15', '2026-07-15', '2026-08-15', '2026-09-15',
    ])
  })

  it('clamps day 31 to end of month (Feb 28)', () => {
    const results = generateOccurrences('monthly', 31, '2026-01-31', null, '2026-04-30', new Set())
    expect(results.map(r => r.date)).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30',
    ])
  })

  it('handles leap year Feb 29', () => {
    const results = generateOccurrences('monthly', 31, '2024-01-31', null, '2024-03-31', new Set())
    expect(results.map(r => r.date)).toEqual([
      '2024-01-31', '2024-02-29', '2024-03-31',
    ])
  })

  it('skips already-existing dates', () => {
    const existing = new Set(['2026-07-15'])
    const results = generateOccurrences('monthly', 15, '2026-06-15', null, '2026-08-15', existing)
    expect(results.map(r => r.date)).toEqual(['2026-06-15', '2026-08-15'])
  })

  it('respects endDate', () => {
    const results = generateOccurrences('monthly', 1, '2026-06-01', '2026-08-01', '2026-12-31', new Set())
    expect(results.map(r => r.date)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01'])
  })

  it('returns empty for inactive (no recurringDay)', () => {
    const results = generateOccurrences('monthly', null, '2026-06-01', null, '2026-12-31', new Set())
    expect(results).toEqual([])
  })
})

describe('generateOccurrences — yearly', () => {
  it('generates yearly occurrences', () => {
    const results = generateOccurrences('yearly', 15, '2026-06-15', null, '2028-12-31', new Set())
    expect(results.map(r => r.date)).toEqual(['2026-06-15', '2027-06-15', '2028-06-15'])
  })
})
