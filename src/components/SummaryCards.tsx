'use client'

import { formatUSD } from '@/lib/money'

interface CardSummary {
  cardId: string
  name: string
  total: number
}

export default function SummaryCards({
  total,
  byCard,
  cycleLabel,
}: {
  total: number
  byCard: CardSummary[]
  cycleLabel?: string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 uppercase">
          {cycleLabel ? `Total — ${cycleLabel}` : 'Total Spending'}
        </p>
        <p className="mt-1 text-2xl font-bold">{formatUSD(total)}</p>
      </div>
      {byCard.map((c) => (
        <div key={c.cardId} className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">{c.name}</p>
          <p className="mt-1 text-2xl font-bold">{formatUSD(c.total)}</p>
        </div>
      ))}
    </div>
  )
}
