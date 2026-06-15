import { describe, it, expect } from 'vitest'
import { toCents, fromCents, formatUSD } from './money'

describe('toCents', () => {
  it('converts dollar string', () => {
    expect(toCents('$1,234.56')).toBe(123456)
  })
  it('converts negative string', () => {
    expect(toCents('-5')).toBe(-500)
  })
  it('converts number', () => {
    expect(toCents(12.34)).toBe(1234)
  })
  it('handles 0.1 without float drift', () => {
    expect(toCents('0.1')).toBe(10)
  })
  it('throws on non-numeric', () => {
    expect(() => toCents('abc')).toThrow()
  })
})

describe('fromCents', () => {
  it('converts cents to dollars', () => {
    expect(fromCents(1234)).toBe(12.34)
  })
})

describe('formatUSD', () => {
  it('formats positive', () => {
    expect(formatUSD(123456)).toBe('$1,234.56')
  })
  it('formats negative (refund)', () => {
    expect(formatUSD(-500)).toBe('-$5.00')
  })
  it('formats zero', () => {
    expect(formatUSD(0)).toBe('$0.00')
  })
})
