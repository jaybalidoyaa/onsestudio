import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../lib/api'
import type { AccessRequest } from '../types/access'
import type {
  ActivityEntry,
  AppSettings,
  AuthSession,
  EmailSettings,
  FacebookSettings,
  StudioUser,
  UserRole,
} from '../types/auth'
import { DEFAULT_APP_SETTINGS } from '../types/auth'

// ── Session storage (JWT token) ───────────────────────────────
const SESSION_KEY = 'onse-studio-session'

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!session?.userId || session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      api.clearToken()
      return null
    }
    return session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    api.clearToken()
    return null
  }
}

function writeSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    api.clearToken()
    return
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  api.setToken(session.token)
}

// ── Context shape ─────────────────────────────────────────────
interface AuthContextValue {
  ready: boolean
  needsSetup: boolean
  session: AuthSession | null
  user: StudioUser | null
  users: StudioUser[]
  accessRequests: AccessRequest[]
  settings: AppSettings
  activity: ActivityEntry[]
  isAdmin: boolean
  canEdit: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setupAdmin: (input: {
    username: string
    displayName: string
    password: string
  }) => Promise<void>
  createUser: (input: {
    username: string
    displayName: string
    password: string
    role: UserRole
    email?: string
    callsign?: string
    brigadaMember?: boolean
  }) => Promise<void>
  submitAccessRequest: (input: {
    isBrigadaMember: boolean
    username: string
    email: string
    callsign: string
  }) => Promise<void>
  approveAccessRequest: (
    id: string,
    role?: UserRole,
  ) => Promise<{ username: string; password: string; emailSent: boolean }>
  rejectAccessRequest: (id: string, reason?: string) => Promise<void>
  saveEmailSettings: (email: EmailSettings) => Promise<void>
  updateUser: (
    id: string,
    patch: Partial<Pick<StudioUser, 'displayName' | 'role' | 'active'>>,
  ) => Promise<void>
  resetUserPassword: (id: string, password: string) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  saveFacebookSettings: (facebook: FacebookSettings) => Promise<void>
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>
  logActivity: (action: string, detail: string) => Promise<void>
  refreshActivity: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [user, setUser] = useState<StudioUser | null>(null)
  const [users, setUsers] = useState<StudioUser[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [activity, setActivity] = useState<ActivityEntry[]>([])

  // ── Helpers ──────────────────────────────────────────────────

  const refreshUsers = useCallback(async () => {
    try {
      const res = await api.users.list()
      setUsers(res.users as StudioUser[])
    } catch { /* not admin or not authed — ignore */ }
  }, [])

  const refreshAccessRequests = useCallback(async () => {
    try {
      const res = await api.accessRequests.list()
      setAccessRequests(res.accessRequests as AccessRequest[])
    } catch { /* not admin — ignore */ }
  }, [])

  const refreshActivity = useCallback(async () => {
    try {
      const res = await api.activity.list(40)
      setActivity(res.activity as ActivityEntry[])
    } catch { /* not admin — ignore */ }
  }, [])

  const refreshSettings = useCallback(async () => {
    try {
      const res = await api.settings.get()
      setSettings(res as AppSettings)
    } catch { /* ignore */ }
  }, [])

  // ── Bootstrap on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = readStoredSession()

        // Check if any users exist (needs-setup detection)
        // We do this by attempting a login with empty creds — the 404 / specific
        // error from /api/auth/setup endpoint tells us if we need setup.
        // Instead: call /api/auth/me; a 401 with no users = setup needed.
        if (stored) {
          api.setToken(stored.token)
          try {
            const { user: u } = await api.auth.me()
            if (!cancelled) {
              setSession(stored)
              setUser(u as StudioUser)
              await Promise.all([
                refreshUsers(),
                refreshAccessRequests(),
                refreshActivity(),
                refreshSettings(),
              ])
            }
          } catch (e) {
            // Token invalid / expired
            writeSession(null)
          }
        } else {
          // Check whether setup is needed (zero users)
          try {
            await api.auth.me()
          } catch (err) {
            if (err instanceof api.ApiError && err.status === 401) {
              // Could be needs-setup — probe the setup endpoint
              // by checking if DB is empty via a dummy request.
              // The Worker returns 409 "Admin already configured" if users exist.
              // We send an intentionally incomplete payload to get that 409.
              try {
                await api.auth.setup({ username: '', displayName: '', password: '' })
              } catch (setupErr) {
                if (setupErr instanceof api.ApiError && setupErr.status === 409) {
                  // Admin exists, just not logged in
                  if (!cancelled) setNeedsSetup(false)
                } else {
                  // Any other error (400 validation) means setup endpoint is active
                  if (!cancelled) setNeedsSetup(true)
                }
              }
            }
          }
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [refreshAccessRequests, refreshActivity, refreshSettings, refreshUsers])

  // ── Auth actions ──────────────────────────────────────────────

  const issueSession = useCallback(
    async (token: string, apiUser: api.ApiUser) => {
      // Decode JWT expiry from payload (base64 middle segment)
      let expiresAt = Date.now() + 12 * 3600 * 1000
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
        if (payload.exp) expiresAt = payload.exp * 1000
      } catch { /* use default */ }

      const next: AuthSession = {
        userId: apiUser.id,
        username: apiUser.username,
        displayName: apiUser.displayName,
        role: apiUser.role,
        token,
        expiresAt,
      }
      writeSession(next)
      setSession(next)
      setUser(apiUser as StudioUser)
      setNeedsSetup(false)
      await Promise.all([
        refreshUsers(),
        refreshAccessRequests(),
        refreshActivity(),
        refreshSettings(),
      ])
    },
    [refreshAccessRequests, refreshActivity, refreshSettings, refreshUsers],
  )

  const setupAdmin = useCallback(
    async (input: { username: string; displayName: string; password: string }) => {
      const { token, user: u } = await api.auth.setup(input)
      await issueSession(token, u)
    },
    [issueSession],
  )

  const login = useCallback(
    async (username: string, password: string) => {
      const { token, user: u } = await api.auth.login({ username, password })
      await issueSession(token, u)
    },
    [issueSession],
  )

  const logout = useCallback(async () => {
    try { await api.auth.logout() } catch { /* ignore */ }
    writeSession(null)
    setSession(null)
    setUser(null)
    setUsers([])
    setAccessRequests([])
    setActivity([])
    setSettings(DEFAULT_APP_SETTINGS)
  }, [])

  // ── User management ───────────────────────────────────────────

  const createUser = useCallback(
    async (input: {
      username: string
      displayName: string
      password: string
      role: UserRole
      email?: string
      callsign?: string
      brigadaMember?: boolean
    }) => {
      await api.users.create(input)
      await refreshUsers()
    },
    [refreshUsers],
  )

  const updateUser = useCallback(
    async (id: string, patch: Partial<Pick<StudioUser, 'displayName' | 'role' | 'active'>>) => {
      await api.users.update(id, patch)
      await refreshUsers()
    },
    [refreshUsers],
  )

  const resetUserPassword = useCallback(
    async (id: string, password: string) => {
      await api.users.resetPassword(id, password)
    },
    [],
  )

  const deleteUser = useCallback(
    async (id: string) => {
      await api.users.delete(id)
      await refreshUsers()
    },
    [refreshUsers],
  )

  // ── Access requests ───────────────────────────────────────────

  const submitAccessRequest = useCallback(
    async (input: {
      isBrigadaMember: boolean
      username: string
      email: string
      callsign: string
    }) => {
      await api.accessRequests.submit(input)
      // No state refresh needed — not authed yet
    },
    [],
  )

  const approveAccessRequest = useCallback(
    async (id: string, role: UserRole = 'documenter') => {
      const result = await api.accessRequests.approve(id, role)
      await Promise.all([refreshAccessRequests(), refreshUsers()])
      return result
    },
    [refreshAccessRequests, refreshUsers],
  )

  const rejectAccessRequest = useCallback(
    async (id: string, reason?: string) => {
      await api.accessRequests.reject(id, reason)
      await refreshAccessRequests()
    },
    [refreshAccessRequests],
  )

  // ── Settings ──────────────────────────────────────────────────

  const saveEmailSettings = useCallback(
    async (email: EmailSettings) => {
      const updated = await api.settings.saveEmail(email)
      setSettings(updated as AppSettings)
    },
    [],
  )

  const saveFacebookSettings = useCallback(
    async (facebook: FacebookSettings) => {
      const updated = await api.settings.saveFacebook(facebook)
      setSettings(updated as AppSettings)
    },
    [],
  )

  const saveSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const updated = await api.settings.save({
        requireLogin: patch.requireLogin,
        sessionHours: patch.sessionHours,
      })
      setSettings(updated as AppSettings)
    },
    [],
  )

  // ── Activity ──────────────────────────────────────────────────

  const logActivity = useCallback(
    async (_action: string, _detail: string) => {
      // Activity is logged server-side by the Worker on every API call.
      // This client-side stub is kept so call sites don't need updating.
      // Refresh the displayed log so UI reflects recent actions.
      await refreshActivity()
    },
    [refreshActivity],
  )

  // ── Derived state ─────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      needsSetup,
      session,
      user,
      users,
      accessRequests,
      settings,
      activity,
      isAdmin: session?.role === 'admin',
      canEdit: session?.role === 'admin' || session?.role === 'documenter',
      login,
      logout,
      setupAdmin,
      createUser,
      submitAccessRequest,
      approveAccessRequest,
      rejectAccessRequest,
      saveEmailSettings,
      updateUser,
      resetUserPassword,
      deleteUser,
      saveFacebookSettings,
      saveSettings,
      logActivity,
      refreshActivity,
    }),
    [
      ready, needsSetup, session, user, users, accessRequests, settings, activity,
      login, logout, setupAdmin, createUser, submitAccessRequest,
      approveAccessRequest, rejectAccessRequest, saveEmailSettings,
      updateUser, resetUserPassword, deleteUser, saveFacebookSettings,
      saveSettings, logActivity, refreshActivity,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
