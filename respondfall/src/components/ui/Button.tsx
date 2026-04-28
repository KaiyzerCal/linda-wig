import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'

const variants: Record<Variant, string> = {
  primary: 'bg-accent-blue hover:bg-accent-blue-light text-white',
  secondary: 'bg-white/10 hover:bg-white/20 text-text-primary',
  danger: 'bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30',
  ghost: 'bg-transparent hover:bg-white/10 text-text-secondary',
  success: 'bg-success/20 hover:bg-success/30 text-success border border-success/30',
}

export function Button({ children, variant = 'primary', className, disabled, onClick, type = 'button' }: {
  children: React.ReactNode
  variant?: Variant
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  )
}
