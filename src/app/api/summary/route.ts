import { NextRequest, NextResponse } from 'next/server'
import { getSummary } from '@/lib/summary'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cardId = searchParams.get('cardId') || undefined
  const cycleKey = searchParams.get('cycle') || undefined
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined

  const result = await getSummary({ cardId, cycleKey, from, to })
  return NextResponse.json(result)
}
