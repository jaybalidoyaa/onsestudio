export type UserRole = 'admin' | 'documenter' | 'viewer'

export interface StudioUser {
  id: string
  username: string
  displayName: string
  email?: string
  callsign?: string
  brigadaMember?: boolean
  role: UserRole
  active: boolean
  lastLoginAt: number | null
  createdAt: number
  updatedAt: number
}

export interface EmailSettings {
  enabled: boolean
  adminNotificationEmail: string
}

export interface AuthSession {
  userId: string
  username: string
  displayName: string
  role: UserRole
  token: string
  expiresAt: number
}

export interface FacebookSettings {
  pageId: string
  pageAccessToken: string
  pageName: string
  defaultHashtags: string
}

export interface AppSettings {
  facebook: FacebookSettings
  email: EmailSettings
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

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: false,
  adminNotificationEmail: '',
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  facebook: { ...DEFAULT_FACEBOOK_SETTINGS },
  email: { ...DEFAULT_EMAIL_SETTINGS },
  requireLogin: true,
  sessionHours: 12,
  updatedAt: 0,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  documenter: 'Documentation Officer',
  viewer: 'Viewer',
}
