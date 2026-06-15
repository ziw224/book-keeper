'use client'

import { useState, useEffect } from 'react'

interface CardData {
  id?: string
  name: string
  issuer: string
  last4: string
  statementCloseDay: number
}

export default function CardForm({
  card,
  onSave,
  onCancel,
}: {
  card?: CardData | null
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [issuer, setIssuer] = useState('')
  const [last4, setLast4] = useState('')
  const [closeDay, setCloseDay] = useState(15)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (card) {
      setName(card.name)
      setIssuer(card.issuer)
      setLast4(card.last4)
      setCloseDay(card.statementCloseDay)
    }
  }, [card])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const body = { name, issuer, last4, statementCloseDay: closeDay }
    const url = card?.id ? `/api/cards/${card.id}` : '/api/cards'
    const method = card?.id ? 'PATCH' : 'POST'

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
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
      >
        <h2 className="text-lg font-bold mb-4">{card?.id ? 'Edit Card' : 'Add Card'}</h2>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Card Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm"
            placeholder="Sapphire Reserve"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Issuer</span>
          <input
            type="text"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            required
            className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm"
            placeholder="Chase"
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Last 4 Digits</span>
          <input
            type="text"
            value={last4}
            onChange={(e) => setLast4(e.target.value.slice(0, 4))}
            required
            maxLength={4}
            minLength={4}
            pattern="\d{4}"
            className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm"
            placeholder="1234"
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Statement Close Day</span>
          <input
            type="number"
            value={closeDay}
            onChange={(e) => setCloseDay(parseInt(e.target.value) || 1)}
            min={1}
            max={31}
            required
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
