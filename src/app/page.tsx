'use client'

import { useState, useEffect, useCallback } from 'react'
import SummaryCards from '@/components/SummaryCards'
import CategoryPie from '@/components/CategoryPie'
import MerchantBars from '@/components/MerchantBars'
import CycleTrend from '@/components/CycleTrend'
import EmptyState from '@/components/EmptyState'
import Link from 'next/link'

interface Card { id: string; name: string }
interface Cycle { key: string; label: string }
interface SummaryBucket { name: string; total: number; count: number }
interface CardBucket { cardId: string; name: string; total: number }
interface TrendPoint { key: string; label: string; total: number }
interface SummaryData {
  total: number
  byCategory: SummaryBucket[]
  byMerchant: SummaryBucket[]
  byCard: CardBucket[]
  cycle: { key: string; label: string } | null
}

export default function DashboardPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCard, setSelectedCard] = useState('')
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState('')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cards').then(r => r.json()).then((c: Card[]) => {
      setCards(c)
      if (c.length > 0) setSelectedCard(c[0].id)
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
    if (!selectedCard) {
      setLoading(false)
      return
    }
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

  if (cards.length === 0 && !loading) {
    return (
      <EmptyState
        title="Welcome to CardCycle"
        description="Add your first card to start tracking spending by statement cycle."
        action={
          <Link
            href="/cards"
            className="inline-block px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            Add a card
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedCard}
          onChange={(e) => setSelectedCard(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          {cards.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedCycle}
          onChange={(e) => setSelectedCycle(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          {cycles.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading dashboard...</p>
      ) : summary ? (
        <>
          <SummaryCards
            total={summary.total}
            byCard={summary.byCard}
            cycleLabel={summary.cycle?.label}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CategoryPie data={summary.byCategory} />
            <MerchantBars data={summary.byMerchant} />
          </div>

          <CycleTrend data={trend} />
        </>
      ) : null}
    </div>
  )
}
