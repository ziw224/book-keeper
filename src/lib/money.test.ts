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
  it('evaluates addition expression', () => {
    expect(toCents('225.4+3.99')).toBe(22939)
  })
  it('evaluates subtraction expression', () => {
    expect(toCents('100-25.50')).toBe(7450)
  })
  it('evaluates multiplication expression', () => {
    expect(toCents('3*4.5')).toBe(1350)
  })
  it('evaluates complex expression', () => {
    expect(toCents('10+20+5.99')).toBe(3599)
  })
  it('evaluates negative result expression', () => {
    expect(toCents('-10+3')).toBe(-700)
  })
})

describe('fromCents', () => {
  it('converts cents to dollars', () => {
    expect(fromCents(1234)).toBe(12.34)
  })
})

describe('formatUSD', () => {
  it('formats positive with plus sign', () => {
    expect(formatUSD(123456)).toBe('+$1,234.56')
  })
  it('formats negative with minus sign', () => {
    expect(formatUSD(-500)).toBe('-$5.00')
  })
  it('formats zero', () => {
    expect(formatUSD(0)).toBe('$0.00')
  })
})
