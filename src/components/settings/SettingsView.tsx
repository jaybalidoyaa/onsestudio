import { useEffect, useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useStudio } from '../../store/StudioContext'
import { verifyFacebookPage } from '../../lib/facebook'
import { ROLE_LABELS, type UserRole } from '../../types/auth'
import { Button } from '../ui/Button'
import { Field, Input, Panel, Select } from '../ui/Panel'

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
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-50">Settings</h1>
          <p className="text-sm text-ink-400">
            Access control, Facebook Page, and studio preferences
          </p>
        </div>

        {msg ? (
          <div className="rounded-md border border-ok-500/40 bg-ok-500/10 px-3 py-2 text-sm text-ok-500">
            {msg}
          </div>
        ) : null}
        {err ? (
          <div className="rounded-md border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-sm text-alert-500">
            {err}
          </div>
        ) : null}

        <Panel title="About">
          <div className="mb-3 flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Brigada Onse SVFAR"
              className="h-14 w-14 object-contain"
              width={56}
              height={56}
            />
            <div>
              <div className="font-semibold text-ink-50">Brigada Onse SVFAR</div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-500">
                Studio
              </div>
            </div>
          </div>
          <p className="text-sm text-ink-300">
            Restricted emergency-response photo documentation system for Sun
            Valley Fire and Rescue. Only signed-in personnel can access Studio,
            Gallery, and Frames.
          </p>
          <p className="mt-3 text-xs text-ink-400">
            Signed in as{' '}
            <strong className="text-ink-100">{user?.displayName}</strong> (
            {user ? ROLE_LABELS[user.role] : '—'}) · made with love by{' '}
            <span className="text-gold-500">finest 12</span>
          </p>
        </Panel>

        {isAdmin ? (
          <Panel title="Facebook Page">
            <p className="mb-3 text-xs text-ink-400">
              Connect a Facebook Page Access Token to publish documentation
              albums directly from Gallery. Create a Meta app, generate a Page
              token with <code className="text-gold-500">pages_manage_posts</code>{' '}
              permission, then paste credentials below.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Page ID">
                <Input
                  value={fb.pageId}
                  onChange={(e) => setFb({ ...fb, pageId: e.target.value })}
                  placeholder="1234567890"
                />
              </Field>
              <Field label="Page Name (optional)">
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
                  placeholder="EAAB…"
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
                      const next = { ...fb, pageName: page.name }
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
          </Panel>
        ) : null}

        {isAdmin ? (
          <Panel title="Users & Access">
            <p className="mb-3 text-xs text-ink-400">
              Admins manage accounts. Documenters can process photos. Viewers can
              browse Gallery only.
            </p>

            <div className="mb-4 grid gap-2 rounded-md border border-navy-700 bg-navy-850 p-3 sm:grid-cols-2">
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
                          e instanceof Error ? e.message : 'Could not create user.',
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
                  className="rounded-md border border-navy-700 bg-navy-850 p-3"
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
                              er instanceof Error ? er.message : 'Update failed.',
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
                          void updateUser(u.id, { active: !u.active }).catch(
                            (er: unknown) =>
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
          </Panel>
        ) : null}

        {isAdmin ? (
          <Panel title="Activity Log">
            {activity.length === 0 ? (
              <p className="text-sm text-ink-400">No recent activity.</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto text-xs">
                {activity.map((a) => (
                  <li
                    key={a.id}
                    className="grid grid-cols-[7rem_6rem_1fr] gap-2 border-b border-navy-800 py-1.5 text-ink-300"
                  >
                    <span className="text-ink-400">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                    <span className="text-gold-500">{a.username}</span>
                    <span>
                      <strong className="text-ink-100">{a.action}</strong> —{' '}
                      {a.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        <Panel title="Storage">
          <ul className="space-y-2 text-sm text-ink-300">
            <li>
              Output canvas:{' '}
              <strong className="text-ink-50">940 × 788 px</strong>
            </li>
            <li>
              Session photos:{' '}
              <strong className="text-ink-50">{session.photos.length}</strong>
            </li>
            <li>
              Saved frames:{' '}
              <strong className="text-ink-50">{frames.length}</strong>
            </li>
            <li>
              Gallery albums:{' '}
              <strong className="text-ink-50">{albums.length}</strong>
            </li>
            <li className="text-xs text-ink-400">
              Users, albums, frames, and Facebook settings are stored locally in
              this browser (IndexedDB). Clearing site data removes them.
            </li>
          </ul>
        </Panel>

        <Panel title="Session">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void saveSession()
                void logActivity('session.save', 'Saved studio session')
              }}
            >
              Save Session Now
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
        </Panel>

        <Panel title="Keyboard Shortcuts">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-mono text-xs text-gold-500">{k}</dt>
                <dd className="text-ink-300">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  )
}
