const pad = (n: number) => String(n).padStart(2, '0');

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export interface RecurringOccurrence {
  date: string;
}

export function generateOccurrences(
  frequency: string,
  recurringDay: number | null,
  startDate: string,
  endDate: string | null,
  throughDate: string,
  existingDates: Set<string>,
): RecurringOccurrence[] {
  const out: RecurringOccurrence[] = [];
  const end = endDate && endDate < throughDate ? endDate : throughDate;

  if (frequency === 'monthly') {
    if (recurringDay == null) return out;
    const [sy, sm] = startDate.split('-').map(Number);
    let y = sy, m = sm;
    for (let i = 0; i < 120; i++) {
      const dim = daysInMonth(y, m);
      const day = Math.min(recurringDay, dim);
      const d = `${y}-${pad(m)}-${pad(day)}`;
      if (d >= startDate && d <= end && !existingDates.has(d)) {
        out.push({ date: d });
      }
      if (d > end) break;
      m++;
      if (m > 12) { m = 1; y++; }
    }
  } else if (frequency === 'yearly') {
    if (recurringDay == null) return out;
    const [sy, sm] = startDate.split('-').map(Number);
    for (let y = sy; y <= sy + 10; y++) {
      const dim = daysInMonth(y, sm);
      const day = Math.min(recurringDay, dim);
      const d = `${y}-${pad(sm)}-${pad(day)}`;
      if (d >= startDate && d <= end && !existingDates.has(d)) {
        out.push({ date: d });
      }
      if (d > end) break;
    }
  }

  return out;
}
