import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { transactionUpdateSchema } from '@/lib/validation'
import { getCycleForDate } from '@/lib/cycle'

function deriveCycle(t: { date: string; card: { type: string; statementCloseDay: number | null } }) {
  if (t.card.type === 'credit' && t.card.statementCloseDay != null) {
    const c = getCycleForDate(t.date, t.card.statementCloseDay)
    return { cycleKey: c.key, cycleLabel: c.label }
  }
  return { cycleKey: null, cycleLabel: null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const txn = await prisma.transaction.findUnique({
    where: { id },
    include: { card: { select: { id: true, name: true, type: true, statementCloseDay: true } } },
  })
  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...txn, ...deriveCycle(txn) })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const parsed = transactionUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }
  try {
    const txn = await prisma.transaction.update({
      where: { id },
      data: parsed.data,
      include: { card: { select: { id: true, name: true, type: true, statementCloseDay: true } } },
    })
    return NextResponse.json({ ...txn, ...deriveCycle(txn) })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.transaction.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
