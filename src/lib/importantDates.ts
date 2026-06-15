export interface PaycheckRule {
  id: string;
  label: string;
  frequency: 'monthly' | 'twice_monthly';
  dayOfMonth: number;
  secondDayOfMonth?: number;
}

const STORAGE_KEY = 'cardcycle_paycheck_rules';

export function getPaycheckRules(): PaycheckRule[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function savePaycheckRules(rules: PaycheckRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function generatePaycheckDates(rules: PaycheckRule[]): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  for (const rule of rules) {
    for (let offset = -2; offset <= 3; offset++) {
      const dt = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const y = dt.getFullYear(), m = dt.getMonth() + 1;
      const dim = new Date(y, m, 0).getDate();

      const day1 = Math.min(rule.dayOfMonth, dim);
      out.push({ date: `${y}-${pad(m)}-${pad(day1)}`, label: rule.label });

      if (rule.frequency === 'twice_monthly' && rule.secondDayOfMonth) {
        const day2 = Math.min(rule.secondDayOfMonth, dim);
        out.push({ date: `${y}-${pad(m)}-${pad(day2)}`, label: rule.label });
      }
    }
  }

  return out;
}
