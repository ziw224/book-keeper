export function toCents(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100)
  }
  const cleaned = input.replace(/[$,\s]/g, '')
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return Math.round(parseFloat(cleaned) * 100)
  }
  if (/^[\d.+\-*/()]+$/.test(cleaned) && /\d/.test(cleaned)) {
    try {
      const result = Function(`"use strict"; return (${cleaned})`)()
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Expression did not produce a valid number')
      }
      return Math.round(result * 100)
    } catch {
      throw new Error(`Invalid monetary expression: "${input}"`)
    }
  }
  throw new Error(`Invalid monetary value: "${input}"`)
}

export function fromCents(cents: number): number {
  return cents / 100
}

export function formatUSD(cents: number): string {
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const remaining = abs % 100
  const formatted = `$${dollars.toLocaleString('en-US')}.${String(remaining).padStart(2, '0')}`
  return cents < 0 ? `-${formatted}` : formatted
}
