import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gold-500 text-navy-950 hover:bg-gold-400 active:bg-gold-600 font-semibold',
  secondary:
    'bg-navy-700 text-ink-100 border border-navy-600 hover:bg-navy-600 hover:border-navy-500',
  ghost: 'bg-transparent text-ink-200 hover:bg-navy-800 hover:text-ink-50',
  danger:
    'bg-transparent text-alert-500 border border-alert-500/40 hover:bg-alert-500/10',
  gold: 'bg-transparent text-gold-500 border border-gold-500/50 hover:bg-gold-500/10',
}

const sizes = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3 text-sm gap-2',
  lg: 'h-11 px-4 text-sm gap-2',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
