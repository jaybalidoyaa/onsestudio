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
          flash(`Approved ${username}. Login credentials emailed.`)
        } else {
          flash(`Approved ${username}. Email not sent — copy credentials below.`)
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
      <p className="mb-3 text-xs text-ink-400">
        Review pending requests from the public homepage. Approving creates an
        account and sends login credentials by email.
      </p>
      {(msg || err) && (
        <p
          className={`mb-3 text-sm ${err ? 'text-alert-500' : 'text-ok-500'}`}
          role="status"
        >
          {err || msg}
        </p>
      )}

      {pending.length === 0 ? (
        <p className="text-sm text-ink-400">No pending access requests.</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {pending.map((r) => (
            <li
              key={r.id}
              className="border border-navy-700 bg-navy-950 p-3"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-ink-50">
                    @{r.username}{' '}
                    <span className="text-ink-400">· {r.callsign}</span>
                  </div>
                  <div className="text-xs text-ink-400">
                    {r.email} · Brigada member:{' '}
                    {r.isBrigadaMember ? 'Yes' : 'No'} ·{' '}
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Field label="Role on approval">
                  <Select
                    className="!w-auto min-w-[10rem]"
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
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busyId === r.id}
                  onClick={() => handleApprove(r.id)}
                >
                  Approve
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
            </li>
          ))}
        </ul>
      )}

      {reviewed.length > 0 ? (
        <>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
            Recently reviewed
          </h3>
          <ul className="space-y-1.5 text-xs">
            {reviewed.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap gap-x-2 border-b border-navy-800 py-1.5 text-ink-300"
              >
                <span className="text-ink-400">
                  {new Date(r.reviewedAt ?? r.createdAt).toLocaleString()}
                </span>
                <span className="text-ink-100">@{r.username}</span>
                <span>{ACCESS_REQUEST_STATUS_LABELS[r.status]}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
