export function toCents(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100)
  }
  const cleaned = input.replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) throw new Error(`Invalid monetary value: "${input}"`)
  return Math.round(num * 100)
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
