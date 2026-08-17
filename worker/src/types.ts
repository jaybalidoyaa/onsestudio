// ── Cloudflare Worker environment bindings ────────────────────
export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
  // vars (wrangler.jsonc [vars])
  FRONTEND_URL: string
  CORS_ORIGIN: string
  // secrets (wrangler secret put)
  JWT_SECRET: string
  GMAIL_USER: string
  GMAIL_APP_PASSWORD: string
}

// ── D1 row shapes ─────────────────────────────────────────────
export interface UserRow {
  id: string
  username: string
  display_name: string
  email: string | null
  callsign: string | null
  brigada_member: number
  role: 'admin' | 'documenter' | 'viewer'
  password_salt: string
  password_hash: string
  active: number
  last_login_at: number | null
  created_at: number
  updated_at: number
}

export interface SessionRow {
  id: string
  user_id: string
  expires_at: number
  created_at: number
}

export interface SettingsRow {
  id: string
  fb_page_id: string
  fb_page_access_token: string
  fb_page_name: string
  fb_default_hashtags: string
  email_enabled: number
  email_admin_notify: string
  require_login: number
  session_hours: number
  updated_at: number
}

export interface AccessRequestRow {
  id: string
  is_brigada_member: number
  username: string
  email: string
  callsign: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  reviewed_at: number | null
  reviewed_by: string | null
  created_at: number
}

export interface AlbumRow {
  id: string
  title: string
  incident_type: string
  date: string
  time: string
  location: string
  address: string
  alarm: string
  unit: string
  callsign: string
  barangay: string
  city: string
  responding_units: string
  documentation_officer: string
  notes: string
  frame_id: string | null
  frame_name: string
  cover_photo_id: string | null
  photo_count: number
  status: 'draft' | 'processing' | 'completed'
  created_at: number
  updated_at: number
}

export interface AlbumPhotoRow {
  id: string
  album_id: string
  filename: string
  sort_order: number
  width: number
  height: number
  r2_original: string
  r2_processed: string
  r2_thumb: string
  created_at: number
}

export interface FrameRow {
  id: string
  name: string
  filename: string
  mime_type: string
  width: number
  height: number
  has_transparency: number
  r2_blob: string
  r2_thumb: string
  created_at: number
}

export interface ActivityRow {
  id: string
  user_id: string
  username: string
  action: string
  detail: string
  created_at: number
}

// ── JWT payload ───────────────────────────────────────────────
export interface JwtPayload {
  sub: string          // user id
  username: string
  displayName: string
  role: 'admin' | 'documenter' | 'viewer'
  sessionId: string
  iat: number
  exp: number
}

// ── Request context (attached by auth middleware) ─────────────
export interface AuthedRequest extends Request {
  user: JwtPayload
}
