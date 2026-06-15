'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CreditCard, CalendarDays, ReceiptText, TrendingUp, ChevronDown } from 'lucide-react'
import SummaryCards from '@/components/SummaryCards'
import CategoryPie from '@/components/CategoryPie'
import MerchantBars from '@/components/MerchantBars'
import CycleTrend from '@/components/CycleTrend'
import EmptyState from '@/components/EmptyState'
import { formatUSD } from '@/lib/money'
import Link from 'next/link'

interface Card { id: string; name: string; type: string }
interface Cycle { key: string; label: string; startDate: string; endDate: string }
interface SummaryBucket { name: string; total: number; count: number }
interface CardBucket { cardId: string; name: string; total: number }
interface TrendPoint { key: string; label: string; total: number }
interface SummaryData {
  total: number
  byCategory: SummaryBucket[]
  byMerchant: SummaryBucket[]
  byCard: CardBucket[]
  cycle: { key: string; label: string; startDate: string; endDate: string } | null
}

function formatDateRange(start: string, end: string) {
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[m-1]} ${day}, ${y}`
  }
  return `${fmt(start)} – ${fmt(end)}`
}

export default function DashboardPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCard, setSelectedCard] = useState('')
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState('')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [cardOpen, setCardOpen] = useState(false)
  const [cycleOpen, setCycleOpen] = useState(false)

  useEffect(() => {
    fetch('/api/cards').then(r => r.json()).then((all: Card[]) => {
      const creditCards = all.filter(c => c.type === 'credit')
      setCards(creditCards)
      if (creditCards.length > 0) setSelectedCard(creditCards[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedCard) { setCycles([]); setSelectedCycle(''); return }
    fetch(`/api/cards/${selectedCard}/cycles?count=12`)
      .then(r => r.json())
      .then((c: Cycle[]) => {
        setCycles(c)
        if (c.length > 0) setSelectedCycle(c[0].key)
      })
  }, [selectedCard])

  const fetchDashboard = useCallback(async () => {
    if (!selectedCard) { setLoading(false); return }
    setLoading(true)
    const params = new URLSearchParams()
    params.set('cardId', selectedCard)
    if (selectedCycle) params.set('cycle', selectedCycle)

    const [summaryRes, trendRes] = await Promise.all([
      fetch(`/api/summary?${params}`),
      fetch(`/api/summary/trend?cardId=${selectedCard}&cycles=6`),
    ])
    setSummary(await summaryRes.json())
    setTrend(await trendRes.json())
    setLoading(false)
  }, [selectedCard, selectedCycle])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const selectedCardName = useMemo(() => cards.find(c => c.id === selectedCard)?.name || '', [cards, selectedCard])
  const selectedCycleLabel = useMemo(() => cycles.find(c => c.key === selectedCycle)?.label || '', [cycles, selectedCycle])
  const selectedCycleObj = useMemo(() => cycles.find(c => c.key === selectedCycle), [cycles, selectedCycle])
  const txnCount = useMemo(() => summary ? summary.byCategory.reduce((s, b) => s + b.count, 0) : 0, [summary])
  const avgTxn = useMemo(() => txnCount > 0 && summary ? Math.round(summary.total / txnCount) : 0, [summary, txnCount])

  if (cards.length === 0 && !loading) {
    return (
      <EmptyState
        title="Welcome to CardCycle"
        description="Add your first credit card to start tracking spending by statement cycle."
        action={
          <Link href="/cards" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition">
            Add a card
          </Link>
        }
      />
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">Dashboard</h1>
        <p className="mt-2 text-base text-slate-500">
          Track your spending by real credit card statement cycles.
        </p>
      </div>

      {/* Filters row */}
      <section className="mb-8 flex flex-wrap items-center gap-4">
        {/* Card dropdown */}
        <div className="relative">
          <button
            onClick={() => { setCardOpen(o => !o); setCycleOpen(false) }}
            className="flex min-w-[190px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-500" />
              {selectedCardName || 'Select card'}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {cardOpen && (
            <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
              {cards.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCard(c.id); setCardOpen(false) }}
                  className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${c.id === selectedCard ? 'bg-indigo-50 font-semibold text-indigo-600' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {c.id === selectedCard && '✓ '}{c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cycle dropdown */}
        <div className="relative">
          <button
            onClick={() => { setCycleOpen(o => !o); setCardOpen(false) }}
            className="flex min-w-[190px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              {selectedCycleLabel || 'Select cycle'}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {cycleOpen && (
            <div className="absolute z-30 mt-2 w-full max-h-72 overflow-y-auto overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
              {cycles.map(c => (
                <button
                  key={c.key}
                  onClick={() => { setSelectedCycle(c.key); setCycleOpen(false) }}
                  className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${c.key === selectedCycle ? 'bg-indigo-50 font-semibold text-indigo-600' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {c.key === selectedCycle && '✓ '}{c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range badge */}
        {selectedCycleObj && (
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <CalendarDays className="h-4 w-4" />
            {formatDateRange(selectedCycleObj.startDate, selectedCycleObj.endDate)}
          </div>
        )}
      </section>

      {/* Close dropdowns on outside click */}
      {(cardOpen || cycleOpen) && (
        <div className="fixed inset-0 z-20" onClick={() => { setCardOpen(false); setCycleOpen(false) }} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        </div>
      ) : summary ? (
        <>
          {/* Summary stat cards */}
          <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            <StatCard
              icon={ReceiptText}
              label={selectedCycleLabel ? `Total — ${selectedCycleLabel}` : 'Total Spend'}
              value={formatUSD(summary.total)}
            />
            <StatCard
              icon={CreditCard}
              label="Transactions"
              value={String(txnCount)}
            />
            <StatCard
              icon={TrendingUp}
              label="Avg Transaction"
              value={txnCount > 0 ? formatUSD(avgTxn) : '—'}
            />
          </section>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            <CategoryPie data={summary.byCategory} />
            <CycleTrend data={trend} />
          </div>

          <MerchantBars data={summary.byMerchant} />
        </>
      ) : null}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-5">
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}
