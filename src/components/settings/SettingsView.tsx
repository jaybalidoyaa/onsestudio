import { useEffect, useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useStudio } from '../../store/StudioContext'
import { verifyFacebookPage } from '../../lib/facebook'
import { ROLE_LABELS, type UserRole } from '../../types/auth'
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
    logActivity,
  } = useAuth()

  const [newUser, setNewUser] = useState({
    username: '',
    displayName: '',
    password: '',
    role: 'documenter' as UserRole,
  })
  const [fb, setFb] = useState(settings.facebook)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFb(settings.facebook)
  }, [settings.facebook])

  const flash = (ok: string) => {
    setErr('')
    setMsg(ok)
    window.setTimeout(() => setMsg(''), 3500)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-navy-950">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-navy-700 bg-navy-900 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-50">Settings</h1>
          <p className="text-xs text-ink-400">
            Access, Facebook Page, storage, and preferences
          </p>
        </div>
        {(msg || err) && (
          <p
            className={`text-sm ${err ? 'text-alert-500' : 'text-ok-500'}`}
            role="status"
          >
            {err || msg}
          </p>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        {/* Left column */}
        <div className="min-h-0 space-y-0 overflow-y-auto border-r border-navy-700">
          <section className="border-b border-navy-700 p-4">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
              About
            </h2>
            <div className="mb-3 flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Brigada Onse SVFAR"
                className="h-14 w-14 object-contain"
                width={56}
                height={56}
              />
              <div>
                <div className="font-semibold text-ink-50">
                  Brigada Onse SVFAR Studio
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-500">
                  Photo documentation & framing
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-ink-300">
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
            <p className="mt-3 text-xs text-ink-400">
              Signed in as{' '}
              <strong className="text-ink-100">{user?.displayName}</strong> (
              {user ? ROLE_LABELS[user.role] : '—'}) · made with love by{' '}
              <span className="text-gold-500">finest 12</span>
            </p>
          </section>

          {isAdmin ? (
            <section className="border-b border-navy-700 p-4">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Facebook Page
              </h2>
              <div className="mb-3 space-y-2 border border-navy-700 bg-navy-900 p-3 text-xs text-ink-300">
                <p className="font-semibold text-gold-500">
                  Use a Page Access Token — not a User token
                </p>
                <p>
                  Required:{' '}
                  <code className="text-gold-500">pages_show_list</code>,{' '}
                  <code className="text-gold-500">pages_manage_posts</code>,{' '}
                  <code className="text-gold-500">pages_read_engagement</code>
                </p>
                <p>
                  Graph API Explorer → token with those permissions →{' '}
                  <code className="text-ink-100">GET /me/accounts</code> → paste
                  Page <code className="text-ink-100">id</code> +{' '}
                  <code className="text-ink-100">access_token</code>.
                </p>
              </div>
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
              <div className="mt-3">
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
              </div>
              <div className="mt-3">
                <Field label="Default Hashtags">
                  <Input
                    value={fb.defaultHashtags}
                    onChange={(e) =>
                      setFb({ ...fb, defaultHashtags: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
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

          <section className="border-b border-navy-700 p-4">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
              Storage & session
            </h2>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[
                ['Output', '940×788'],
                ['Photos', String(session.photos.length)],
                ['Frames', String(frames.length)],
                ['Albums', String(albums.length)],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="border border-navy-700 bg-navy-900 px-3 py-2"
                >
                  <div className="text-[10px] uppercase tracking-wide text-ink-400">
                    {k}
                  </div>
                  <div className="font-semibold text-ink-50">{v}</div>
                </div>
              ))}
            </div>
            <p className="mb-3 text-xs text-ink-400">
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

          <section className="p-4">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
              Keyboard shortcuts
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-mono text-xs text-gold-500">{k}</dt>
                  <dd className="text-ink-300">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* Right column */}
        <div className="flex min-h-0 flex-col overflow-hidden bg-navy-900/40">
          {isAdmin ? (
            <>
              <section className="min-h-0 flex-1 overflow-y-auto border-b border-navy-700 p-4">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                  Users & access
                </h2>
                <p className="mb-3 text-xs text-ink-400">
                  Admins manage accounts. Documenters process photos. Viewers
                  browse Gallery only.
                </p>

                <div className="mb-4 grid gap-2 border border-navy-700 bg-navy-950 p-3 sm:grid-cols-2">
                  <Field label="Username">
                    <Input
                      value={newUser.username}
                      onChange={(e) =>
                        setNewUser({ ...newUser, username: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Display Name">
                    <Input
                      value={newUser.displayName}
                      onChange={(e) =>
                        setNewUser({ ...newUser, displayName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Temporary Password">
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
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

                <ul className="space-y-2">
                  {users.map((u) => (
                    <li
                      key={u.id}
                      className="border border-navy-700 bg-navy-950 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-ink-50">
                            {u.displayName}{' '}
                            <span className="text-ink-400">@{u.username}</span>
                          </div>
                          <div className="text-xs text-ink-400">
                            {ROLE_LABELS[u.role]} ·{' '}
                            {u.active ? 'Active' : 'Disabled'}
                            {u.lastLoginAt
                              ? ` · Last login ${new Date(u.lastLoginAt).toLocaleString()}`
                              : ''}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Select
                            className="!w-auto"
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
                            <option value="documenter">
                              Documentation Officer
                            </option>
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

              <section className="flex max-h-[40%] min-h-[160px] flex-col border-t border-navy-700 p-4">
                <h2 className="mb-3 shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                  Activity log
                </h2>
                {activity.length === 0 ? (
                  <p className="text-sm text-ink-400">No recent activity.</p>
                ) : (
                  <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto text-xs">
                    {activity.map((a) => (
                      <li
                        key={a.id}
                        className="grid grid-cols-[6.5rem_5rem_1fr] gap-2 border-b border-navy-800 py-1.5 text-ink-300"
                      >
                        <span className="text-ink-400">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                        <span className="text-gold-500">{a.username}</span>
                        <span>
                          <strong className="text-ink-100">{a.action}</strong>{' '}
                          — {a.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-ink-400">
              Ask an administrator for user management and Facebook Page
              connection.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
