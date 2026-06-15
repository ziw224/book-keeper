export function normalizeMerchant(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function findCanonicalMerchant(input: string, existing: string[]): string {
  const normalized = normalizeMerchant(input);
  const match = existing.find(m => normalizeMerchant(m) === normalized);
  return match ?? input.trim().replace(/\s+/g, ' ');
}
