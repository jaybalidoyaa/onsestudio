import { useStudio } from '../../store/StudioContext'
import { useAuth } from '../../store/AuthContext'
import { Button } from '../ui/Button'
import type { AppView } from '../../types'
import { ROLE_LABELS } from '../../types/auth'

const NAV: { id: AppView; label: string; adminOnly?: boolean; editorsOnly?: boolean }[] = [
  { id: 'home', label: 'Home' },
  { id: 'studio', label: 'Studio', editorsOnly: true },
  { id: 'gallery', label: 'Gallery' },
  { id: 'posts', label: 'Posts' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'frames', label: 'Frames', editorsOnly: true },
  { id: 'logs', label: 'Logs', adminOnly: true },
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
  const { user, logout, canEdit, isAdmin } = useAuth()

  const processed = session.photos.filter((p) => p.status === 'processed').length
  const selected = session.photos.filter((p) => p.selected).length

  return (
    <div className="flex h-full flex-col bg-navy-950 text-ink-100">
      {/* ── Header ── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-navy-700 bg-navy-900 px-4">
        {/* Logo + brand */}
        <button
          type="button"
          onClick={() => setView('home')}
          className="flex shrink-0 items-center gap-2.5 rounded-md px-1 py-1 transition-colors hover:bg-navy-800"
          aria-label="Go to home"
        >
          <img
            src="/logo.png"
            alt="Brigada Onse Sun Valley Fire and Rescue"
            className="h-9 w-9 object-contain"
            width={36}
            height={36}
          />
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-semibold tracking-wide text-ink-50">
              Brigada Onse SVFAR
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-500">
              Studio
            </div>
          </div>
        </button>

        <div className="mx-1 h-6 w-px shrink-0 bg-navy-700" aria-hidden />

        {/* Primary nav */}
        <nav className="flex items-center gap-0.5 overflow-x-auto" aria-label="Primary">
          {NAV.map((item) => {
            if (item.editorsOnly && !canEdit) return null
            if (item.adminOnly && !isAdmin) return null
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  view === item.id
                    ? 'bg-navy-700 text-gold-500'
                    : 'text-ink-300 hover:bg-navy-800 hover:text-ink-100'
                }`}
                aria-current={view === item.id ? 'page' : undefined}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Right-side actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {view === 'studio' && canEdit ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => void newSession()}>
                New
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  document.getElementById('photo-file-input')?.click()
                }
              >
                Open
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void saveSession()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void exportSelected()}
              >
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

          {/* User info + sign out */}
          <div className="ml-1 hidden items-center gap-2.5 border-l border-navy-700 pl-3 sm:flex">
            <div className="text-right leading-tight">
              <div className="text-xs font-medium text-ink-100">
                {user?.displayName}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-ink-400">
                {user ? ROLE_LABELS[user.role] : ''}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={logout}>
              Sign out
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="sm:hidden"
            onClick={logout}
            aria-label="Sign out"
          >
            Out
          </Button>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="relative min-h-0 flex-1">{children}</div>

      {/* ── Footer status bar ── */}
      <footer className="flex h-9 shrink-0 items-center gap-4 border-t border-navy-700 bg-navy-900 px-4 text-xs text-ink-400">
        <span>
          <strong className="font-semibold text-ink-100">{session.photos.length}</strong>{' '}
          Photos
        </span>
        <span>
          <strong className="font-semibold text-ink-100">{selected}</strong> Selected
        </span>
        <span>
          <strong className="font-semibold text-ink-100">{processed}</strong> Processed
        </span>
        <span className="hidden sm:inline">
          Status:{' '}
          <strong className="font-semibold text-gold-500">
            {processing
              ? processing.message
              : session.photos.length
                ? 'Ready'
                : 'Waiting for photos'}
          </strong>
        </span>
        <span className="ml-auto text-[11px] text-ink-500">
          made with love by{' '}
          <span className="font-medium text-gold-500">finest 12</span>
        </span>
      </footer>

      {/* ── Processing overlay ── */}
      {processing ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-14 z-40 flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <div className="mt-3 rounded-xl border border-gold-500/40 bg-navy-900/95 px-5 py-3 text-sm text-ink-50 shadow-xl backdrop-blur">
            <div className="mb-2 font-medium text-gold-500">
              {processing.message}
            </div>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-navy-700">
              <div
                className="h-full rounded-full bg-gold-500 transition-all duration-200"
                style={{
                  width: `${(processing.current / Math.max(processing.total, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Toast notification ── */}
      {toast ? (
        <div
          className="absolute bottom-12 left-1/2 z-50 -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-xl backdrop-blur ${
              toast.type === 'error'
                ? 'border-alert-500/50 bg-navy-900/95 text-alert-400'
                : toast.type === 'success'
                  ? 'border-ok-500/40 bg-navy-900/95 text-ok-400'
                  : 'border-navy-600 bg-navy-900/95 text-ink-100'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={dismissToast}
              className="ml-1 text-ink-400 hover:text-ink-100"
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
