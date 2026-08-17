import { IRequest } from 'itty-router'
import { createId, createSalt, hashPassword } from '../utils/crypto'
import { ok, created, err, notFound } from '../utils/response'
import { requireAdmin } from '../utils/auth'
import { logActivity } from './auth'
import {
  sendEmail,
  buildAccessRequestEmail,
  buildApprovalEmail,
  buildRejectionEmail,
} from '../utils/email'
import type { Env, AccessRequestRow } from '../types'

function generateTempPassword(length = 12): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

function publicRequest(r: AccessRequestRow) {
  return {
    id: r.id,
    isBrigadaMember: r.is_brigada_member === 1,
    username: r.username,
    email: r.email,
    callsign: r.callsign,
    status: r.status,
    rejectionReason: r.rejection_reason ?? undefined,
    reviewedAt: r.reviewed_at ?? undefined,
    reviewedBy: r.reviewed_by ?? undefined,
    createdAt: r.created_at,
  }
}

// ── POST /api/access-requests ─────────────────────────────────
// Public — no auth required.
export async function submitAccessRequest(request: IRequest, env: Env): Promise<Response> {
  const count = await env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{ n: number }>()
  if ((count?.n ?? 0) === 0) return err('Studio is not configured yet. Contact an administrator.')

  const body = await request.json<{
    isBrigadaMember: boolean
    username: string
    email: string
    callsign: string
  }>()

  const username = (body.username ?? '').trim().toLowerCase()
  const email = (body.email ?? '').trim().toLowerCase()
  const callsign = (body.callsign ?? '').trim()

  if (username.length < 3) return err('Username must be at least 3 characters.')
  if (!email.includes('@')) return err('Enter a valid email address.')
  if (!callsign) return err('Callsign is required.')

  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (existingUser) return err('Username is already taken.')

  const existingReq = await env.DB.prepare(
    "SELECT id FROM access_requests WHERE username = ? AND status = 'pending'",
  ).bind(username).first()
  if (existingReq) return err('An access request for this username is already pending.')

  const id = createId('req')
  await env.DB.prepare(
    `INSERT INTO access_requests (id, is_brigada_member, username, email, callsign, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
  ).bind(id, body.isBrigadaMember ? 1 : 0, username, email, callsign, Date.now()).run()

  // Notify admin by email if configured
  const settings = await env.DB.prepare(
    'SELECT email_enabled, email_admin_notify FROM settings WHERE id = ?',
  ).bind('app').first<{ email_enabled: number; email_admin_notify: string }>()

  if (settings?.email_enabled && settings.email_admin_notify?.trim()) {
    const tmpl = buildAccessRequestEmail(env.FRONTEND_URL, {
      username, email, callsign, isBrigadaMember: body.isBrigadaMember,
    })
    await sendEmail(env, { ...tmpl, to: settings.email_admin_notify.trim() })
  }

  return created({ id })
}

// ── GET /api/access-requests ──────────────────────────────────
export async function listAccessRequests(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth

  const { results } = await env.DB.prepare(
    'SELECT * FROM access_requests ORDER BY created_at DESC',
  ).all<AccessRequestRow>()

  return ok({ accessRequests: (results ?? []).map(publicRequest) })
}

// ── POST /api/access-requests/:id/approve ────────────────────
export async function approveAccessRequest(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user: admin } = auth

  const id = request.params?.id ?? ''
  const req = await env.DB.prepare('SELECT * FROM access_requests WHERE id = ?')
    .bind(id).first<AccessRequestRow>()
  if (!req) return notFound()
  if (req.status !== 'pending') return err('Request already reviewed.', 409)

  const body = await request.json<{ role?: 'admin' | 'documenter' | 'viewer' }>().catch(() => ({}))
  const role = body.role ?? 'documenter'

  // Check username not taken
  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(req.username).first()
  if (existing) return err('Username is already taken.', 409)

  // Create user
  const tempPassword = generateTempPassword()
  const salt = createSalt()
  const hash = await hashPassword(tempPassword, salt)
  const now = Date.now()
  const userId = createId('user')

  await env.DB.prepare(
    `INSERT INTO users (id, username, display_name, email, callsign, brigada_member, role,
       password_salt, password_hash, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).bind(
    userId, req.username, req.callsign, req.email, req.callsign,
    req.is_brigada_member, role, salt, hash, now, now,
  ).run()

  // Update request
  await env.DB.prepare(
    "UPDATE access_requests SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ?",
  ).bind(now, admin.sub, id).run()

  await logActivity(env, admin.sub, admin.username, 'access.approve', `Approved access for ${req.username} (${req.callsign})`)

  // Send approval email
  const settings = await env.DB.prepare('SELECT email_enabled FROM settings WHERE id = ?').bind('app').first<{ email_enabled: number }>()
  let emailSent = false
  if (settings?.email_enabled) {
    const tmpl = buildApprovalEmail(env.FRONTEND_URL, req.username, tempPassword)
    emailSent = await sendEmail(env, { ...tmpl, to: req.email })
  }

  return ok({ username: req.username, password: tempPassword, emailSent })
}

// ── POST /api/access-requests/:id/reject ─────────────────────
export async function rejectAccessRequest(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user: admin } = auth

  const id = request.params?.id ?? ''
  const req = await env.DB.prepare('SELECT * FROM access_requests WHERE id = ?')
    .bind(id).first<AccessRequestRow>()
  if (!req) return notFound()
  if (req.status !== 'pending') return err('Request already reviewed.', 409)

  const body = await request.json<{ reason?: string }>().catch(() => ({}))
  const reason = body.reason?.trim() ?? ''
  const now = Date.now()

  await env.DB.prepare(
    "UPDATE access_requests SET status = 'rejected', rejection_reason = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?",
  ).bind(reason || null, now, admin.sub, id).run()

  await logActivity(env, admin.sub, admin.username, 'access.reject', `Rejected access for ${req.username}`)

  // Send rejection email
  const settings = await env.DB.prepare('SELECT email_enabled FROM settings WHERE id = ?').bind('app').first<{ email_enabled: number }>()
  if (settings?.email_enabled) {
    const tmpl = buildRejectionEmail(reason)
    await sendEmail(env, { ...tmpl, to: req.email })
  }

  return ok()
}
