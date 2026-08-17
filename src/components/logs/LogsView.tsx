import { useEffect, useState } from 'react'
import { useAuth } from '../../store/AuthContext'

const ACTION_COLORS: Record<string, string> = {
  'login': 'text-ok-400',
  'logout': 'text-ink-400',
  'setup': 'text-gold-500',
  'user.create': 'text-ok-400',
  'user.update': 'text-gold-500',
  'user.delete': 'text-alert-400',
  'user.password': 'text-warn-500',
  'access.approve': 'text-ok-400',
  'access.reject': 'text-alert-400',
  'settings.email': 'text-gold-500',
  'settings.facebook': 'text-gold-500',
  'settings.update': 'text-gold-500',
  'facebook.post': 'text-ok-400',
  'session.save': 'text-ink-300',
  'album.delete': 'text-alert-400',
}

const ACTION_LABELS: Record<string, string> = {
  'login': 'Sign in',
  'logout': 'Sign out',
  'setup': 'Initial setup',
  'user.create': 'User created',
  'user.update': 'User updated',
  'user.delete': 'User deleted',
  'user.password': 'Password reset',
  'access.approve': 'Access approved',
  'access.reject': 'Access rejected',
  'settings.email': 'Email settings',
  'settings.facebook': 'Facebook settings',
  'settings.update': 'Settings updated',
  'facebook.post': 'Facebook post',
  'session.save': 'Session saved',
  'album.delete': 'Album deleted',
}

function formatTime(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function LogsView() {
  const { activity, refreshActivity, isAdmin } = useAuth()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    void refreshActivity()
  }, [refreshActivity])

  const handleRefresh = () => {
    setRefreshing(true)
    void refreshActivity().finally(() => setRefreshing(false))
  }

  const actionTypes = ['all', ...Array.from(new Set(activity.map((a) => a.action))).sort()]

  const filtered = activity.filter((a) => {
    if (filter !== 'all' && a.action !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        a.username.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group by date
  const groups: { date: string; entries: typeof filtered }[] = []
  for (const entry of filtered) {
    const date = new Date(entry.createdAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const last = groups[groups.length - 1]
    if (last?.date === date) {
      last.entries.push(entry)
    } else {
      groups.push({ date, entries: [entry] })
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center bg-navy-950">
        <p className="text-sm text-ink-400">Activity logs are visible to administrators only.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-navy-950">
      {/* Header */}
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-50">Activity Logs</h1>
            <p className="mt-0.5 text-sm text-ink-400">
              Full audit trail of all system activity
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-xs font-semibold text-ink-200 transition-colors hover:border-navy-500 hover:text-ink-50 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action, or detail…"
            className="w-full max-w-xs rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-gold-500 focus:outline-none"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ink-50 focus:border-gold-500 focus:outline-none"
          >
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {a === 'all' ? 'All actions' : (ACTION_LABELS[a] ?? a)}
              </option>
            ))}
          </select>
          <div className="flex items-center rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 text-xs text-ink-400">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activity.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-ink-400">No activity recorded yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-ink-400">No entries match your filter.</p>
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {groups.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-navy-700" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    {group.date}
                  </span>
                  <div className="h-px flex-1 bg-navy-700" />
                </div>

                {/* Entries for this date */}
                <div className="overflow-hidden rounded-xl border border-navy-700 bg-navy-900">
                  {group.entries.map((entry, i) => (
                    <div
                      key={entry.id}
                      className={`grid grid-cols-[7rem_auto_5rem_1fr] items-start gap-x-4 gap-y-0.5 px-4 py-3 text-sm ${
                        i < group.entries.length - 1 ? 'border-b border-navy-800' : ''
                      }`}
                    >
                      {/* Time */}
                      <span className="tabular-nums text-xs text-ink-500 pt-0.5">
                        {new Date(entry.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>

                      {/* Action badge */}
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          ACTION_COLORS[entry.action] ?? 'text-ink-300'
                        } bg-navy-800`}
                      >
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>

                      {/* Username */}
                      <span className="truncate font-medium text-gold-500 text-xs pt-0.5">
                        {entry.username}
                      </span>

                      {/* Detail */}
                      <span className="text-ink-300 text-xs pt-0.5 leading-relaxed">
                        {entry.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
