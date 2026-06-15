import { NextRequest, NextResponse } from 'next/server'
import { getTrend } from '@/lib/summary'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cardId = searchParams.get('cardId')
  const count = parseInt(searchParams.get('cycles') || '6', 10)

  if (!cardId) {
    return NextResponse.json({ error: 'cardId is required' }, { status: 400 })
  }

  const trend = await getTrend(cardId, count)
  return NextResponse.json(trend)
}
