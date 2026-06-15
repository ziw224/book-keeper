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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          {cycleLabel ? `Total — ${cycleLabel}` : 'Total Spending'}
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight">{formatUSD(total)}</p>
      </div>
      {byCard.map((c) => (
        <div key={c.cardId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{c.name}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{formatUSD(c.total)}</p>
        </div>
      ))}
    </div>
  )
}
