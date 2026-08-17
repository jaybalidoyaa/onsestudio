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
      <div className="w-full max-w-md space-y-4 border border-navy-700 bg-navy-900/95 p-6 text-center">
        <h2 className="text-lg font-semibold text-ink-50">Request submitted</h2>
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
      className="w-full max-w-md space-y-3 border border-navy-700 bg-navy-900/95 p-6"
      onSubmit={(e) => void onSubmit(e)}
    >
      <h2 className="mb-1 text-center text-lg font-semibold text-ink-50">
        Request access
      </h2>
      <p className="mb-4 text-center text-xs leading-relaxed text-ink-400">
        Fill out the form below. An administrator will review your request and
        email you login credentials if approved.
      </p>

      <Field label="Are you a Brigada Onse member?">
        <Select
          value={isBrigadaMember}
          onChange={(e) => setIsBrigadaMember(e.target.value as 'yes' | 'no' | '')}
          required
          autoFocus
        >
          <option value="">Select…</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </Select>
      </Field>

      <Field label="Username">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="Desired login username"
          required
        />
      </Field>

      <Field label="Email">
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
          <option value="">Select callsign…</option>
          {CALLSIGN_ROSTER.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      {error ? (
        <div
          className="rounded-md border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-sm text-alert-500"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 pt-1">
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
