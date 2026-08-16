import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Panel'

/**
 * Public landing + sign-in. Brand-first hero, then auth.
 */
export function PublicHome() {
  const { needsSetup, login, setupAdmin } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
            radial-gradient(ellipse 90% 60% at 50% 0%, rgba(232,184,74,0.14), transparent 50%),
            linear-gradient(165deg, #111a26 0%, #080e16 40%, #0d1520 100%)
          `,
        }}
      />

      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col px-4">
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt=""
              className="h-9 w-9 object-contain"
              width={36}
              height={36}
            />
            <span className="text-sm font-semibold tracking-wide">
              Brigada Onse SVFAR
            </span>
          </div>
          {!showAuth ? (
            <Button variant="primary" onClick={() => setShowAuth(true)}>
              {needsSetup ? 'Set up admin' : 'Sign in'}
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setShowAuth(false)}>
              Back
            </Button>
          )}
        </header>

        {!showAuth ? (
          <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <img
              src="/logo.png"
              alt="Brigada Onse SVFAR"
              className="mb-8 h-40 w-40 object-contain sm:h-48 sm:w-48"
              width={192}
              height={192}
            />
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-500">
              Sun Valley Fire and Rescue
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-ink-50 sm:text-6xl">
              Brigada Onse SVFAR
            </h1>
            <p className="mt-2 text-base font-semibold uppercase tracking-[0.22em] text-gold-500">
              Studio
            </p>
            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink-300 sm:text-base">
              Authorized photo documentation for emergency response, training,
              and community operations.
            </p>
            <div className="mt-10">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowAuth(true)}
              >
                {needsSetup ? 'Create admin account' : 'Enter Studio'}
              </Button>
            </div>
            <p className="mt-12 text-[11px] text-ink-400">
              Restricted access · made with love by{' '}
              <span className="text-gold-500">finest 12</span>
            </p>
          </section>
        ) : (
          <section className="flex flex-1 items-center justify-center py-10">
            <form
              className="w-full max-w-md space-y-3 border border-navy-700 bg-navy-900/95 p-6"
              onSubmit={(e) => void onSubmit(e)}
            >
              <h2 className="mb-4 text-center text-lg font-semibold text-ink-50">
                {needsSetup ? 'Create administrator' : 'Sign in'}
              </h2>
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
            </form>
          </section>
        )}
      </div>
    </div>
  )
}
