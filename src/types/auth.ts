export type UserRole = 'admin' | 'documenter' | 'viewer'

export interface StudioUser {
  id: string
  username: string
  displayName: string
  role: UserRole
  passwordSalt: string
  passwordHash: string
  active: boolean
  createdAt: number
  updatedAt: number
  lastLoginAt: number | null
}

export interface AuthSession {
  userId: string
  username: string
  displayName: string
  role: UserRole
  issuedAt: number
  expiresAt: number
}

export interface FacebookSettings {
  pageId: string
  pageAccessToken: string
  pageName: string
  defaultHashtags: string
}

export interface AppSettings {
  id: 'app'
  facebook: FacebookSettings
  requireLogin: boolean
  sessionHours: number
  updatedAt: number
}

export interface ActivityEntry {
  id: string
  userId: string
  username: string
  action: string
  detail: string
  createdAt: number
}

export const DEFAULT_FACEBOOK_SETTINGS: FacebookSettings = {
  pageId: '',
  pageAccessToken: '',
  pageName: '',
  defaultHashtags:
    '#BrigadaOnse #SVFAR #SunValleyFireAndRescue #Parañaque #EmergencyResponse',
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'app',
  facebook: { ...DEFAULT_FACEBOOK_SETTINGS },
  requireLogin: true,
  sessionHours: 12,
  updatedAt: Date.now(),
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  documenter: 'Documentation Officer',
  viewer: 'Viewer',
}
