import { describe, it, expect } from 'vitest'
import { normalizeMerchant, findCanonicalMerchant } from './merchant'

describe('normalizeMerchant', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeMerchant('  whole   foods  ')).toBe('whole foods')
  })
  it('lowercases', () => {
    expect(normalizeMerchant('Whole Foods')).toBe('whole foods')
    expect(normalizeMerchant('WHOLE FOODS')).toBe('whole foods')
  })
})

describe('findCanonicalMerchant', () => {
  const existing = ['Whole Foods', 'Amazon', 'Starbucks']

  it('returns canonical when normalized match exists', () => {
    expect(findCanonicalMerchant('whole foods', existing)).toBe('Whole Foods')
    expect(findCanonicalMerchant('WHOLE FOODS', existing)).toBe('Whole Foods')
    expect(findCanonicalMerchant('  amazon  ', existing)).toBe('Amazon')
  })

  it('returns cleaned input when no match', () => {
    expect(findCanonicalMerchant('  New  Store  ', existing)).toBe('New Store')
  })
})
