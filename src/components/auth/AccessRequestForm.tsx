import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { CALLSIGN_ROSTER } from '../../lib/rosters'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Panel'

interface AccessRequestFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function AccessRequestForm({ onSuccess, onCancel }: AccessRequestFormProps) {
  const { submitAccessRequest } = useAuth()
  const [isBrigadaMember, setIsBrigadaMember] = useState<'yes' | 'no' | ''>('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [callsign, setCallsign] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (isBrigadaMember === '') {
      setError('Please indicate whether you are a Brigada Onse member.')
      return
    }
    setBusy(true)
    try {
      await submitAccessRequest({
        isBrigadaMember: isBrigadaMember === 'yes',
        username,
        email,
        callsign,
      })
      setSubmitted(true)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit request.')
    } finally {
      setBusy(false)
    }
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md space-y-5 rounded-xl border border-navy-700 bg-navy-900/95 p-6 text-center shadow-2xl sm:p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-ok-500/40 bg-ok-500/10 text-xl text-ok-400">
            ✓
          </div>
          <h2 className="text-lg font-semibold text-ink-50">Request submitted</h2>
        </div>
        <p className="text-sm leading-relaxed text-ink-300">
          Your access request has been sent to the administrator for review. You
          will receive an email with login details once approved.
        </p>
        <Button variant="primary" className="w-full" onClick={onCancel}>
          Back to home
        </Button>
      </div>
    )
  }

  return (
    <form
      className="w-full max-w-md rounded-xl border border-navy-700 bg-navy-900/95 p-6 shadow-2xl sm:p-8"
      onSubmit={(e) => void onSubmit(e)}
    >
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-ink-50">Request access</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
          Fill out the form below. An administrator will review your request and
          email you login credentials if approved.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Are you a Brigada Onse member?">
          <Select
            value={isBrigadaMember}
            onChange={(e) => setIsBrigadaMember(e.target.value as 'yes' | 'no' | '')}
            required
            autoFocus
          >
            <option value="">Select…</option>
            <option value="yes">Yes — I am a Brigada Onse member</option>
            <option value="no">No — I am not a member</option>
          </Select>
        </Field>

        <Field label="Username" hint="Min. 3 characters, used to sign in">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="Your desired login username"
            required
          />
        </Field>

        <Field label="Email" hint="We'll send your login credentials here">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="Callsign">
          <Select
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            required
          >
            <option value="">Select your callsign…</option>
            {CALLSIGN_ROSTER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-lg border border-alert-500/40 bg-alert-500/10 px-3 py-2.5 text-sm text-alert-400"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex gap-2.5">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={busy}
        >
          {busy ? 'Submitting…' : 'Submit request'}
        </Button>
      </div>
    </form>
  )
}
