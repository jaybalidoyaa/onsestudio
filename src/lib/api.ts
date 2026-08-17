/**
 * Typed API client for the Cloudflare Worker backend.
 *
 * Base URL is read from VITE_API_URL at build time.
 * In development: set VITE_API_URL=http://localhost:8787 in .env.local
 * In production:  set VITE_API_URL=https://onse-studio-api.<account>.workers.dev
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined ?? '').replace(/\/$/, '')

// ── Token storage ─────────────────────────────────────────────
const TOKEN_KEY = 'onse-studio-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// ── Core fetch wrapper ────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (auth) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    let message = res.statusText
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch { /* ignore */ }
    throw new ApiError(res.status, message)
  }

  // 204 / empty bodies
  const text = await res.text()
  return (text ? JSON.parse(text) : {}) as T
}

function get<T>(path: string, auth = true) {
  return request<T>(path, { method: 'GET' }, auth)
}

function post<T>(path: string, body?: unknown, auth = true) {
  return request<T>(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  }, auth)
}

function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' })
}

// ── API surface ───────────────────────────────────────────────

// Auth
export const auth = {
  setup: (body: { username: string; displayName: string; password: string }) =>
    post<{ token: string; user: ApiUser }>('/api/auth/setup', body, false),

  login: (body: { username: string; password: string }) =>
    post<{ token: string; user: ApiUser }>('/api/auth/login', body, false),

  logout: () => post<void>('/api/auth/logout'),

  me: () => get<{ user: ApiUser }>('/api/auth/me'),
}

// Users
export const users = {
  list: () => get<{ users: ApiUser[] }>('/api/users'),

  create: (body: {
    username: string
    displayName: string
    password: string
    role: UserRole
    email?: string
    callsign?: string
    brigadaMember?: boolean
  }) => post<{ user: ApiUser }>('/api/users', body),

  update: (id: string, body: { displayName?: string; role?: UserRole; active?: boolean }) =>
    patch<{ user: ApiUser }>(`/api/users/${id}`, body),

  resetPassword: (id: string, password: string) =>
    post<void>(`/api/users/${id}/reset-password`, { password }),

  delete: (id: string) => del<void>(`/api/users/${id}`),
}

// Access requests
export const accessRequests = {
  submit: (body: {
    isBrigadaMember: boolean
    username: string
    email: string
    callsign: string
  }) => post<{ id: string }>('/api/access-requests', body, false),

  list: () => get<{ accessRequests: ApiAccessRequest[] }>('/api/access-requests'),

  approve: (id: string, role: UserRole = 'documenter') =>
    post<{ username: string; password: string; emailSent: boolean }>(
      `/api/access-requests/${id}/approve`, { role }),

  reject: (id: string, reason?: string) =>
    post<void>(`/api/access-requests/${id}/reject`, { reason }),
}

// Settings
export const settings = {
  get: () => get<ApiSettings>('/api/settings'),

  saveEmail: (body: { enabled: boolean; adminNotificationEmail: string }) =>
    patch<ApiSettings>('/api/settings/email', body),

  saveFacebook: (body: {
    pageId: string
    pageAccessToken: string
    pageName: string
    defaultHashtags: string
  }) => patch<ApiSettings>('/api/settings/facebook', body),

  save: (body: { requireLogin?: boolean; sessionHours?: number }) =>
    patch<ApiSettings>('/api/settings', body),
}

// Albums
export const albums = {
  list: () => get<{ albums: ApiAlbum[] }>('/api/albums'),

  create: (body: Partial<ApiAlbum>) =>
    post<{ album: ApiAlbum }>('/api/albums', body),

  update: (id: string, body: Partial<ApiAlbum>) =>
    patch<{ album: ApiAlbum }>(`/api/albums/${id}`, body),

  delete: (id: string) => del<void>(`/api/albums/${id}`),

  listPhotos: (albumId: string) =>
    get<{ photos: ApiAlbumPhoto[] }>(`/api/albums/${albumId}/photos`),

  addPhoto: (albumId: string, form: FormData) =>
    post<{ photo: ApiAlbumPhoto }>(`/api/albums/${albumId}/photos`, form),

  deletePhoto: (albumId: string, photoId: string) =>
    del<void>(`/api/albums/${albumId}/photos/${photoId}`),
}

// Frames
export const frames = {
  list: () => get<{ frames: ApiFrame[] }>('/api/frames'),

  upload: (form: FormData) =>
    post<{ frame: ApiFrame }>('/api/frames', form),

  rename: (id: string, name: string) =>
    patch<{ frame: ApiFrame }>(`/api/frames/${id}`, { name }),

  delete: (id: string) => del<void>(`/api/frames/${id}`),
}

// Activity
export const activity = {
  list: (limit = 40) =>
    get<{ activity: ApiActivity[] }>(`/api/activity?limit=${limit}`),
}

// ── Shared API types (mirror what the Worker returns) ─────────

export type UserRole = 'admin' | 'documenter' | 'viewer'

export interface ApiUser {
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

export interface ApiAccessRequest {
  id: string
  isBrigadaMember: boolean
  username: string
  email: string
  callsign: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  reviewedAt?: number
  reviewedBy?: string
  createdAt: number
}

export interface ApiSettings {
  facebook: {
    pageId: string
    pageAccessToken: string
    pageName: string
    defaultHashtags: string
  }
  email: {
    enabled: boolean
    adminNotificationEmail: string
  }
  requireLogin: boolean
  sessionHours: number
  updatedAt: number
}

export interface ApiAlbum {
  id: string
  title: string
  incidentType: string
  date: string
  time: string
  location: string
  address: string
  alarm: string
  unit: string
  callsign: string
  barangay: string
  city: string
  respondingUnits: string
  documentationOfficer: string
  notes: string
  frameId: string | null
  frameName: string
  coverPhotoId: string | null
  photoCount: number
  status: 'draft' | 'processing' | 'completed'
  createdAt: number
  updatedAt: number
}

export interface ApiAlbumPhoto {
  id: string
  albumId: string
  filename: string
  order: number
  width: number
  height: number
  originalUrl: string
  processedUrl: string
  thumbnailUrl: string
  createdAt: number
}

export interface ApiFrame {
  id: string
  name: string
  filename: string
  mimeType: string
  width: number
  height: number
  hasTransparency: boolean
  objectUrl: string
  thumbnailUrl: string
  createdAt: number
}

export interface ApiActivity {
  id: string
  userId: string
  username: string
  action: string
  detail: string
  createdAt: number
}
