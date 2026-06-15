import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cardCreateSchema } from '@/lib/validation'

export async function GET() {
  const cards = await prisma.card.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { transactions: true } } },
  })
  return NextResponse.json(cards)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = cardCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }
  const card = await prisma.card.create({ data: parsed.data })
  return NextResponse.json(card, { status: 201 })
}
