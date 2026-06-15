'use client'

import { useEffect, useState } from 'react'
import { ReceiptText } from 'lucide-react'
import { formatUSD } from '@/lib/money'

interface StmtBalance {
  id: string
  cardId: string
  cycleKey: string
  statementTotalCents: number
  manualTotal: number
  adjustment: number
  status: string
  paymentStatus: string
  paidDate: string | null
  card: { name: string; last4: string }
}

export default function StatementsPage() {
  const [balances, setBalances] = useState<StmtBalance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/statements')
      .then(r => r.json())
      .then(d => { setBalances(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const byCard = balances.reduce((acc, sb) => {
    const key = sb.cardId
    if (!acc[key]) acc[key] = { name: `${sb.card.name} •••• ${sb.card.last4}`, items: [] }
    acc[key].items.push(sb)
    return acc
  }, {} as Record<string, { name: string; items: StmtBalance[] }>)

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ReceiptText className="h-7 w-7 text-slate-500" />
          <h1 className="text-4xl font-bold tracking-tight">Statements</h1>
        </div>
        <p className="mt-2 text-base text-slate-500">Statement reconciliation by card and cycle.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        </div>
      ) : Object.keys(byCard).length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-base text-slate-400">No statement balances entered yet.</p>
          <p className="mt-1 text-sm text-slate-400">Use the Statements button in the nav to add one.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCard).map(([cardId, { name, items }]) => (
            <div key={cardId} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-base font-bold text-slate-900">{name}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map(sb => (
                  <div key={sb.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-6 px-6 py-4 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{sb.cycleKey}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Statement</p>
                      <p className="font-bold">{formatUSD(sb.statementTotalCents)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Entered</p>
                      <p className="font-bold">{formatUSD(sb.manualTotal)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Adjustment</p>
                      <p className={`font-bold ${sb.adjustment < 0 ? 'text-red-600' : sb.adjustment > 0 ? 'text-emerald-600' : ''}`}>{formatUSD(sb.adjustment)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      sb.paymentStatus === 'paid' ? 'bg-neutral-100 text-neutral-500'
                        : sb.status === 'reconciled' ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {sb.paymentStatus === 'paid' ? `Paid${sb.paidDate ? ` ${sb.paidDate.slice(5)}` : ''}` : sb.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
