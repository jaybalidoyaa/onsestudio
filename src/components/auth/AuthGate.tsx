import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Panel'

export function AuthGate() {
  const { needsSetup, login, setupAdmin } = useAuth()
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
    <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_top,#1e2a3a_0%,#080e16_55%)] p-4">
      <div className="w-full max-w-md rounded-xl border border-navy-700 bg-navy-900/95 p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt="Brigada Onse SVFAR"
            className="mx-auto mb-3 h-20 w-20 object-contain"
            width={80}
            height={80}
          />
          <h1 className="text-xl font-semibold text-ink-50">
            Brigada Onse SVFAR
          </h1>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-500">
            Studio
          </p>
          <p className="mt-3 text-sm text-ink-300">
            {needsSetup
              ? 'Create the first administrator account to secure this Studio.'
              : 'Authorized personnel only. Sign in to continue.'}
          </p>
        </div>

        <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
          {needsSetup ? (
            <Field label="Display Name">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Documentation Officer"
                autoComplete="name"
              />
            </Field>
          ) : null}

          <Field label="Username">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
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
              placeholder={needsSetup ? 'At least 8 characters' : '••••••••'}
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

        <p className="mt-5 text-center text-[11px] text-ink-400">
          Restricted emergency documentation system · made with love by{' '}
          <span className="text-gold-500">finest 12</span>
        </p>
      </div>
    </div>
  )
}
