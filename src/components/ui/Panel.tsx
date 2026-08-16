import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const fieldClass =
  'w-full rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-ink-400">{hint}</span> : null}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${fieldClass} min-h-[72px] resize-y ${props.className ?? ''}`}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${fieldClass} ${props.className ?? ''}`}
    />
  )
}

export function Panel({
  title,
  children,
  actions,
  className = '',
}: {
  title?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-lg border border-navy-700 bg-navy-850 ${className}`}
    >
      {title ? (
        <header className="flex items-center justify-between gap-2 border-b border-navy-700 px-3 py-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
            {title}
          </h3>
          {actions}
        </header>
      ) : null}
      <div className="p-3">{children}</div>
    </section>
  )
}

export function StatusBadge({
  status,
}: {
  status: string
}) {
  const map: Record<string, string> = {
    uploaded: 'text-ink-300',
    ready: 'text-ink-200',
    processing: 'text-warn-500 animate-pulse-soft',
    processed: 'text-ok-500',
    error: 'text-alert-500',
    draft: 'text-ink-300',
    completed: 'text-ok-500',
  }
  const icons: Record<string, string> = {
    processed: '✓',
    completed: '✓',
    processing: '⟳',
    error: '!',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${map[status] ?? 'text-ink-300'}`}
    >
      {icons[status] ? <span aria-hidden>{icons[status]}</span> : null}
      {status}
    </span>
  )
}
