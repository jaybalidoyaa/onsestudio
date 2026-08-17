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
        <header className="flex shrink-0 items-center justify-between py-2 sm:py-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              className="h-10 w-10 object-contain sm:h-11 sm:w-11"
              width={44}
              height={44}
            />
            <span className="text-sm font-semibold tracking-wide sm:text-base">
              Brigada Onse SVFAR Studio
            </span>
          </div>
          {!authMode ? (
            <div className="flex items-center gap-2">
              {needsSetup ? (
                <Button variant="primary" onClick={() => openAuth('setup')}>
                  Set up admin
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => openAuth('request')}>
                    Request access
                  </Button>
                  <Button variant="primary" onClick={() => openAuth('signin')}>
                    Sign in
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Button variant="ghost" onClick={closeAuth}>
              Back
            </Button>
          )}
        </header>

        {!authMode ? (
          <section className="flex flex-1 flex-col items-center justify-center pb-10 pt-4 text-center sm:pb-12 sm:pt-8">
            <img
              src="/logo.png"
              alt="Brigada Onse SVFAR"
              className="mb-6 h-28 w-28 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:h-36 sm:w-36"
              width={144}
              height={144}
            />
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
              Brigada Onse SVFAR
            </h1>
            <p className="mt-2 text-lg font-semibold uppercase tracking-[0.2em] text-gold-500">
              Studio
            </p>

            <div className="mx-auto mt-6 max-w-2xl space-y-3 text-sm leading-relaxed text-ink-300 sm:text-base">
              <p>{STUDIO_INTRO}</p>
              <p>{STUDIO_PURPOSE}</p>
              <p>{STUDIO_SCOPE}</p>
              <p className="font-semibold text-ink-100">{STUDIO_MOTTO}</p>
              <p className="text-gold-500">{STUDIO_CLOSING}</p>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
                email. An administrator will review and email you login credentials.
              </p>
            ) : (
              <p className="mt-6 max-w-md text-xs leading-relaxed text-ink-400">
                First-time setup — create the administrator account for this
                browser. Additional members can request access afterward.
              </p>
            )}

            <footer className="mt-10 text-[11px] text-ink-400">
              Authorized personnel only · made with love by{' '}
              <span className="text-gold-500">finest 12</span>
            </footer>
          </section>
        ) : authMode === 'request' ? (
          <section className="flex flex-1 items-center justify-center py-8 sm:py-10">
            <AccessRequestForm onSuccess={() => {}} onCancel={closeAuth} />
          </section>
        ) : (
          <section className="flex flex-1 items-center justify-center py-8 sm:py-10">
            <form
              className="w-full max-w-md space-y-3 border border-navy-700 bg-navy-900/95 p-6"
              onSubmit={(e) => void onSubmit(e)}
            >
              <h2 className="mb-1 text-center text-lg font-semibold text-ink-50">
                {needsSetup || authMode === 'setup'
                  ? 'Create administrator'
                  : 'Sign in'}
              </h2>
              {needsSetup ? (
                <p className="mb-4 text-center text-xs text-ink-400">
                  One-time setup for this Studio instance.
                </p>
              ) : null}
              {needsSetup ? (
                <Field label="Display Name">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="name"
                  />
                </Field>
              ) : null}
              <Field label="Username">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
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
                    required
                  />
                </Field>
              ) : null}
              {error ? (
                <div
                  className="rounded-md border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-sm text-alert-500"
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
