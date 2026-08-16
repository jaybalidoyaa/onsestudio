import { useMemo, useState } from 'react'
import { parseMultiValue, joinMultiValue } from '../../lib/rosters'

interface MultiSelectProps {
  label?: string
  options: readonly string[] | string[]
  value: string
  onChange: (joined: string) => void
  placeholder?: string
  searchable?: boolean
  maxVisible?: number
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchable = true,
  maxVisible = 8,
}: MultiSelectProps) {
  const selected = useMemo(() => parseMultiValue(value), [value])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, query])

  const toggle = (item: string) => {
    const next = selected.includes(item)
      ? selected.filter((s) => s !== item)
      : [...selected, item]
    onChange(joinMultiValue(next))
  }

  const remove = (item: string) => {
    onChange(joinMultiValue(selected.filter((s) => s !== item)))
  }

  const selectFiltered = () => {
    const merged = Array.from(new Set([...selected, ...filtered]))
    onChange(joinMultiValue(merged))
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => remove(item)}
              className="inline-flex items-center gap-1 rounded-md border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-[11px] font-medium text-gold-400 hover:bg-alert-500/15 hover:border-alert-500/40 hover:text-alert-500"
              title={`Remove ${item}`}
            >
              {item}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-ink-400">{placeholder}</p>
      )}

      <div className="rounded-md border border-navy-600 bg-navy-900">
        <div className="flex items-center gap-1 border-b border-navy-700 p-1.5">
          {searchable ? (
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search & select…"
              className="min-w-0 flex-1 bg-transparent px-1.5 py-1 text-xs text-ink-50 placeholder:text-ink-400 focus:outline-none"
              aria-label="Search options"
            />
          ) : null}
          <button
            type="button"
            className="rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-300 hover:bg-navy-700 hover:text-ink-50"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Hide' : 'Show'}
          </button>
        </div>

        {open ? (
          <div className="p-1.5">
            {query.trim() && filtered.length > 0 ? (
              <div className="mb-1.5 flex justify-end">
                <button
                  type="button"
                  className="text-[10px] font-semibold uppercase tracking-wide text-gold-500 hover:text-gold-400"
                  onClick={selectFiltered}
                >
                  Add all matches ({filtered.length})
                </button>
              </div>
            ) : null}
            <ul
              className="overflow-y-auto"
              style={{ maxHeight: `${maxVisible * 1.85}rem` }}
              role="listbox"
              aria-multiselectable
            >
              {filtered.length === 0 ? (
                <li className="px-2 py-2 text-xs text-ink-400">No matches</li>
              ) : (
                filtered.map((item) => {
                  const on = selected.includes(item)
                  return (
                    <li key={item}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => toggle(item)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                          on
                            ? 'bg-gold-500/15 text-gold-400'
                            : 'text-ink-200 hover:bg-navy-800'
                        }`}
                      >
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px] ${
                            on
                              ? 'border-gold-500 bg-gold-500 text-navy-950'
                              : 'border-navy-500'
                          }`}
                          aria-hidden
                        >
                          {on ? '✓' : ''}
                        </span>
                        {item}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <p className="text-[10px] text-ink-400">
          {selected.length} selected · click a chip to remove
        </p>
      ) : null}
    </div>
  )
}
