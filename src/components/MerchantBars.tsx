'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatUSD } from '@/lib/money'

interface Bucket { name: string; total: number; count: number }

export default function MerchantBars({ data }: { data: Bucket[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No merchant data</p>
  }

  const chartData = data
    .filter(d => d.total > 0)
    .slice(0, 10)
    .map(d => ({ name: d.name, total: d.total / 100 }))

  if (chartData.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No positive spending to chart</p>
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">By Merchant (top 10)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" tickFormatter={(v) => `$${v}`} />
          <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(val) => formatUSD(Math.round(Number(val) * 100))} />
          <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
