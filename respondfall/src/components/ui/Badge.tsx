import { clsx } from 'clsx'

type BadgeVariant = 'sent' | 'missed' | 'active' | 'warning' | 'default'

const variants: Record<BadgeVariant, string> = {
  sent: 'bg-sent/20 text-sent border border-sent/30',
  missed: 'bg-danger/20 text-danger border border-danger/30',
  active: 'bg-success/20 text-success border border-success/30',
  warning: 'bg-warning/20 text-warning border border-warning/30',
  default: 'bg-white/10 text-text-secondary border border-white/10',
}

export function Badge({ children, variant = 'default', className }: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide', variants[variant], className)}>
      {children}
    </span>
  )
}
