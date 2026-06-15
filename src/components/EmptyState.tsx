'use client'

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-20">
      <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-base text-slate-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
