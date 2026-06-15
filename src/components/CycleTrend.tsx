'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatUSD } from '@/lib/money'

interface TrendPoint { key: string; label: string; total: number }

export default function CycleTrend({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No trend data</p>
  }

  const chartData = [...data].reverse().map(d => ({
    name: d.label,
    total: d.total / 100,
    totalCents: d.total,
  }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Cycle Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(val) => formatUSD(Math.round(Number(val) * 100))} />
          <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
