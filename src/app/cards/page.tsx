'use client'

import { useState, useEffect, useCallback } from 'react'
import CardForm from '@/components/CardForm'
import EmptyState from '@/components/EmptyState'

interface Card {
  id: string
  name: string
  issuer: string
  last4: string
  statementCloseDay: number
  _count?: { transactions: number }
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/cards')
    setCards(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchCards() }, [fetchCards])

  const handleDelete = async (card: Card) => {
    const txnCount = card._count?.transactions || 0
    const msg = txnCount > 0
      ? `Delete "${card.name}" and its ${txnCount} transaction${txnCount === 1 ? '' : 's'}?`
      : `Delete "${card.name}"?`
    if (!confirm(msg)) return
    await fetch(`/api/cards/${card.id}`, { method: 'DELETE' })
    fetchCards()
  }

  if (loading) return <p className="text-gray-500">Loading cards...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Cards</h1>
        <button
          onClick={() => { setEditCard(null); setShowForm(true) }}
          className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
        >
          Add Card
        </button>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title="No cards yet"
          description="Add your first credit card to start tracking spending."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
            >
              Add your first card
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg border border-gray-200">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Issuer</th>
                <th className="px-4 py-3">Last 4</th>
                <th className="px-4 py-3">Close Day</th>
                <th className="px-4 py-3">Transactions</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cards.map((card) => (
                <tr key={card.id}>
                  <td className="px-4 py-3 text-sm font-medium">{card.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{card.issuer}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">••••{card.last4}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{card.statementCloseDay}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{card._count?.transactions || 0}</td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <button
                      onClick={() => { setEditCard(card); setShowForm(true) }}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(card)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CardForm
          card={editCard}
          onSave={() => { setShowForm(false); fetchCards() }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
