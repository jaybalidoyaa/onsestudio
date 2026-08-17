import { IRequest } from 'itty-router'
import { createId, createSalt, hashPassword, signJwt, verifyPassword } from '../utils/crypto'
import { ok, created, err, unauthorized } from '../utils/response'
import { requireAuth } from '../utils/auth'
import type { Env, UserRow, JwtPayload } from '../types'

// ── POST /api/auth/setup ──────────────────────────────────────
// First-run: create the administrator account.
export async function setupAdmin(request: IRequest, env: Env): Promise<Response> {
  // Only allowed when zero users exist
  const count = await env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{ n: number }>()
  if ((count?.n ?? 0) > 0) return err('Admin already configured.', 409)

  const body = await request.json<{ username: string; displayName: string; password: string }>()
  const username = (body.username ?? '').trim().toLowerCase()
  const displayName = (body.displayName ?? '').trim() || username
  const password = body.password ?? ''

  if (username.length < 3) return err('Username must be at least 3 characters.')
  if (password.length < 8) return err('Password must be at least 8 characters.')

  const salt = createSalt()
  const hash = await hashPassword(password, salt)
  const now = Date.now()
  const id = createId('user')

  await env.DB.prepare(
    `INSERT INTO users (id, username, display_name, role, password_salt, password_hash, active, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', ?, ?, 1, ?, ?)`,
  ).bind(id, username, displayName, salt, hash, now, now).run()

  await logActivity(env, id, username, 'setup', 'Created initial administrator account')

  const settings = await env.DB.prepare('SELECT session_hours FROM settings WHERE id = ?').bind('app').first<{ session_hours: number }>()
  const sessionHours = settings?.session_hours ?? 12

  const token = await issueToken(env, { id, username, display_name: displayName, role: 'admin' } as UserRow, sessionHours)

  return created({ token, user: publicUser({ id, username, display_name: displayName, role: 'admin', active: 1 } as UserRow) })
}

// ── POST /api/auth/login ──────────────────────────────────────
export async function login(request: IRequest, env: Env): Promise<Response> {
  const body = await request.json<{ username: string; password: string }>()
  const username = (body.username ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<UserRow>()
  if (!user || !user.active) return unauthorized('Invalid username or password.')

  const ok2 = await verifyPassword(password, user.password_salt, user.password_hash)
  if (!ok2) return unauthorized('Invalid username or password.')

  const settings = await env.DB.prepare('SELECT session_hours FROM settings WHERE id = ?').bind('app').first<{ session_hours: number }>()
  const sessionHours = settings?.session_hours ?? 12

  const now = Date.now()
  await env.DB.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').bind(now, now, user.id).run()
  await logActivity(env, user.id, user.username, 'login', 'Signed in to Studio')

  const token = await issueToken(env, user, sessionHours)
  return ok({ token, user: publicUser(user) })
}

// ── POST /api/auth/logout ─────────────────────────────────────
export async function logout(request: IRequest, env: Env): Promise<Response> {
  const result = await requireAuth(request as unknown as Request, env)
  if (result instanceof Response) return result
  const { user } = result

  // Revoke session in DB
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(user.sessionId).run()
  await logActivity(env, user.sub, user.username, 'logout', 'Signed out')

  return ok()
}

// ── GET /api/auth/me ──────────────────────────────────────────
export async function me(request: IRequest, env: Env): Promise<Response> {
  const result = await requireAuth(request as unknown as Request, env)
  if (result instanceof Response) return result
  const { user } = result

  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.sub).first<UserRow>()
  if (!row || !row.active) return unauthorized()

  return ok({ user: publicUser(row) })
}

// ── Helpers ───────────────────────────────────────────────────
async function issueToken(env: Env, user: UserRow, sessionHours: number): Promise<string> {
  const sessionId = createId('sess')
  const now = Math.floor(Date.now() / 1000)
  const exp = now + sessionHours * 3600
  const expiresAt = exp * 1000

  await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(sessionId, user.id, expiresAt, Date.now())
    .run()

  // Prune expired sessions for this user (keep DB clean)
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?')
    .bind(user.id, Date.now())
    .run()

  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    sessionId,
    iat: now,
    exp,
  }

  return signJwt(payload as unknown as Record<string, unknown>, env.JWT_SECRET)
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    email: u.email ?? undefined,
    callsign: u.callsign ?? undefined,
    brigadaMember: u.brigada_member === 1,
    role: u.role,
    active: u.active === 1,
    lastLoginAt: u.last_login_at ?? null,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }
}

export async function logActivity(
  env: Env,
  userId: string,
  username: string,
  action: string,
  detail: string,
): Promise<void> {
  const id = createId('act')
  await env.DB.prepare(
    'INSERT INTO activity (id, user_id, username, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(id, userId, username, action, detail, Date.now()).run()

  // Cap at 200 entries
  await env.DB.prepare(`
    DELETE FROM activity WHERE id IN (
      SELECT id FROM activity ORDER BY created_at DESC LIMIT -1 OFFSET 200
    )
  `).run()
}
