import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { transactionCreateSchema, transactionFilterSchema } from '@/lib/validation'
import { getCycleForDate, getCycleRange } from '@/lib/cycle'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawParams: Record<string, string> = {}
  searchParams.forEach((v, k) => { rawParams[k] = v })

  const parsed = transactionFilterSchema.safeParse(rawParams)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  const { cardId, cycle, category, from, to } = parsed.data

  const where: Record<string, unknown> = {}
  if (cardId) where.cardId = cardId
  if (category) where.category = category

  if (cycle && cardId) {
    const [cy, cm] = cycle.split('-').map(Number)
    const card = await prisma.card.findUnique({ where: { id: cardId } })
    if (card) {
      const range = getCycleRange(cy, cm, card.statementCloseDay)
      where.date = { ...(where.date as object || {}), gte: range.startDate, lte: range.endDate }
    }
  } else if (from || to) {
    const dateFilter: Record<string, string> = {}
    if (from) dateFilter.gte = from
    if (to) dateFilter.lte = to
    where.date = dateFilter
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { card: { select: { id: true, name: true, statementCloseDay: true } } },
    orderBy: { date: 'desc' },
  })

  const withCycle = transactions.map((t) => {
    const c = getCycleForDate(t.date, t.card.statementCloseDay)
    return { ...t, cycleKey: c.key, cycleLabel: c.label }
  })

  return NextResponse.json(withCycle)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = transactionCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  const card = await prisma.card.findUnique({ where: { id: parsed.data.cardId } })
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  const txn = await prisma.transaction.create({
    data: parsed.data,
    include: { card: { select: { id: true, name: true, statementCloseDay: true } } },
  })
  const cycle = getCycleForDate(txn.date, txn.card.statementCloseDay)

  return NextResponse.json({ ...txn, cycleKey: cycle.key, cycleLabel: cycle.label }, { status: 201 })
}
