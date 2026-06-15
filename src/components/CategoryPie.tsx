'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatUSD } from '@/lib/money'
import { categoryColor, categoryIcon } from '@/lib/categories'

interface Bucket { name: string; total: number; count: number }

export default function CategoryPie({ data }: { data: Bucket[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Spending by Category</h3>
        <p className="text-sm text-slate-400 text-center py-8">No category data</p>
      </div>
    )
  }

  const chartData = data.filter(d => d.total > 0).map(d => ({ name: d.name, value: d.total }))
  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Spending by Category</h3>
        <p className="text-sm text-slate-400 text-center py-8">No positive spending to chart</p>
      </div>
    )
  }

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-6">Spending by Category</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              dataKey="value"
              strokeWidth={2}
              stroke="#fff"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={categoryColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip formatter={(val) => formatUSD(Number(val))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-3">
          {chartData.map(d => (
            <div key={d.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="text-sm">{categoryIcon(d.name)}</span>
                <span className="font-medium text-slate-700">{d.name}</span>
              </span>
              <span className="font-semibold">{formatUSD(d.value)}</span>
              <span className="text-slate-500">{((d.value / total) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
