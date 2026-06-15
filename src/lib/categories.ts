/**
 * CardCycle — shared category list + colors.
 * Single source of truth so a category renders the same color on every page
 * (dashboard legend, transaction dots, etc.). Dashboard.tsx can adopt
 * `categoryColor()` too for cross-page consistency.
 */

export const SUGGESTED_CATEGORIES = [
  'Dining',
  'Groceries',
  'Transport',
  'Shopping',
  'Travel',
  'Utilities',
  'Entertainment',
  'Health',
  'Fees',
  'Other',
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Dining: '#1D9E75',
  Groceries: '#EF9F27',
  Transport: '#7F77DD',
  Shopping: '#D85A30',
  Travel: '#378ADD',
  Utilities: '#0F6E56',
  Entertainment: '#D4537E',
  Health: '#639922',
  Fees: '#A32D2D',
  Other: '#888780',
};

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? '#888780';
}

const CATEGORY_ICONS: Record<string, string> = {
  Dining: '🍽️',
  Groceries: '🛒',
  Transport: '🚗',
  Shopping: '🛍️',
  Travel: '✈️',
  Utilities: '💡',
  Entertainment: '🎬',
  Health: '💊',
  Fees: '🏦',
  Other: '📦',
};

export function categoryIcon(name: string): string {
  return CATEGORY_ICONS[name] ?? '📦';
}
