import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import {
  STUDIO_CLOSING,
  STUDIO_INTRO,
  STUDIO_MOTTO,
  STUDIO_PURPOSE,
  STUDIO_SCOPE,
} from '../../lib/brand'
import { AccessRequestForm } from '../auth/AccessRequestForm'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Panel'

type AuthMode = 'signin' | 'request' | 'setup'

/**
 * Public landing + sign-in / access request. Brand-first hero, then auth.
 */
export function PublicHome() {
  const { needsSetup, login, setupAdmin } = useAuth()
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const openAuth = (mode: AuthMode) => {
    setError('')
    setAuthMode(mode)
  }

  const closeAuth = () => {
    setAuthMode(null)
    setError('')
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (needsSetup) {
        if (password !== confirm) throw new Error('Passwords do not match.')
        await setupAdmin({ username, displayName, password })
      } else {
        await login(username, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative h-full overflow-y-auto bg-navy-950 text-ink-100">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,184,74,0.12), transparent 55%),
            radial-gradient(ellipse 60% 40% at 100% 20%, rgba(30,42,58,0.9), transparent 50%),
            linear-gradient(180deg, #0d1520 0%, #080e16 45%, #0d1520 100%)
          `,
        }}
      />

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between py-3 sm:py-5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              className="h-9 w-9 object-contain sm:h-10 sm:w-10"
              width={40}
              height={40}
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide text-ink-50 sm:text-base">
                Brigada Onse SVFAR
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-500">
                Studio
              </div>
            </div>
          </div>
          {!authMode ? (
            <div className="flex items-center gap-2">
              {needsSetup ? (
                <Button variant="primary" size="sm" onClick={() => openAuth('setup')}>
                  Set up admin
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => openAuth('request')}>
                    Request access
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => openAuth('signin')}>
                    Sign in
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={closeAuth}>
              ← Back
            </Button>
          )}
        </header>

        {/* Main content area */}
        {!authMode ? (
          <section className="flex flex-1 flex-col items-center justify-center pb-12 pt-4 text-center sm:pb-16 sm:pt-6">
            <img
              src="/logo.png"
              alt="Brigada Onse SVFAR"
              className="mb-7 h-28 w-28 object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:h-36 sm:w-36"
              width={144}
              height={144}
            />
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
              Brigada Onse SVFAR
            </h1>
            <p className="mt-2.5 text-lg font-semibold uppercase tracking-[0.22em] text-gold-500">
              Studio
            </p>

            <div className="mx-auto mt-8 max-w-2xl space-y-3 text-left text-sm leading-relaxed text-ink-300 sm:text-base">
              <p>{STUDIO_INTRO}</p>
              <p>{STUDIO_PURPOSE}</p>
              <p>{STUDIO_SCOPE}</p>
              <p className="font-semibold text-ink-100">{STUDIO_MOTTO}</p>
              <p className="text-gold-500">{STUDIO_CLOSING}</p>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {needsSetup ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => openAuth('setup')}
                >
                  Create administrator account
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => openAuth('signin')}
                  >
                    Sign in
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => openAuth('request')}
                  >
                    Request access
                  </Button>
                </>
              )}
            </div>

            {!needsSetup ? (
              <p className="mt-6 max-w-md text-xs leading-relaxed text-ink-400">
                Need an account? Submit an access request with your callsign and
                email. An administrator will review and email you login
                credentials.
              </p>
            ) : (
              <p className="mt-6 max-w-md text-xs leading-relaxed text-ink-400">
                First-time setup — create the administrator account for this
                browser. Additional members can request access afterward.
              </p>
            )}

            <footer className="mt-12 text-[11px] text-ink-500">
              Authorized personnel only · made with love by{' '}
              <span className="text-gold-500">finest 12</span>
            </footer>
          </section>
        ) : authMode === 'request' ? (
          <section className="flex flex-1 items-center justify-center py-8 sm:py-12">
            <AccessRequestForm onSuccess={() => {}} onCancel={closeAuth} />
          </section>
        ) : (
          <section className="flex flex-1 items-center justify-center py-8 sm:py-12">
            <form
              className="w-full max-w-md space-y-4 rounded-xl border border-navy-700 bg-navy-900/95 p-6 shadow-2xl sm:p-8"
              onSubmit={(e) => void onSubmit(e)}
            >
              <div className="mb-2 text-center">
                <h2 className="text-lg font-semibold text-ink-50">
                  {needsSetup || authMode === 'setup'
                    ? 'Create administrator'
                    : 'Sign in'}
                </h2>
                {needsSetup ? (
                  <p className="mt-1 text-xs text-ink-400">
                    One-time setup for this Studio instance.
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                {needsSetup ? (
                  <Field label="Display Name">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                      placeholder="Your name or callsign"
                    />
                  </Field>
                ) : null}
                <Field label="Username">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="Enter your username"
                    required
                    autoFocus
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={needsSetup ? 'new-password' : 'current-password'}
                    placeholder={needsSetup ? 'Min. 8 characters' : 'Enter your password'}
                    required
                  />
                </Field>
                {needsSetup ? (
                  <Field label="Confirm Password">
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      required
                    />
                  </Field>
                ) : null}
              </div>

              {error ? (
                <div
                  className="rounded-lg border border-alert-500/40 bg-alert-500/10 px-3 py-2.5 text-sm text-alert-500"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                size="lg"
                disabled={busy}
              >
                {busy
                  ? 'Please wait…'
                  : needsSetup
                    ? 'Create Admin Account'
                    : 'Sign In'}
              </Button>

              {!needsSetup ? (
                <p className="pt-1 text-center text-xs text-ink-400">
                  No account?{' '}
                  <button
                    type="button"
                    className="font-semibold text-gold-500 hover:text-gold-400"
                    onClick={() => openAuth('request')}
                  >
                    Request access
                  </button>
                </p>
              ) : null}
            </form>
          </section>
        )}
      </div>
    </div>
  )
}
