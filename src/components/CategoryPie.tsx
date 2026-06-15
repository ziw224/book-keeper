'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatUSD } from '@/lib/money'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

interface Bucket { name: string; total: number; count: number }

export default function CategoryPie({ data }: { data: Bucket[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No category data</p>
  }

  const chartData = data.filter(d => d.total > 0).map(d => ({ name: d.name, value: d.total }))
  if (chartData.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No positive spending to chart</p>
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">By Category</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={90}
            dataKey="value"
            label={({ name }) => name}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(val) => formatUSD(Number(val))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
