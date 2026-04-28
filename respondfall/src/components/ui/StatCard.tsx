import { clsx } from 'clsx'

export function StatCard({ label, value, sub, accent }: {
  label: string
  value: string | number
  sub?: string
  accent?: 'blue' | 'orange' | 'red' | 'green'
}) {
  const accentClass = {
    blue: 'text-accent-blue',
    orange: 'text-revenue',
    red: 'text-danger',
    green: 'text-success',
  }[accent ?? 'blue']

  return (
    <div className="bg-card rounded-xl border border-subtle p-5">
      <p className="text-text-secondary text-xs font-semibold tracking-widest uppercase mb-2">{label}</p>
      <p className={clsx('text-3xl font-bold font-heading', accentClass)}>{value}</p>
      {sub && <p className="text-text-secondary text-xs mt-1">{sub}</p>}
    </div>
  )
}
