'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatUSD } from '@/lib/money'

interface TrendPoint { key: string; label: string; total: number }

export default function CycleTrend({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Spending Trend</h3>
        <p className="text-sm text-slate-400 text-center py-8">No trend data</p>
      </div>
    )
  }

  const chartData = [...data].reverse().map((d, i, arr) => ({
    name: d.label.replace(/ \d{4}$/, ''),
    total: d.total / 100,
    totalCents: d.total,
    isLatest: i === arr.length - 1,
  }))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-6">Spending Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barCategoryGap="20%">
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(val) => formatUSD(Math.round(Number(val) * 100))} />
          <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="#c7d2fe" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
