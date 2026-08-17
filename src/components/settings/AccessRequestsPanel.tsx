import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { buildMailtoLink } from '../../lib/email'
import { ACCESS_REQUEST_STATUS_LABELS } from '../../types/access'
import { type UserRole } from '../../types/auth'
import { Button } from '../ui/Button'
import { Field, Select } from '../ui/Panel'

export function AccessRequestsPanel() {
  const { accessRequests, approveAccessRequest, rejectAccessRequest } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [roles, setRoles] = useState<Record<string, UserRole>>({})

  const pending = accessRequests.filter((r) => r.status === 'pending')
  const reviewed = accessRequests.filter((r) => r.status !== 'pending')

  const flash = (ok: string) => {
    setErr('')
    setMsg(ok)
    window.setTimeout(() => setMsg(''), 5000)
  }

  const handleApprove = (id: string) => {
    setBusyId(id)
    setErr('')
    void approveAccessRequest(id, roles[id] ?? 'documenter')
      .then(({ username, password, emailSent }) => {
        if (emailSent) {
          flash(`Approved ${username}. Gmail compose opened with login credentials.`)
        } else {
          flash(`Approved ${username}. Email not configured — copy credentials below.`)
          const mailto = buildMailtoLink({
            to: accessRequests.find((r) => r.id === id)?.email ?? '',
            subject: 'Brigada Onse SVFAR Studio — Your access has been approved',
            body: [
              'Your access to Brigada Onse SVFAR Studio has been approved.',
              '',
              `Sign in at: ${window.location.origin}`,
              `Username: ${username}`,
              `Temporary password: ${password}`,
              '',
              'Please sign in and change your password after your first login.',
            ].join('\n'),
          })
          window.open(mailto, '_blank')
        }
      })
      .catch((e: unknown) =>
        setErr(e instanceof Error ? e.message : 'Could not approve request.'),
      )
      .finally(() => setBusyId(null))
  }

  const handleReject = (id: string) => {
    const reason = prompt('Optional reason for rejection:')
    if (reason === null) return
    setBusyId(id)
    setErr('')
    void rejectAccessRequest(id, reason)
      .then(() => flash('Request rejected.'))
      .catch((e: unknown) =>
        setErr(e instanceof Error ? e.message : 'Could not reject request.'),
      )
      .finally(() => setBusyId(null))
  }

  return (
    <section className="border-b border-navy-700 p-4">
      <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
        Access requests
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-ink-400">
        Review pending requests from the public homepage. Approving creates an
        account and opens a Gmail compose window with login credentials.
      </p>

      {(msg || err) && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2.5 text-sm ${
            err
              ? 'border-alert-500/40 bg-alert-500/10 text-alert-400'
              : 'border-ok-500/40 bg-ok-500/10 text-ok-400'
          }`}
          role="status"
        >
          {err || msg}
        </div>
      )}

      {pending.length === 0 ? (
        <p className="rounded-lg border border-navy-700 bg-navy-900/60 px-4 py-5 text-center text-sm text-ink-400">
          No pending access requests.
        </p>
      ) : (
        <ul className="mb-5 space-y-3">
          {pending.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-navy-600 bg-navy-950 p-4"
            >
              <div className="mb-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-ink-50">@{r.username}</span>
                  <span className="text-ink-400">·</span>
                  <span className="text-sm text-ink-300">{r.callsign}</span>
                  {r.isBrigadaMember && (
                    <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-500">
                      Brigada Member
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-ink-400">
                  {r.email} · {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Field label="Role on approval">
                  <Select
                    className="!w-auto min-w-[11rem]"
                    value={roles[r.id] ?? 'documenter'}
                    onChange={(e) =>
                      setRoles({
                        ...roles,
                        [r.id]: e.target.value as UserRole,
                      })
                    }
                  >
                    <option value="documenter">Documentation Officer</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Administrator</option>
                  </Select>
                </Field>
                <div className="flex gap-2 pb-0.5">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busyId === r.id}
                    onClick={() => handleApprove(r.id)}
                  >
                    {busyId === r.id ? 'Approving…' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === r.id}
                    onClick={() => handleReject(r.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewed.length > 0 ? (
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
            Recently reviewed
          </h3>
          <ul className="space-y-1.5">
            {reviewed.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-md border border-navy-700/60 px-3 py-2 text-xs text-ink-400"
              >
                <span>
                  <span className="font-medium text-ink-200">@{r.username}</span>
                  <span className="ml-2 text-ink-500">{r.callsign}</span>
                </span>
                <span
                  className={
                    r.status === 'approved' ? 'text-ok-400' : 'text-alert-400'
                  }
                >
                  {ACCESS_REQUEST_STATUS_LABELS[r.status]}
                </span>
                <span className="text-ink-500">
                  {r.reviewedAt
                    ? new Date(r.reviewedAt).toLocaleDateString()
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
