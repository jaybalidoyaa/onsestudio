import { useEffect, useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useStudio } from '../../store/StudioContext'
import { verifyFacebookPage } from '../../lib/facebook'
import { ROLE_LABELS, type UserRole } from '../../types/auth'
import { AccessRequestsPanel } from './AccessRequestsPanel'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Panel'

const SHORTCUTS = [
  ['Ctrl/Cmd + O', 'Open / import photos'],
  ['Ctrl/Cmd + S', 'Save session'],
  ['Delete', 'Remove selected photos'],
  ['← / →', 'Previous / next photo'],
  ['Space', 'Toggle original / framed'],
  ['R', 'Rotate active photo'],
] as const

export function SettingsView() {
  const { newSession, resetSession, saveSession, albums, frames, session } =
    useStudio()
  const {
    user,
    users,
    isAdmin,
    settings,
    activity,
    createUser,
    updateUser,
    resetUserPassword,
    deleteUser,
    saveFacebookSettings,
    saveEmailSettings,
    logActivity,
  } = useAuth()

  const [newUser, setNewUser] = useState({
    username: '',
    displayName: '',
    password: '',
    role: 'documenter' as UserRole,
  })
  const [fb, setFb] = useState(settings.facebook)
  const [emailSettings, setEmailSettings] = useState(settings.email)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFb(settings.facebook)
    setEmailSettings(settings.email)
  }, [settings.facebook, settings.email])

  const flash = (ok: string) => {
    setErr('')
    setMsg(ok)
    window.setTimeout(() => setMsg(''), 3500)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-navy-950">
      {/* Page header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-navy-700 bg-navy-900 px-4 py-3.5">
        <div>
          <h1 className="text-lg font-semibold text-ink-50">Settings</h1>
          <p className="mt-0.5 text-xs text-ink-400">
            Access, Facebook Page, storage, and preferences
          </p>
        </div>
        {(msg || err) && (
          <div
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              err
                ? 'border-alert-500/40 bg-alert-500/10 text-alert-400'
                : 'border-ok-500/40 bg-ok-500/10 text-ok-400'
            }`}
            role="status"
          >
            {err || msg}
          </div>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        {/* ── Left column ── */}
        <div className="min-h-0 overflow-y-auto border-r border-navy-700">
          {/* About */}
          <section className="border-b border-navy-700 p-5">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
              About
            </h2>
            <div className="mb-4 flex items-center gap-3.5">
              <img
                src="/logo.png"
                alt="Brigada Onse SVFAR"
                className="h-14 w-14 shrink-0 object-contain"
                width={56}
                height={56}
              />
              <div>
                <div className="font-semibold text-ink-50">
                  Brigada Onse SVFAR Studio
                </div>
                <div className="mt-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold-500">
                  Photo documentation & framing
                </div>
              </div>
            </div>
            <div className="space-y-2.5 text-sm leading-relaxed text-ink-300">
              <p>
                Introducing Brigada Onse SVFAR Studio — our dedicated photo
                documentation and framing platform built for Brigada Onse Sun
                Valley Fire and Rescue.
              </p>
              <p>
                Designed to make our documentation more organized, professional,
                and consistent, the Studio allows us to upload response and event
                photographs, apply our official photo frames, prepare each
                photograph individually, and organize completed images into
                albums with their corresponding details.
              </p>
              <p>
                From emergency responses and rescue operations to trainings,
                community activities, and special events, every photograph can
                now become part of a properly organized digital record.
              </p>
              <p className="font-semibold text-ink-100">
                One platform. One standard. Every moment documented.
              </p>
              <p className="text-gold-500">
                Brigada Onse SVFAR Studio — preserving the moments, documenting
                the mission.
              </p>
            </div>
            <p className="mt-4 text-xs text-ink-400">
              Signed in as{' '}
              <strong className="text-ink-200">{user?.displayName}</strong> ·{' '}
              {user ? ROLE_LABELS[user.role] : '—'} · made with love by{' '}
              <span className="text-gold-500">finest 12</span>
            </p>
          </section>

          {/* Email notifications — admin only */}
          {isAdmin ? (
            <section className="border-b border-navy-700 p-5">
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Email notifications
              </h2>
              <p className="mb-4 mt-1 text-xs leading-relaxed text-ink-400">
                When enabled, the server automatically sends transactional
                emails via MailChannels (free, built into Cloudflare Workers)
                using the Gmail address configured in the Worker secrets.
                No browser action required — emails are sent silently in the
                background on access request, approval, and rejection.
              </p>

              {/* Setup instructions */}
              <div className="mb-4 space-y-1.5 rounded-lg border border-navy-700 bg-navy-900 p-3.5 text-xs text-ink-300">
                <p className="font-semibold text-gold-500">One-time server setup</p>
                <p>
                  Run these commands once after deploying the Worker:
                </p>
                <pre className="mt-1.5 overflow-x-auto rounded-md bg-navy-950 p-2.5 font-mono text-[11px] leading-relaxed text-ink-100">
{`wrangler secret put GMAIL_USER
# → enter: yourname@gmail.com

wrangler secret put GMAIL_APP_PASSWORD
# → enter: your 16-char Gmail App Password`}
                </pre>
                <p className="mt-1">
                  To get a Gmail App Password: Google Account → Security → 2-Step
                  Verification → App passwords → create one for "Mail".
                </p>
                <p>
                  Also add an SPF record to your domain DNS so MailChannels
                  can send on your behalf:{' '}
                  <code className="rounded bg-navy-800 px-1 py-0.5 text-gold-400">
                    v=spf1 include:relay.mailchannels.net ~all
                  </code>
                </p>
              </div>

              <div className="space-y-3.5">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-200 select-none">
                  <input
                    type="checkbox"
                    checked={emailSettings.enabled}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        enabled: e.target.checked,
                      })
                    }
                    className="accent-gold-500"
                  />
                  Enable server-side email notifications
                </label>
                <Field
                  label="Admin notification email"
                  hint="Where new access-request alerts are sent"
                >
                  <Input
                    type="email"
                    value={emailSettings.adminNotificationEmail}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        adminNotificationEmail: e.target.value,
                      })
                    }
                    placeholder="admin@example.com"
                    disabled={!emailSettings.enabled}
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    void saveEmailSettings(emailSettings)
                      .then(() => flash('Email settings saved.'))
                      .catch((e: unknown) =>
                        setErr(e instanceof Error ? e.message : 'Save failed.'),
                      )
                      .finally(() => setBusy(false))
                  }}
                >
                  Save Email Settings
                </Button>
              </div>
            </section>
          ) : null}

          {/* Facebook Page — admin only */}
          {isAdmin ? (
            <section className="border-b border-navy-700 p-5">
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Facebook Page
              </h2>
              <div className="mb-4 mt-1 space-y-1.5 rounded-lg border border-navy-700 bg-navy-900 p-3 text-xs text-ink-300">
                <p className="font-semibold text-gold-500">
                  Use a Page Access Token — not a User token
                </p>
                <p>
                  Required:{' '}
                  <code className="rounded bg-navy-800 px-1 py-0.5 text-gold-400">pages_show_list</code>
                  {', '}
                  <code className="rounded bg-navy-800 px-1 py-0.5 text-gold-400">pages_manage_posts</code>
                  {', '}
                  <code className="rounded bg-navy-800 px-1 py-0.5 text-gold-400">pages_read_engagement</code>
                </p>
                <p>
                  Graph API Explorer → token with those permissions →{' '}
                  <code className="rounded bg-navy-800 px-1 py-0.5 text-ink-100">GET /me/accounts</code>{' '}
                  → paste Page <code className="rounded bg-navy-800 px-1 py-0.5 text-ink-100">id</code>{' '}
                  + <code className="rounded bg-navy-800 px-1 py-0.5 text-ink-100">access_token</code>.
                </p>
              </div>
              <div className="space-y-3.5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Page ID">
                    <Input
                      value={fb.pageId}
                      onChange={(e) => setFb({ ...fb, pageId: e.target.value })}
                      placeholder="From /me/accounts → id"
                    />
                  </Field>
                  <Field label="Page Name">
                    <Input
                      value={fb.pageName}
                      onChange={(e) => setFb({ ...fb, pageName: e.target.value })}
                      placeholder="Brigada Onse SVFAR"
                    />
                  </Field>
                </div>
                <Field label="Page Access Token">
                  <Input
                    type="password"
                    value={fb.pageAccessToken}
                    onChange={(e) =>
                      setFb({ ...fb, pageAccessToken: e.target.value })
                    }
                    placeholder="Page access_token from /me/accounts"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Default Hashtags">
                  <Input
                    value={fb.defaultHashtags}
                    onChange={(e) =>
                      setFb({ ...fb, defaultHashtags: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    setErr('')
                    void verifyFacebookPage(fb.pageId, fb.pageAccessToken)
                      .then(async (page) => {
                        const next = {
                          ...fb,
                          pageId: page.id,
                          pageName: page.name,
                          pageAccessToken: page.accessToken,
                        }
                        setFb(next)
                        await saveFacebookSettings(next)
                        flash(`Connected to ${page.name}`)
                      })
                      .catch((e: unknown) =>
                        setErr(
                          e instanceof Error
                            ? e.message
                            : 'Could not verify Facebook Page.',
                        ),
                      )
                      .finally(() => setBusy(false))
                  }}
                >
                  Test Connection
                </Button>
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    void saveFacebookSettings(fb)
                      .then(() => flash('Facebook settings saved.'))
                      .catch((e: unknown) =>
                        setErr(e instanceof Error ? e.message : 'Save failed.'),
                      )
                      .finally(() => setBusy(false))
                  }}
                >
                  Save Facebook Settings
                </Button>
              </div>
            </section>
          ) : null}

          {/* Storage & session */}
          <section className="border-b border-navy-700 p-5">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
              Storage & session
            </h2>
            <div className="mb-4 grid grid-cols-2 gap-2.5 text-sm sm:grid-cols-4">
              {[
                ['Output', '940×788'],
                ['Photos', String(session.photos.length)],
                ['Frames', String(frames.length)],
                ['Albums', String(albums.length)],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-lg border border-navy-700 bg-navy-900 px-3 py-2.5"
                >
                  <div className="text-[10px] uppercase tracking-wide text-ink-400">
                    {k}
                  </div>
                  <div className="mt-0.5 font-semibold text-ink-50">{v}</div>
                </div>
              ))}
            </div>
            <p className="mb-4 text-xs leading-relaxed text-ink-400">
              Data stays in this browser (IndexedDB). Clearing site data removes
              users, albums, frames, and settings.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void saveSession()
                  void logActivity('session.save', 'Saved studio session')
                }}
              >
                Save Session
              </Button>
              <Button variant="secondary" onClick={() => void newSession()}>
                New Session
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (
                    confirm(
                      'Reset the current studio session? Uploaded photos in this session will be cleared.',
                    )
                  ) {
                    void resetSession()
                  }
                }}
              >
                Reset Session
              </Button>
            </div>
          </section>

          {/* Keyboard shortcuts */}
          <section className="p-5">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
              Keyboard shortcuts
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-mono text-xs text-gold-500">{k}</dt>
                  <dd className="text-ink-300">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* ── Right column ── */}
        <div className="flex min-h-0 flex-col overflow-hidden bg-navy-900/30">
          {isAdmin ? (
            <>
              <AccessRequestsPanel />

              {/* Users & access */}
              <section className="min-h-0 flex-1 overflow-y-auto border-b border-navy-700 p-5">
                <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                  Users & access
                </h2>
                <p className="mb-4 mt-1 text-xs leading-relaxed text-ink-400">
                  Admins manage accounts. Documenters process photos. Viewers
                  browse Gallery only.
                </p>

                {/* Add user form */}
                <div className="mb-5 rounded-lg border border-navy-700 bg-navy-950 p-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                    Add user
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Username">
                      <Input
                        value={newUser.username}
                        onChange={(e) =>
                          setNewUser({ ...newUser, username: e.target.value })
                        }
                        placeholder="login username"
                      />
                    </Field>
                    <Field label="Display Name">
                      <Input
                        value={newUser.displayName}
                        onChange={(e) =>
                          setNewUser({ ...newUser, displayName: e.target.value })
                        }
                        placeholder="Name or callsign"
                      />
                    </Field>
                    <Field label="Temporary Password">
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        placeholder="Min. 8 characters"
                      />
                    </Field>
                    <Field label="Role">
                      <Select
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            role: e.target.value as UserRole,
                          })
                        }
                      >
                        <option value="admin">Administrator</option>
                        <option value="documenter">Documentation Officer</option>
                        <option value="viewer">Viewer</option>
                      </Select>
                    </Field>
                    <div className="sm:col-span-2">
                      <Button
                        variant="primary"
                        onClick={() => {
                          void createUser(newUser)
                            .then(() => {
                              setNewUser({
                                username: '',
                                displayName: '',
                                password: '',
                                role: 'documenter',
                              })
                              flash('User created.')
                            })
                            .catch((e: unknown) =>
                              setErr(
                                e instanceof Error
                                  ? e.message
                                  : 'Could not create user.',
                              ),
                            )
                        }}
                      >
                        Add User
                      </Button>
                    </div>
                  </div>
                </div>

                {/* User list */}
                <ul className="space-y-2.5">
                  {users.map((u) => (
                    <li
                      key={u.id}
                      className="rounded-lg border border-navy-700 bg-navy-950 p-3.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-medium text-ink-50">
                              {u.displayName}
                            </span>
                            <span className="text-sm text-ink-400">@{u.username}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-ink-400">
                            {ROLE_LABELS[u.role]} ·{' '}
                            <span className={u.active ? 'text-ok-400' : 'text-alert-400'}>
                              {u.active ? 'Active' : 'Disabled'}
                            </span>
                            {u.lastLoginAt
                              ? ` · Last login ${new Date(u.lastLoginAt).toLocaleDateString()}`
                              : ''}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Select
                            className="!w-auto text-xs"
                            value={u.role}
                            onChange={(e) =>
                              void updateUser(u.id, {
                                role: e.target.value as UserRole,
                              }).catch((er: unknown) =>
                                setErr(
                                  er instanceof Error
                                    ? er.message
                                    : 'Update failed.',
                                ),
                              )
                            }
                          >
                            <option value="admin">Administrator</option>
                            <option value="documenter">Documentation Officer</option>
                            <option value="viewer">Viewer</option>
                          </Select>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              void updateUser(u.id, {
                                active: !u.active,
                              }).catch((er: unknown) =>
                                setErr(
                                  er instanceof Error
                                    ? er.message
                                    : 'Update failed.',
                                ),
                              )
                            }
                          >
                            {u.active ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const password = prompt(
                                `New password for ${u.username} (min 8 chars)`,
                              )
                              if (!password) return
                              void resetUserPassword(u.id, password)
                                .then(() => flash('Password reset.'))
                                .catch((er: unknown) =>
                                  setErr(
                                    er instanceof Error
                                      ? er.message
                                      : 'Reset failed.',
                                  ),
                                )
                            }}
                          >
                            Reset PW
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (!confirm(`Delete user ${u.username}?`)) return
                              void deleteUser(u.id).catch((er: unknown) =>
                                setErr(
                                  er instanceof Error
                                    ? er.message
                                    : 'Delete failed.',
                                ),
                              )
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Activity log */}
              <section className="flex max-h-[38%] min-h-[160px] flex-col p-5">
                <h2 className="mb-3 shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                  Activity log
                </h2>
                {activity.length === 0 ? (
                  <p className="text-sm text-ink-400">No recent activity.</p>
                ) : (
                  <ul className="min-h-0 flex-1 space-y-0 overflow-y-auto rounded-lg border border-navy-700 bg-navy-950">
                    {activity.map((a) => (
                      <li
                        key={a.id}
                        className="grid grid-cols-[6rem_5rem_1fr] gap-x-3 border-b border-navy-800 px-3 py-2 text-xs text-ink-400 last:border-0"
                      >
                        <span className="tabular-nums text-ink-500">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                        <span className="truncate font-medium text-gold-500">
                          {a.username}
                        </span>
                        <span className="truncate">
                          <strong className="font-medium text-ink-200">
                            {a.action}
                          </strong>{' '}
                          — {a.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-sm text-ink-300">
                User management and Page settings are admin-only.
              </p>
              <p className="text-xs text-ink-500">
                Ask an administrator to manage accounts or connect Facebook.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
