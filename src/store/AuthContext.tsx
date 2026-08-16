import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createSalt, hashPassword, verifyPassword } from '../lib/crypto'
import * as db from '../lib/db'
import { createId } from '../lib/utils'
import type {
  ActivityEntry,
  AppSettings,
  AuthSession,
  FacebookSettings,
  StudioUser,
  UserRole,
} from '../types/auth'
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_FACEBOOK_SETTINGS,
} from '../types/auth'

const SESSION_KEY = 'onse-studio-auth'

interface AuthContextValue {
  ready: boolean
  needsSetup: boolean
  session: AuthSession | null
  user: StudioUser | null
  users: StudioUser[]
  settings: AppSettings
  activity: ActivityEntry[]
  isAdmin: boolean
  canEdit: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
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
  }) => Promise<void>
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

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!session?.userId || session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

function writeSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function toPublicUser(user: StudioUser): StudioUser {
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [user, setUser] = useState<StudioUser | null>(null)
  const [users, setUsers] = useState<StudioUser[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [activity, setActivity] = useState<ActivityEntry[]>([])

  const refreshUsers = useCallback(async () => {
    setUsers(await db.listUsers())
  }, [])

  const refreshActivity = useCallback(async () => {
    setActivity(await db.listActivity())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [count, appSettings, stored] = await Promise.all([
          db.countUsers(),
          db.getAppSettings(),
          Promise.resolve(readStoredSession()),
        ])
        if (cancelled) return
        setSettings(appSettings)
        setNeedsSetup(count === 0)

        if (stored) {
          const existing = await db.getUser(stored.userId)
          if (existing?.active) {
            setSession(stored)
            setUser(toPublicUser(existing))
            await refreshUsers()
            await refreshActivity()
          } else {
            writeSession(null)
          }
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshActivity, refreshUsers])

  const issueSession = useCallback(
    async (u: StudioUser, hours: number) => {
      const now = Date.now()
      const next: AuthSession = {
        userId: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        issuedAt: now,
        expiresAt: now + hours * 60 * 60 * 1000,
      }
      writeSession(next)
      setSession(next)
      setUser(toPublicUser(u))
      const updated = { ...u, lastLoginAt: now, updatedAt: now }
      await db.saveUser(updated)
      setUser(updated)
      await refreshUsers()
      await refreshActivity()
    },
    [refreshActivity, refreshUsers],
  )

  const logActivity = useCallback(
    async (action: string, detail: string) => {
      const entry: ActivityEntry = {
        id: createId('act'),
        userId: session?.userId || 'system',
        username: session?.username || 'system',
        action,
        detail,
        createdAt: Date.now(),
      }
      await db.addActivity(entry)
      await refreshActivity()
    },
    [refreshActivity, session],
  )

  const setupAdmin = useCallback(
    async (input: {
      username: string
      displayName: string
      password: string
    }) => {
      const count = await db.countUsers()
      if (count > 0) throw new Error('Admin already configured.')
      const username = input.username.trim().toLowerCase()
      if (username.length < 3) throw new Error('Username must be at least 3 characters.')
      if (input.password.length < 8) {
        throw new Error('Password must be at least 8 characters.')
      }
      const salt = createSalt()
      const passwordHash = await hashPassword(input.password, salt)
      const now = Date.now()
      const admin: StudioUser = {
        id: createId('user'),
        username,
        displayName: input.displayName.trim() || username,
        role: 'admin',
        passwordSalt: salt,
        passwordHash,
        active: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      }
      await db.saveUser(admin)
      setNeedsSetup(false)
      await issueSession(admin, settings.sessionHours)
      await db.addActivity({
        id: createId('act'),
        userId: admin.id,
        username: admin.username,
        action: 'setup',
        detail: 'Created initial administrator account',
        createdAt: Date.now(),
      })
      await refreshActivity()
    },
    [issueSession, refreshActivity, settings.sessionHours],
  )

  const login = useCallback(
    async (username: string, password: string) => {
      const u = await db.getUserByUsername(username.trim().toLowerCase())
      if (!u || !u.active) {
        throw new Error('Invalid username or password.')
      }
      const ok = await verifyPassword(password, u.passwordSalt, u.passwordHash)
      if (!ok) throw new Error('Invalid username or password.')
      await issueSession(u, settings.sessionHours)
      await db.addActivity({
        id: createId('act'),
        userId: u.id,
        username: u.username,
        action: 'login',
        detail: 'Signed in to Studio',
        createdAt: Date.now(),
      })
      await refreshActivity()
    },
    [issueSession, refreshActivity, settings.sessionHours],
  )

  const logout = useCallback(() => {
    if (session) {
      void db.addActivity({
        id: createId('act'),
        userId: session.userId,
        username: session.username,
        action: 'logout',
        detail: 'Signed out',
        createdAt: Date.now(),
      })
    }
    writeSession(null)
    setSession(null)
    setUser(null)
  }, [session])

  const createUser = useCallback(
    async (input: {
      username: string
      displayName: string
      password: string
      role: UserRole
    }) => {
      if (session?.role !== 'admin') throw new Error('Admin access required.')
      const username = input.username.trim().toLowerCase()
      if (username.length < 3) throw new Error('Username must be at least 3 characters.')
      if (input.password.length < 8) {
        throw new Error('Password must be at least 8 characters.')
      }
      const existing = await db.getUserByUsername(username)
      if (existing) throw new Error('Username already exists.')
      const salt = createSalt()
      const passwordHash = await hashPassword(input.password, salt)
      const now = Date.now()
      const next: StudioUser = {
        id: createId('user'),
        username,
        displayName: input.displayName.trim() || username,
        role: input.role,
        passwordSalt: salt,
        passwordHash,
        active: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      }
      await db.saveUser(next)
      await refreshUsers()
      await logActivity('user.create', `Created user ${username} (${input.role})`)
    },
    [logActivity, refreshUsers, session?.role],
  )

  const updateUser = useCallback(
    async (
      id: string,
      patch: Partial<Pick<StudioUser, 'displayName' | 'role' | 'active'>>,
    ) => {
      if (session?.role !== 'admin') throw new Error('Admin access required.')
      const existing = await db.getUser(id)
      if (!existing) throw new Error('User not found.')
      if (existing.id === session.userId && patch.active === false) {
        throw new Error('You cannot deactivate your own account.')
      }
      if (existing.id === session.userId && patch.role && patch.role !== 'admin') {
        throw new Error('You cannot remove your own admin role.')
      }
      const updated = {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
      }
      await db.saveUser(updated)
      await refreshUsers()
      if (user?.id === id) setUser(updated)
      await logActivity('user.update', `Updated user ${existing.username}`)
    },
    [logActivity, refreshUsers, session, user?.id],
  )

  const resetUserPassword = useCallback(
    async (id: string, password: string) => {
      if (session?.role !== 'admin') throw new Error('Admin access required.')
      if (password.length < 8) throw new Error('Password must be at least 8 characters.')
      const existing = await db.getUser(id)
      if (!existing) throw new Error('User not found.')
      const salt = createSalt()
      const passwordHash = await hashPassword(password, salt)
      await db.saveUser({
        ...existing,
        passwordSalt: salt,
        passwordHash,
        updatedAt: Date.now(),
      })
      await logActivity('user.password', `Reset password for ${existing.username}`)
    },
    [logActivity, session?.role],
  )

  const deleteUserFn = useCallback(
    async (id: string) => {
      if (session?.role !== 'admin') throw new Error('Admin access required.')
      if (id === session.userId) throw new Error('You cannot delete your own account.')
      const existing = await db.getUser(id)
      if (!existing) return
      await db.deleteUser(id)
      await refreshUsers()
      await logActivity('user.delete', `Deleted user ${existing.username}`)
    },
    [logActivity, refreshUsers, session],
  )

  const saveFacebookSettings = useCallback(
    async (facebook: FacebookSettings) => {
      if (session?.role !== 'admin') throw new Error('Admin access required.')
      const next = {
        ...settings,
        facebook: { ...DEFAULT_FACEBOOK_SETTINGS, ...facebook },
        updatedAt: Date.now(),
      }
      await db.saveAppSettings(next)
      setSettings(next)
      await logActivity('settings.facebook', 'Updated Facebook Page connection')
    },
    [logActivity, session?.role, settings],
  )

  const saveSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      if (session?.role !== 'admin') throw new Error('Admin access required.')
      const next = { ...settings, ...patch, updatedAt: Date.now() }
      await db.saveAppSettings(next)
      setSettings(next)
      await logActivity('settings.update', 'Updated application settings')
    },
    [logActivity, session?.role, settings],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      needsSetup,
      session,
      user,
      users,
      settings,
      activity,
      isAdmin: session?.role === 'admin',
      canEdit: session?.role === 'admin' || session?.role === 'documenter',
      login,
      logout,
      setupAdmin,
      createUser,
      updateUser,
      resetUserPassword,
      deleteUser: deleteUserFn,
      saveFacebookSettings,
      saveSettings,
      logActivity,
      refreshActivity,
    }),
    [
      activity,
      createUser,
      deleteUserFn,
      login,
      logActivity,
      logout,
      needsSetup,
      ready,
      refreshActivity,
      resetUserPassword,
      saveFacebookSettings,
      saveSettings,
      session,
      setupAdmin,
      settings,
      updateUser,
      user,
      users,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
