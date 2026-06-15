import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { listRecentCycles } from '@/lib/cycle'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const card = await prisma.card.findUnique({ where: { id } })
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const count = parseInt(searchParams.get('count') || '6', 10)

  const cycles = listRecentCycles(card.statementCloseDay, count)
  return NextResponse.json(cycles)
}
