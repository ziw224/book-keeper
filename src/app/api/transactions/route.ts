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
    const card = await prisma.card.findUnique({ where: { id: cardId } })
    if (card && card.type === 'credit' && card.statementCloseDay != null) {
      const [cy, cm] = cycle.split('-').map(Number)
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
    include: { card: { select: { id: true, name: true, type: true, statementCloseDay: true } } },
    orderBy: { date: 'desc' },
  })

  const withCycle = transactions.map((t) => {
    if (t.card.type === 'credit' && t.card.statementCloseDay != null) {
      const c = getCycleForDate(t.date, t.card.statementCloseDay)
      return { ...t, cycleKey: c.key, cycleLabel: c.label, isStatementAdjustment: false }
    }
    return { ...t, cycleKey: null, cycleLabel: null, isStatementAdjustment: false }
  })

  try {
    const stmtBalances = await prisma.statementBalance.findMany({
      include: { card: { select: { id: true, name: true, type: true, statementCloseDay: true, paymentDueDay: true } } },
    })

    const pad2 = (n: number) => String(n).padStart(2, '0')
    const MONTH_NAMES = ['','January','February','March','April','May','June','July','August','September','October','November','December']

    for (const sb of stmtBalances) {
      if (cardId && sb.cardId !== cardId) continue
      const cycleTxns = transactions.filter(t => t.cardId === sb.cardId && t.date >= sb.cycleStartDate && t.date <= sb.cycleEndDate)
      const manualTotal = cycleTxns.reduce((s, t) => s + t.amountCents, 0)
      const adjustment = sb.statementTotalCents - manualTotal
      if (adjustment !== 0) {
        let adjDate = sb.cycleEndDate
        if (sb.card.paymentDueDay) {
          const [closeY, closeM] = sb.cycleKey.split('-').map(Number)
          let dueM = closeM + 1, dueY = closeY
          if (dueM > 12) { dueM = 1; dueY++ }
          const dim = new Date(dueY, dueM, 0).getDate()
          const dueD = Math.min(sb.card.paymentDueDay, dim)
          adjDate = `${dueY}-${pad2(dueM)}-${pad2(dueD)}`
        }
        withCycle.push({
          id: `stmt-adj-${sb.id}`,
          cardId: sb.cardId,
          date: adjDate,
          merchant: 'Statement Adjustment',
          amountCents: adjustment,
          category: 'Other',
          notes: `Unentered ${sb.card.name} statement balance`,
          recurringRuleId: null,
          recurringRule: null,
          isRecurringGenerated: false,
          recurringOccurrenceDate: null,
          card: sb.card,
          cycleKey: sb.cycleKey,
          cycleLabel: `${MONTH_NAMES[Number(sb.cycleKey.split('-')[1])]} ${sb.cycleKey.split('-')[0]}`,
          isStatementAdjustment: true,
          isPending: sb.paymentStatus === 'pending',
          paymentStatus: sb.paymentStatus,
          paidDate: sb.paidDate,
          statementBalanceId: sb.id,
          createdAt: sb.createdAt,
          updatedAt: sb.updatedAt,
        } as typeof withCycle[0])
      }
    }
  } catch {
    // Statement balance table may not exist yet — skip adjustments
  }

  withCycle.sort((a, b) => b.date.localeCompare(a.date))

  return NextResponse.json(withCycle)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { recurring, recurringFrequency, recurringDay, recurringEndDate, ...txnBody } = body

  const parsed = transactionCreateSchema.safeParse(txnBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  const card = await prisma.card.findUnique({ where: { id: parsed.data.cardId } })
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  let recurringRuleId: string | undefined

  if (recurring) {
    const rule = await prisma.recurringRule.create({
      data: {
        merchant: parsed.data.merchant,
        amountCents: parsed.data.amountCents,
        category: parsed.data.category,
        cardId: parsed.data.cardId,
        notes: parsed.data.notes,
        frequency: recurringFrequency || 'monthly',
        recurringDay: recurringDay ?? parseInt(parsed.data.date.split('-')[2], 10),
        startDate: parsed.data.date,
        endDate: recurringEndDate || null,
      },
    })
    recurringRuleId = rule.id
  }

  const txn = await prisma.transaction.create({
    data: {
      ...parsed.data,
      recurringRuleId: recurringRuleId || null,
      isRecurringGenerated: false,
      recurringOccurrenceDate: recurringRuleId ? parsed.data.date : null,
    },
    include: { card: { select: { id: true, name: true, type: true, statementCloseDay: true } } },
  })

  if (card.type === 'credit' && card.statementCloseDay != null) {
    const cycle = getCycleForDate(txn.date, card.statementCloseDay)
    return NextResponse.json({ ...txn, cycleKey: cycle.key, cycleLabel: cycle.label }, { status: 201 })
  }

  return NextResponse.json({ ...txn, cycleKey: null, cycleLabel: null }, { status: 201 })
}
