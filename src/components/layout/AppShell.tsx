import { useStudio } from '../../store/StudioContext'
import { Button } from '../ui/Button'
import type { AppView } from '../../types'

const NAV: { id: AppView; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'frames', label: 'Frames' },
  { id: 'settings', label: 'Settings' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    view,
    setView,
    session,
    newSession,
    saveSession,
    exportSelected,
    panelOpen,
    setPanelOpen,
    toast,
    dismissToast,
    processing,
    createAlbumFromSession,
  } = useStudio()

  const processed = session.photos.filter((p) => p.status === 'processed').length
  const selected = session.photos.filter((p) => p.selected).length

  return (
    <div className="flex h-full flex-col bg-navy-950 text-ink-100">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-navy-700 bg-navy-900 px-3">
        <div className="flex items-center gap-2.5 pr-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded border border-gold-500/60 text-gold-500"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-ink-50">
              ONSE STUDIO
            </div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-400">
              Documentation
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-0.5" aria-label="Primary">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                view === item.id
                  ? 'bg-navy-700 text-gold-500'
                  : 'text-ink-300 hover:bg-navy-800 hover:text-ink-100'
              }`}
              aria-current={view === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {view === 'studio' ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => void newSession()}>
                New
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => document.getElementById('photo-file-input')?.click()}
              >
                Open
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void saveSession()}>
                Save
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void exportSelected()}>
                Export
              </Button>
              {processed > 0 ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => void createAlbumFromSession()}
                >
                  Create Album
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                className="lg:hidden"
                onClick={() => setPanelOpen(!panelOpen)}
                aria-expanded={panelOpen}
              >
                Panel
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">{children}</div>

      <footer className="flex h-9 shrink-0 items-center gap-4 border-t border-navy-700 bg-navy-900 px-3 text-xs text-ink-300">
        <span>
          <strong className="text-ink-100">{session.photos.length}</strong> Photos
        </span>
        <span>
          <strong className="text-ink-100">{selected}</strong> Selected
        </span>
        <span>
          <strong className="text-ink-100">{processed}</strong> Processed
        </span>
        <span className="ml-auto">
          Status:{' '}
          <strong className="text-gold-500">
            {processing
              ? processing.message
              : session.photos.length
                ? 'Ready'
                : 'Waiting for photos'}
          </strong>
        </span>
      </footer>

      {processing ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-12 z-40 flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <div className="mt-3 rounded-md border border-gold-500/40 bg-navy-900/95 px-4 py-2 text-sm text-ink-50 shadow-lg backdrop-blur">
            <div className="mb-1 font-medium text-gold-500">{processing.message}</div>
            <div className="h-1.5 w-56 overflow-hidden rounded bg-navy-700">
              <div
                className="h-full bg-gold-500 transition-all"
                style={{
                  width: `${(processing.current / Math.max(processing.total, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className="absolute bottom-14 left-1/2 z-50 -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div
            className={`flex items-center gap-3 rounded-md border px-4 py-2.5 text-sm shadow-lg ${
              toast.type === 'error'
                ? 'border-alert-500/50 bg-navy-900 text-alert-500'
                : toast.type === 'success'
                  ? 'border-ok-500/40 bg-navy-900 text-ok-500'
                  : 'border-navy-600 bg-navy-900 text-ink-100'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              className="text-ink-400 hover:text-ink-100"
              onClick={dismissToast}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
