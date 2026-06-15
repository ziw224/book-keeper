'use client'

import { useState, useEffect } from 'react'
import { CATEGORIES } from '@/lib/validation'
import { toCents, fromCents } from '@/lib/money'

interface Card { id: string; name: string }

interface TxnData {
  id?: string
  cardId: string
  date: string
  merchant: string
  amountCents: number
  category: string
  notes?: string | null
}

export default function TransactionForm({
  transaction,
  onSave,
  onCancel,
}: {
  transaction?: TxnData | null
  onSave: () => void
  onCancel: () => void
}) {
  const [cards, setCards] = useState<Card[]>([])
  const [cardId, setCardId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Other')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/cards').then(r => r.json()).then((c: Card[]) => {
      setCards(c)
      if (!transaction && c.length > 0) setCardId(c[0].id)
    })
  }, [transaction])

  useEffect(() => {
    if (transaction) {
      setCardId(transaction.cardId)
      setDate(transaction.date)
      setMerchant(transaction.merchant)
      setAmount(String(fromCents(transaction.amountCents)))
      setCategory(transaction.category)
      setNotes(transaction.notes || '')
    }
  }, [transaction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    let amountCents: number
    try {
      amountCents = toCents(amount)
    } catch {
      setError('Invalid amount')
      setSaving(false)
      return
    }

    const body = { cardId, date, merchant, amountCents, category, notes: notes || null }
    const url = transaction?.id ? `/api/transactions/${transaction.id}` : '/api/transactions'
    const method = transaction?.id ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ? JSON.stringify(data.error) : 'Failed to save')
        return
      }
      onSave()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-bold mb-4">
          {transaction?.id ? 'Edit Transaction' : 'Add Transaction'}
        </h2>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Card</span>
          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            required
            className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm"
          >
            <option value="">Select card</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Merchant</span>
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            required
            className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm"
            placeholder="Whole Foods"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Amount ($)</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm"
            placeholder="12.34 (negative for refund)"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Notes (optional)</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
