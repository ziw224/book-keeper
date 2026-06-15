import { StatementCycle } from '@/types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

export function getCycleForDate(dateStr: string, closeDay: number): StatementCycle {
  const [y, m, d] = dateStr.split('-').map(Number)
  const effClose = Math.min(closeDay, daysInMonth(y, m))

  let closeY = y, closeM = m
  if (d > effClose) {
    closeM += 1
    if (closeM > 12) { closeM = 1; closeY += 1 }
  }

  return buildCycle(closeY, closeM, closeDay)
}

export function getCycleRange(closeY: number, closeM: number, closeDay: number): StatementCycle {
  return buildCycle(closeY, closeM, closeDay)
}

function buildCycle(closeY: number, closeM: number, closeDay: number): StatementCycle {
  const closeD = Math.min(closeDay, daysInMonth(closeY, closeM))
  const endDate = iso(closeY, closeM, closeD)

  let prevY = closeY, prevM = closeM - 1
  if (prevM < 1) { prevM = 12; prevY -= 1 }
  const prevCloseD = Math.min(closeDay, daysInMonth(prevY, prevM))
  let sY = prevY, sM = prevM, sD = prevCloseD + 1
  if (sD > daysInMonth(prevY, prevM)) {
    sD = 1; sM += 1
    if (sM > 12) { sM = 1; sY += 1 }
  }

  return {
    key: `${closeY}-${pad(closeM)}`,
    label: `${MONTHS[closeM - 1]} ${closeY}`,
    startDate: iso(sY, sM, sD),
    endDate,
  }
}

export function listRecentCycles(closeDay: number, count = 6, ref = new Date()): StatementCycle[] {
  const refIso = iso(ref.getUTCFullYear(), ref.getUTCMonth() + 1, ref.getUTCDate())
  const current = getCycleForDate(refIso, closeDay)
  let [cy, cm] = current.key.split('-').map(Number)
  const out: StatementCycle[] = []
  for (let i = 0; i < count; i++) {
    out.push(buildCycle(cy, cm, closeDay))
    cm -= 1
    if (cm < 1) { cm = 12; cy -= 1 }
  }
  return out
}
