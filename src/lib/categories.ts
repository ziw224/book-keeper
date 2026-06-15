/**
 * CardCycle — shared category list + colors + icons.
 * Supports user-created custom categories stored in localStorage.
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

export interface CustomCategory {
  name: string;
  icon: string;
  color: string;
}

const CUSTOM_KEY = 'cardcycle_custom_categories';
const CUSTOM_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#14b8a6', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#a855f7'];

export function getCustomCategories(): CustomCategory[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
  } catch { return []; }
}

export function addCustomCategory(name: string, icon: string): CustomCategory {
  const existing = getCustomCategories();
  const color = CUSTOM_COLORS[existing.length % CUSTOM_COLORS.length];
  const cat: CustomCategory = { name, icon, color };
  localStorage.setItem(CUSTOM_KEY, JSON.stringify([...existing.filter(c => c.name !== name), cat]));
  return cat;
}

export function getAllCategories(): string[] {
  const custom = getCustomCategories();
  return [...SUGGESTED_CATEGORIES, ...custom.map(c => c.name)];
}

export function categoryColor(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  const custom = getCustomCategories().find(c => c.name === name);
  return custom?.color ?? '#888780';
}

export function categoryIcon(name: string): string {
  if (CATEGORY_ICONS[name]) return CATEGORY_ICONS[name];
  const custom = getCustomCategories().find(c => c.name === name);
  return custom?.icon ?? '📦';
}
