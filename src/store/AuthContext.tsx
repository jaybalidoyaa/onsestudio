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
import {
  generateTempPassword,
  sendEmail,
} from '../lib/email'
import { createId } from '../lib/utils'
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
  accessRequests: AccessRequest[]
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
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [activity, setActivity] = useState<ActivityEntry[]>([])

  const refreshUsers = useCallback(async () => {
    setUsers(await db.listUsers())
  }, [])

  const refreshAccessRequests = useCallback(async () => {
    setAccessRequests(await db.listAccessRequests())
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
            await refreshAccessRequests()
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
  }, [refreshAccessRequests, refreshActivity, refreshUsers])

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
      await refreshAccessRequests()
      await refreshActivity()
    },
    [refreshAccessRequests, refreshActivity, refreshUsers],
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
      email?: string
      callsign?: string
      brigadaMember?: boolean
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
        email: input.email?.trim() || undefined,
        callsign: input.callsign?.trim() || undefined,
        brigadaMember: input.brigadaMember,
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

  const submitAccessRequest = useCallback(
    async (input: {
      isBrigadaMember: boolean
      username: string
      email: string
      callsign: string
    }) => {
      const count = await db.countUsers()
      if (count === 0) {
        throw new Error('Studio is not configured yet. Contact an administrator.')
      }
      const username = input.username.trim().toLowerCase()
      const email = input.email.trim().toLowerCase()
      const callsign = input.callsign.trim()
      if (username.length < 3) throw new Error('Username must be at least 3 characters.')
      if (!email.includes('@')) throw new Error('Enter a valid email address.')
      if (!callsign) throw new Error('Callsign is required.')
      const existingUser = await db.getUserByUsername(username)
      if (existingUser) throw new Error('Username is already taken.')
      const pending = (await db.listAccessRequests()).find(
        (r) => r.status === 'pending' && r.username === username,
      )
      if (pending) throw new Error('An access request for this username is already pending.')
      const request: AccessRequest = {
        id: createId('req'),
        isBrigadaMember: input.isBrigadaMember,
        username,
        email,
        callsign,
        status: 'pending',
        createdAt: Date.now(),
      }
      await db.saveAccessRequest(request)
      await refreshAccessRequests()

      const adminEmail = settings.email.adminNotificationEmail.trim()
      if (settings.email.enabled && adminEmail) {
        const memberLabel = input.isBrigadaMember ? 'Yes' : 'No'
        sendEmail(settings.email, {
          to: adminEmail,
          subject: `[SVFAR Studio] New access request — ${username}`,
          body: [
            'A new access request was submitted.',
            '',
            `Brigada Onse member: ${memberLabel}`,
            `Username: ${username}`,
            `Email: ${email}`,
            `Callsign: ${callsign}`,
            '',
            'Sign in to Studio Settings to review and approve or reject this request.',
          ].join('\n'),
        })
      }
    },
    [refreshAccessRequests, settings.email],
  )

  const approveAccessRequest = useCallback(
    async (id: string, role: UserRole = 'documenter') => {
      if (session?.role !== 'admin') throw new Error('Admin access required.')
      const request = await db.getAccessRequest(id)
      if (!request) throw new Error('Access request not found.')
      if (request.status !== 'pending') throw new Error('Request already reviewed.')
      const existingUser = await db.getUserByUsername(request.username)
      if (existingUser) throw new Error('Username is already taken.')
      const password = generateTempPassword()
      await createUser({
        username: request.username,
        displayName: request.callsign,
        password,
        role,
        email: request.email,
        callsign: request.callsign,
        brigadaMember: request.isBrigadaMember,
      })
      const now = Date.now()
      await db.saveAccessRequest({
        ...request,
        status: 'approved',
        reviewedAt: now,
        reviewedBy: session.userId,
      })
      await refreshAccessRequests()
      await logActivity(
        'access.approve',
        `Approved access for ${request.username} (${request.callsign})`,
      )

      const loginUrl = window.location.origin
      const emailBody = [
        'Your access to Brigada Onse SVFAR Studio has been approved.',
        '',
        `Sign in at: ${loginUrl}`,
        `Username: ${request.username}`,
        `Temporary password: ${password}`,
        '',
        'Please sign in and change your password from Settings after your first login.',
        '',
        'Brigada Onse SVFAR Studio',
      ].join('\n')
      const emailSent = sendEmail(settings.email, {
        to: request.email,
        subject: 'Brigada Onse SVFAR Studio — Your access has been approved',
        body: emailBody,
      })
      return { username: request.username, password, emailSent }
    },
    [
      createUser,
      logActivity,
      refreshAccessRequests,
      session,
      settings.email,
    ],
  )

  const rejectAccessRequest = useCallback(
    async (id: string, reason?: string) => {
      if (session?.role !== 'admin') throw new Error('Admin access required.')
      const request = await db.getAccessRequest(id)
      if (!request) throw new Error('Access request not found.')
      if (request.status !== 'pending') throw new Error('Request already reviewed.')
      const now = Date.now()
      await db.saveAccessRequest({
        ...request,
        status: 'rejected',
        reviewedAt: now,
        reviewedBy: session.userId,
        rejectionReason: reason?.trim() || undefined,
      })
      await refreshAccessRequests()
      await logActivity('access.reject', `Rejected access for ${request.username}`)

      if (settings.email.enabled) {
        const reasonLine = reason?.trim()
          ? `\n\nReason: ${reason.trim()}`
          : ''
        sendEmail(settings.email, {
          to: request.email,
          subject: 'Brigada Onse SVFAR Studio — Access request update',
          body: [
            'Thank you for your interest in Brigada Onse SVFAR Studio.',
            '',
            'Your access request was not approved at this time.',
            reasonLine,
            '',
            'If you believe this was a mistake, contact your administrator.',
          ]
            .filter(Boolean)
            .join('\n'),
        })
      }
    },
    [logActivity, refreshAccessRequests, session, settings.email],
  )

  const saveEmailSettings = useCallback(
    async (email: EmailSettings) => {
      if (session?.role !== 'admin') throw new Error('Admin access required.')
      const next = { ...settings, email, updatedAt: Date.now() }
      await db.saveAppSettings(next)
      setSettings(next)
      await logActivity('settings.email', 'Updated email notification settings')
    },
    [logActivity, session?.role, settings],
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
      deleteUser: deleteUserFn,
      saveFacebookSettings,
      saveSettings,
      logActivity,
      refreshActivity,
    }),
    [
      activity,
      accessRequests,
      approveAccessRequest,
      createUser,
      deleteUserFn,
      login,
      logActivity,
      logout,
      needsSetup,
      ready,
      refreshActivity,
      rejectAccessRequest,
      resetUserPassword,
      saveEmailSettings,
      saveFacebookSettings,
      saveSettings,
      session,
      setupAdmin,
      submitAccessRequest,
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
