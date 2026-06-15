import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateOccurrences } from '@/lib/recurring'

export async function POST() {
  const today = new Date()
  const throughDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const rules = await prisma.recurringRule.findMany({ where: { isActive: true } })
  let generated = 0

  for (const rule of rules) {
    const existing = await prisma.transaction.findMany({
      where: { recurringRuleId: rule.id },
      select: { recurringOccurrenceDate: true },
    })
    const existingDates = new Set(existing.map(t => t.recurringOccurrenceDate).filter(Boolean) as string[])

    const occurrences = generateOccurrences(
      rule.frequency,
      rule.recurringDay,
      rule.startDate,
      rule.endDate,
      throughDate,
      existingDates,
    )

    for (const occ of occurrences) {
      await prisma.transaction.create({
        data: {
          cardId: rule.cardId,
          date: occ.date,
          merchant: rule.merchant,
          amountCents: rule.amountCents,
          category: rule.category,
          notes: rule.notes,
          recurringRuleId: rule.id,
          isRecurringGenerated: true,
          recurringOccurrenceDate: occ.date,
        },
      })
      generated++
    }

    if (occurrences.length > 0) {
      await prisma.recurringRule.update({
        where: { id: rule.id },
        data: { lastGeneratedAt: throughDate },
      })
    }
  }

  return NextResponse.json({ generated })
}

export async function GET() {
  const rules = await prisma.recurringRule.findMany({
    include: { card: { select: { id: true, name: true, last4: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(rules)
}
