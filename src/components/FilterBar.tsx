'use client'

import { useState, useEffect } from 'react'
import { CATEGORIES } from '@/lib/validation'

interface Card {
  id: string
  name: string
}

interface Cycle {
  key: string
  label: string
}

interface Filters {
  cardId: string
  cycle: string
  category: string
  from: string
  to: string
}

export default function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (f: Filters) => void
}) {
  const [cards, setCards] = useState<Card[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])

  useEffect(() => {
    fetch('/api/cards').then(r => r.json()).then(setCards)
  }, [])

  useEffect(() => {
    if (filters.cardId) {
      fetch(`/api/cards/${filters.cardId}/cycles?count=12`)
        .then(r => r.json())
        .then(setCycles)
    } else {
      setCycles([])
    }
  }, [filters.cardId])

  const set = (key: keyof Filters, val: string) => {
    const next = { ...filters, [key]: val }
    if (key === 'cardId') next.cycle = ''
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select
        value={filters.cardId}
        onChange={(e) => set('cardId', e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">All Cards</option>
        {cards.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        value={filters.cycle}
        onChange={(e) => set('cycle', e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
        disabled={!filters.cardId}
      >
        <option value="">All Cycles</option>
        {cycles.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>

      <select
        value={filters.category}
        onChange={(e) => set('category', e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">All Categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <input
        type="date"
        value={filters.from}
        onChange={(e) => set('from', e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
        placeholder="From"
      />

      <input
        type="date"
        value={filters.to}
        onChange={(e) => set('to', e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
        placeholder="To"
      />
    </div>
  )
}
