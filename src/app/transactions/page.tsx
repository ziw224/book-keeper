'use client'

import { useState, useEffect, useCallback } from 'react'
import FilterBar from '@/components/FilterBar'
import TransactionForm from '@/components/TransactionForm'
import EmptyState from '@/components/EmptyState'
import { formatUSD } from '@/lib/money'

interface Txn {
  id: string
  cardId: string
  date: string
  merchant: string
  amountCents: number
  category: string
  notes?: string | null
  cycleLabel: string
  card: { id: string; name: string; statementCloseDay: number }
}

export default function TransactionsPage() {
  const [data, setData] = useState<{ data: Txn[]; total: number }>({ data: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTxn, setEditTxn] = useState<Txn | null>(null)
  const [filters, setFilters] = useState({
    cardId: '',
    cycle: '',
    category: '',
    from: '',
    to: '',
  })
  const [page, setPage] = useState(0)
  const limit = 50

  const fetchTxns = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.cardId) params.set('cardId', filters.cardId)
    if (filters.cycle) params.set('cycle', filters.cycle)
    if (filters.category) params.set('category', filters.category)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    params.set('limit', String(limit))
    params.set('offset', String(page * limit))

    const res = await fetch(`/api/transactions?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [filters, page])

  useEffect(() => { fetchTxns() }, [fetchTxns])

  const handleDelete = async (txn: Txn) => {
    if (!confirm(`Delete transaction "${txn.merchant}" for ${formatUSD(txn.amountCents)}?`)) return
    await fetch(`/api/transactions/${txn.id}`, { method: 'DELETE' })
    fetchTxns()
  }

  const handleFilterChange = (f: typeof filters) => {
    setFilters(f)
    setPage(0)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          onClick={() => { setEditTxn(null); setShowForm(true) }}
          className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
        >
          Add Transaction
        </button>
      </div>

      <FilterBar filters={filters} onChange={handleFilterChange} />

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : data.data.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description={
            filters.cardId || filters.cycle || filters.category || filters.from || filters.to
              ? 'No transactions match your current filters.'
              : 'Add your first transaction to start tracking spending.'
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg border border-gray-200">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Card</th>
                  <th className="px-4 py-3">Cycle</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((txn) => (
                  <tr key={txn.id}>
                    <td className="px-4 py-3 text-sm">{txn.date}</td>
                    <td className="px-4 py-3 text-sm font-medium">{txn.merchant}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${txn.amountCents < 0 ? 'text-green-600' : ''}`}>
                      {formatUSD(txn.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{txn.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{txn.card.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{txn.cycleLabel}</td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button
                        onClick={() => { setEditTxn(txn); setShowForm(true) }}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(txn)}
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

          <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
            <span>
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} of {data.total}
            </span>
            <div className="space-x-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= data.total}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <TransactionForm
          transaction={editTxn}
          onSave={() => { setShowForm(false); fetchTxns() }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
