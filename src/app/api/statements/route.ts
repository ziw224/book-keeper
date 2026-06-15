import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCycleRange } from '@/lib/cycle'

export async function GET() {
  const balances = await prisma.statementBalance.findMany({
    include: { card: { select: { id: true, name: true, last4: true, statementCloseDay: true } } },
    orderBy: { cycleKey: 'desc' },
  })

  const withDetails = await Promise.all(balances.map(async (sb) => {
    const txns = await prisma.transaction.findMany({
      where: { cardId: sb.cardId, date: { gte: sb.cycleStartDate, lte: sb.cycleEndDate } },
    })
    const manualTotal = txns.reduce((s, t) => s + t.amountCents, 0)
    const adjustment = sb.statementTotalCents - manualTotal
    const status = adjustment === 0 ? 'reconciled' : Math.abs(adjustment) < 100 ? 'reconciled' : manualTotal < sb.statementTotalCents ? 'over-entered' : 'incomplete'
    return { ...sb, manualTotal, adjustment, status }
  }))

  return NextResponse.json(withDetails)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cardId, cycleKey, statementTotalCents, notes } = body

  if (!cardId || !cycleKey || statementTotalCents == null) {
    return NextResponse.json({ error: 'cardId, cycleKey, and statementTotalCents are required' }, { status: 400 })
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } })
  if (!card || card.type !== 'credit' || !card.statementCloseDay) {
    return NextResponse.json({ error: 'Card not found or not a credit card' }, { status: 404 })
  }

  const [y, m] = cycleKey.split('-').map(Number)
  const range = getCycleRange(y, m, card.statementCloseDay)

  const sb = await prisma.statementBalance.upsert({
    where: { cardId_cycleKey: { cardId, cycleKey } },
    create: {
      cardId,
      cycleKey,
      cycleStartDate: range.startDate,
      cycleEndDate: range.endDate,
      statementTotalCents,
      notes: notes || null,
    },
    update: {
      statementTotalCents,
      notes: notes || null,
    },
  })

  return NextResponse.json(sb, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await prisma.statementBalance.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
