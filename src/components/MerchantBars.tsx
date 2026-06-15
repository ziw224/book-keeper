'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatUSD } from '@/lib/money'

interface Bucket { name: string; total: number; count: number }

export default function MerchantBars({ data }: { data: Bucket[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Top Merchants</h3>
        <p className="text-sm text-slate-400 text-center py-8">No merchant data</p>
      </div>
    )
  }

  const chartData = data
    .filter(d => d.total > 0)
    .slice(0, 8)
    .map(d => ({ name: d.name, total: d.total / 100 }))

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Top Merchants</h3>
        <p className="text-sm text-slate-400 text-center py-8">No positive spending to chart</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-6">Top Merchants</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(val) => formatUSD(Math.round(Number(val) * 100))} />
          <Bar dataKey="total" fill="#6366f1" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
