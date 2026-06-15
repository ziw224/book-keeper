import { prisma } from '@/lib/db'
import { getCycleRange, getCycleForDate } from '@/lib/cycle'
import { SummaryBucket } from '@/types'

interface SummaryParams {
  cardId?: string
  cycleKey?: string
  from?: string
  to?: string
}

export async function getSummary(params: SummaryParams) {
  const { cardId, cycleKey, from, to } = params

  let startDate: string | undefined
  let endDate: string | undefined
  let cycleInfo = null

  if (cycleKey && cardId) {
    const card = await prisma.card.findUnique({ where: { id: cardId } })
    if (card) {
      const [cy, cm] = cycleKey.split('-').map(Number)
      const range = getCycleRange(cy, cm, card.statementCloseDay)
      startDate = range.startDate
      endDate = range.endDate
      cycleInfo = range
    }
  } else if (from || to) {
    startDate = from
    endDate = to
  }

  const where: Record<string, unknown> = {}
  if (cardId) where.cardId = cardId
  if (startDate || endDate) {
    const dateFilter: Record<string, string> = {}
    if (startDate) dateFilter.gte = startDate
    if (endDate) dateFilter.lte = endDate
    where.date = dateFilter
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { card: { select: { id: true, name: true, statementCloseDay: true } } },
  })

  let total = 0
  const catMap = new Map<string, { total: number; count: number }>()
  const merchMap = new Map<string, { total: number; count: number }>()
  const cardMap = new Map<string, { cardId: string; name: string; total: number }>()

  for (const t of transactions) {
    total += t.amountCents

    const cat = catMap.get(t.category) || { total: 0, count: 0 }
    cat.total += t.amountCents
    cat.count += 1
    catMap.set(t.category, cat)

    const merch = merchMap.get(t.merchant) || { total: 0, count: 0 }
    merch.total += t.amountCents
    merch.count += 1
    merchMap.set(t.merchant, merch)

    const cardEntry = cardMap.get(t.card.id) || { cardId: t.card.id, name: t.card.name, total: 0 }
    cardEntry.total += t.amountCents
    cardMap.set(t.card.id, cardEntry)
  }

  const byCategory: SummaryBucket[] = [...catMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)

  const byMerchant: SummaryBucket[] = [...merchMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)

  const byCard = [...cardMap.values()].sort((a, b) => b.total - a.total)

  return { total, byCategory, byMerchant, byCard, cycle: cycleInfo }
}

export async function getTrend(cardId: string, count = 6) {
  const card = await prisma.card.findUnique({ where: { id: cardId } })
  if (!card) return []

  const now = new Date()
  const refIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  const current = getCycleForDate(refIso, card.statementCloseDay)
  let [cy, cm] = current.key.split('-').map(Number)

  const result = []
  for (let i = 0; i < count; i++) {
    const range = getCycleRange(cy, cm, card.statementCloseDay)
    const txns = await prisma.transaction.findMany({
      where: {
        cardId,
        date: { gte: range.startDate, lte: range.endDate },
      },
    })
    const total = txns.reduce((sum, t) => sum + t.amountCents, 0)
    result.push({ key: range.key, label: range.label, total })

    cm -= 1
    if (cm < 1) { cm = 12; cy -= 1 }
  }

  return result
}
