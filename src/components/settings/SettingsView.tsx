import { useEffect, useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useStudio } from '../../store/StudioContext'
import { verifyFacebookPage } from '../../lib/facebook'
import { ROLE_LABELS, type UserRole } from '../../types/auth'
import { AccessRequestsPanel } from './AccessRequestsPanel'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Panel'

type SettingsTab = 'account' | 'email' | 'facebook' | 'storage' | 'users'

const SHORTCUTS = [
  ['Ctrl/Cmd + O', 'Open / import photos'],
  ['Ctrl/Cmd + S', 'Save session'],
  ['Delete', 'Remove selected photos'],
  ['← / →', 'Previous / next photo'],
  ['Space', 'Toggle original / framed'],
  ['R', 'Rotate active photo'],
] as const

export function SettingsView() {
  const { newSession, resetSession, saveSession, albums, frames, session } = useStudio()
  const {
    user, users, isAdmin, settings, createUser, updateUser,
    resetUserPassword, deleteUser, saveFacebookSettings,
    saveEmailSettings, logActivity,
  } = useAuth()

  const [tab, setTab] = useState<SettingsTab>('account')
  const [newUser, setNewUser] = useState({ username: '', displayName: '', password: '', role: 'documenter' as UserRole })
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

  const TABS: { id: SettingsTab; label: string; adminOnly?: boolean }[] = [
    { id: 'account', label: 'Account' },
    { id: 'users', label: 'Users & Access', adminOnly: true },
    { id: 'email', label: 'Email', adminOnly: true },
    { id: 'facebook', label: 'Facebook', adminOnly: true },
    { id: 'storage', label: 'Storage' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-navy-950">
      {/* Header */}
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-50">Settings</h1>
            <p className="mt-0.5 text-sm text-ink-400">
              Manage your account, access, and integrations
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

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-navy-700 text-gold-500'
                  : 'text-ink-400 hover:bg-navy-800 hover:text-ink-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* ── Account ── */}
        {tab === 'account' && (
          <div className="w-full p-6 space-y-8">
            {/* About */}
            <section>
              <div className="mb-5 flex items-center gap-4">
                <img src="/logo.png" alt="Brigada Onse SVFAR" className="h-16 w-16 shrink-0 object-contain" width={64} height={64} />
                <div>
                  <div className="text-lg font-semibold text-ink-50">Brigada Onse SVFAR Studio</div>
                  <div className="mt-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold-500">
                    Photo documentation & framing
                  </div>
                  <div className="mt-2 text-sm text-ink-400">
                    Signed in as{' '}
                    <strong className="text-ink-200">{user?.displayName}</strong>
                    {' · '}
                    <span className="text-gold-500">{user ? ROLE_LABELS[user.role] : '—'}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5 text-sm leading-relaxed text-ink-300 border-t border-navy-800 pt-4">
                <p>
                  Our dedicated photo documentation and framing platform — upload
                  response photographs, apply official frames, organize albums,
                  and publish to Facebook.
                </p>
                <p className="font-semibold text-ink-100">One platform. One standard. Every moment documented.</p>
                <p className="text-gold-500">Brigada Onse SVFAR Studio — preserving the moments, documenting the mission.</p>
              </div>
              <p className="mt-4 text-xs text-ink-500">
                made with love by <span className="text-gold-500">finest 12</span>
              </p>
            </section>

            {/* Keyboard shortcuts */}
            <section>
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Keyboard shortcuts
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
                {SHORTCUTS.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="font-mono text-xs text-gold-500 whitespace-nowrap">{k}</dt>
                    <dd className="text-ink-300">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        )}

        {/* ── Users & Access ── */}
        {tab === 'users' && isAdmin && (
          <div className="w-full p-6 space-y-8">
            {/* Access requests */}
            <section>
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Access requests
              </h2>
              <AccessRequestsPanel />
            </section>

            {/* Add user */}
            <section>
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Add user
              </h2>
              <p className="mb-4 text-xs text-ink-400">
                Admins manage accounts. Documenters process photos. Viewers browse Gallery only.
              </p>
              <div className="rounded-xl border border-navy-700 bg-navy-900 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Username">
                    <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} placeholder="login username" />
                  </Field>
                  <Field label="Display Name">
                    <Input value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} placeholder="Name or callsign" />
                  </Field>
                  <Field label="Temporary Password">
                    <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min. 8 characters" />
                  </Field>
                  <Field label="Role">
                    <Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                      <option value="admin">Administrator</option>
                      <option value="documenter">Documentation Officer</option>
                      <option value="viewer">Viewer</option>
                    </Select>
                  </Field>
                </div>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    onClick={() => {
                      void createUser(newUser)
                        .then(() => {
                          setNewUser({ username: '', displayName: '', password: '', role: 'documenter' })
                          flash('User created.')
                        })
                        .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Could not create user.'))
                    }}
                  >
                    Add User
                  </Button>
                </div>
              </div>
            </section>

            {/* User list */}
            <section>
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Current users
              </h2>
              <ul className="grid gap-3 lg:grid-cols-2">
                {users.map((u) => (
                  <li key={u.id} className="rounded-xl border border-navy-700 bg-navy-900 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-semibold text-ink-50">{u.displayName}</span>
                          <span className="text-sm text-ink-400">@{u.username}</span>
                        </div>
                        <div className="mt-1 text-xs text-ink-400">
                          {ROLE_LABELS[u.role]} ·{' '}
                          <span className={u.active ? 'text-ok-400' : 'text-alert-400'}>
                            {u.active ? 'Active' : 'Disabled'}
                          </span>
                          {u.lastLoginAt ? ` · Last login ${new Date(u.lastLoginAt).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Select
                          className="!w-auto text-xs"
                          value={u.role}
                          onChange={(e) => void updateUser(u.id, { role: e.target.value as UserRole }).catch((er: unknown) => setErr(er instanceof Error ? er.message : 'Update failed.'))}
                        >
                          <option value="admin">Administrator</option>
                          <option value="documenter">Documentation Officer</option>
                          <option value="viewer">Viewer</option>
                        </Select>
                        <Button size="sm" variant="secondary" onClick={() => void updateUser(u.id, { active: !u.active }).catch((er: unknown) => setErr(er instanceof Error ? er.message : 'Update failed.'))}>
                          {u.active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const pw = prompt(`New password for ${u.username} (min 8 chars)`)
                          if (!pw) return
                          void resetUserPassword(u.id, pw).then(() => flash('Password reset.')).catch((er: unknown) => setErr(er instanceof Error ? er.message : 'Reset failed.'))
                        }}>
                          Reset PW
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => {
                          if (!confirm(`Delete user ${u.username}?`)) return
                          void deleteUser(u.id).catch((er: unknown) => setErr(er instanceof Error ? er.message : 'Delete failed.'))
                        }}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* ── Email ── */}
        {tab === 'email' && isAdmin && (
          <div className="w-full p-6 space-y-6">
            <section>
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Email notifications
              </h2>
              <p className="mb-5 mt-1 text-sm leading-relaxed text-ink-400">
                When enabled, the Worker sends emails automatically via MailChannels
                (free, built into Cloudflare) on access request, approval, and rejection.
                No browser action needed.
              </p>

              <div className="mb-5 rounded-xl border border-navy-700 bg-navy-900 p-4 text-sm text-ink-300 space-y-2">
                <p className="font-semibold text-gold-500">One-time server setup</p>
                <pre className="overflow-x-auto rounded-lg bg-navy-950 p-3 font-mono text-[11px] leading-relaxed text-ink-100">{`wrangler secret put GMAIL_USER
# → enter: yourname@gmail.com

wrangler secret put GMAIL_APP_PASSWORD
# → enter: your 16-char Gmail App Password`}</pre>
                <p className="text-xs text-ink-400">
                  Gmail App Password: Google Account → Security → 2-Step Verification → App passwords.
                </p>
                <p className="text-xs text-ink-400">
                  SPF record for your domain:{' '}
                  <code className="rounded bg-navy-800 px-1.5 py-0.5 text-gold-400 text-[11px]">
                    v=spf1 include:relay.mailchannels.net ~all
                  </code>
                </p>
              </div>

              <div className="rounded-xl border border-navy-700 bg-navy-900 p-5 space-y-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-200 select-none">
                  <input
                    type="checkbox"
                    checked={emailSettings.enabled}
                    onChange={(e) => setEmailSettings({ ...emailSettings, enabled: e.target.checked })}
                    className="accent-gold-500 h-4 w-4"
                  />
                  Enable server-side email notifications
                </label>
                <Field label="Admin notification email" hint="Where new access-request alerts are sent">
                  <Input
                    type="email"
                    value={emailSettings.adminNotificationEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, adminNotificationEmail: e.target.value })}
                    placeholder="admin@example.com"
                    disabled={!emailSettings.enabled}
                  />
                </Field>
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    void saveEmailSettings(emailSettings)
                      .then(() => flash('Email settings saved.'))
                      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Save failed.'))
                      .finally(() => setBusy(false))
                  }}
                >
                  Save Email Settings
                </Button>
              </div>
            </section>
          </div>
        )}

        {/* ── Facebook ── */}
        {tab === 'facebook' && isAdmin && (
          <div className="w-full p-6 space-y-6">
            <section>
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Facebook Page
              </h2>
              <p className="mb-5 mt-1 text-sm leading-relaxed text-ink-400">
                Connect your Facebook Page to publish posts directly from the Facebook view.
              </p>

              <div className="mb-5 rounded-xl border border-navy-700 bg-navy-900 p-4 text-sm text-ink-300 space-y-1.5">
                <p className="font-semibold text-gold-500">Use a Page Access Token — not a User token</p>
                <p>Required permissions:{' '}
                  <code className="rounded bg-navy-800 px-1.5 py-0.5 text-gold-400 text-xs">pages_show_list</code>{' '}
                  <code className="rounded bg-navy-800 px-1.5 py-0.5 text-gold-400 text-xs">pages_manage_posts</code>{' '}
                  <code className="rounded bg-navy-800 px-1.5 py-0.5 text-gold-400 text-xs">pages_read_engagement</code>
                </p>
                <p className="text-xs text-ink-400">
                  Graph API Explorer → generate token → <code className="text-ink-100">GET /me/accounts</code> → paste the Page <code className="text-ink-100">id</code> and <code className="text-ink-100">access_token</code> below.
                </p>
              </div>

              <div className="rounded-xl border border-navy-700 bg-navy-900 p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Page ID">
                    <Input value={fb.pageId} onChange={(e) => setFb({ ...fb, pageId: e.target.value })} placeholder="From /me/accounts → id" />
                  </Field>
                  <Field label="Page Name">
                    <Input value={fb.pageName} onChange={(e) => setFb({ ...fb, pageName: e.target.value })} placeholder="Brigada Onse SVFAR" />
                  </Field>
                </div>
                <Field label="Page Access Token">
                  <Input type="password" value={fb.pageAccessToken} onChange={(e) => setFb({ ...fb, pageAccessToken: e.target.value })} placeholder="Page access_token from /me/accounts" autoComplete="off" />
                </Field>
                <Field label="Default Hashtags">
                  <Input value={fb.defaultHashtags} onChange={(e) => setFb({ ...fb, defaultHashtags: e.target.value })} />
                </Field>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true)
                      setErr('')
                      void verifyFacebookPage(fb.pageId, fb.pageAccessToken)
                        .then(async (page) => {
                          const next = { ...fb, pageId: page.id, pageName: page.name, pageAccessToken: page.accessToken }
                          setFb(next)
                          await saveFacebookSettings(next)
                          flash(`Connected to ${page.name}`)
                        })
                        .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Could not verify Facebook Page.'))
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
                        .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Save failed.'))
                        .finally(() => setBusy(false))
                    }}
                  >
                    Save Facebook Settings
                  </Button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Storage ── */}
        {tab === 'storage' && (
          <div className="w-full p-6 space-y-6">
            <section>
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Session & storage
              </h2>

              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Output size', '940×788 px'],
                  ['Session photos', String(session.photos.length)],
                  ['Frame library', String(frames.length)],
                  ['Albums', String(albums.length)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-navy-700 bg-navy-900 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-wide text-ink-400">{k}</div>
                    <div className="mt-1 text-lg font-semibold text-ink-50">{v}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-navy-700 bg-navy-900 p-5 space-y-4">
                <p className="text-sm text-ink-400 leading-relaxed">
                  Studio session photos and frames are stored locally in this browser (IndexedDB).
                  Albums and account data are stored on the server. Clearing browser site data
                  will remove local photos and frames but not your account or albums.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => { void saveSession(); void logActivity('session.save', 'Saved studio session') }}>
                    Save Session
                  </Button>
                  <Button variant="secondary" onClick={() => void newSession()}>
                    New Session
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm('Reset the current studio session? Uploaded photos will be cleared.')) {
                        void resetSession()
                      }
                    }}
                  >
                    Reset Session
                  </Button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
