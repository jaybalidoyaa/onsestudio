import { IRequest } from 'itty-router'
import { createId, createSalt, hashPassword } from '../utils/crypto'
import { ok, created, err, notFound } from '../utils/response'
import { requireAdmin } from '../utils/auth'
import { publicUser, logActivity } from './auth'
import type { Env, UserRow } from '../types'

// ── GET /api/users ────────────────────────────────────────────
export async function listUsers(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth

  const { results } = await env.DB.prepare(
    'SELECT * FROM users ORDER BY username ASC',
  ).all<UserRow>()

  return ok({ users: (results ?? []).map(publicUser) })
}

// ── POST /api/users ───────────────────────────────────────────
export async function createUser(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user: admin } = auth

  const body = await request.json<{
    username: string
    displayName: string
    password: string
    role: 'admin' | 'documenter' | 'viewer'
    email?: string
    callsign?: string
    brigadaMember?: boolean
  }>()

  const username = (body.username ?? '').trim().toLowerCase()
  const displayName = (body.displayName ?? '').trim() || username
  const password = body.password ?? ''
  const role = body.role ?? 'viewer'

  if (username.length < 3) return err('Username must be at least 3 characters.')
  if (password.length < 8) return err('Password must be at least 8 characters.')

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (existing) return err('Username already exists.', 409)

  const salt = createSalt()
  const hash = await hashPassword(password, salt)
  const now = Date.now()
  const id = createId('user')

  await env.DB.prepare(
    `INSERT INTO users (id, username, display_name, email, callsign, brigada_member, role,
      password_salt, password_hash, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).bind(
    id, username, displayName,
    body.email?.trim() ?? null,
    body.callsign?.trim() ?? null,
    body.brigadaMember ? 1 : 0,
    role, salt, hash, now, now,
  ).run()

  await logActivity(env, admin.sub, admin.username, 'user.create', `Created user ${username} (${role})`)

  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
  return created({ user: publicUser(row!) })
}

// ── PATCH /api/users/:id ──────────────────────────────────────
export async function updateUser(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user: admin } = auth

  const id = request.params?.id ?? ''
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
  if (!row) return notFound('User not found.')

  if (row.id === admin.sub) {
    const body2 = await request.clone().json<Record<string, unknown>>().catch(() => ({}))
    if (body2.active === false) return err('You cannot deactivate your own account.')
    if (body2.role && body2.role !== 'admin') return err('You cannot remove your own admin role.')
  }

  const body = await request.json<{ displayName?: string; role?: string; active?: boolean }>()
  const sets: string[] = []
  const vals: unknown[] = []

  if (body.displayName !== undefined) { sets.push('display_name = ?'); vals.push(body.displayName.trim()) }
  if (body.role !== undefined) { sets.push('role = ?'); vals.push(body.role) }
  if (body.active !== undefined) { sets.push('active = ?'); vals.push(body.active ? 1 : 0) }

  if (sets.length === 0) return err('Nothing to update.')
  sets.push('updated_at = ?'); vals.push(Date.now())
  vals.push(id)

  await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
  await logActivity(env, admin.sub, admin.username, 'user.update', `Updated user ${row.username}`)

  const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
  return ok({ user: publicUser(updated!) })
}

// ── POST /api/users/:id/reset-password ───────────────────────
export async function resetPassword(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user: admin } = auth

  const id = request.params?.id ?? ''
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
  if (!row) return notFound('User not found.')

  const body = await request.json<{ password: string }>()
  if ((body.password ?? '').length < 8) return err('Password must be at least 8 characters.')

  const salt = createSalt()
  const hash = await hashPassword(body.password, salt)
  await env.DB.prepare(
    'UPDATE users SET password_salt = ?, password_hash = ?, updated_at = ? WHERE id = ?',
  ).bind(salt, hash, Date.now(), id).run()

  await logActivity(env, admin.sub, admin.username, 'user.password', `Reset password for ${row.username}`)
  return ok()
}

// ── DELETE /api/users/:id ─────────────────────────────────────
export async function deleteUser(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user: admin } = auth

  const id = request.params?.id ?? ''
  if (id === admin.sub) return err('You cannot delete your own account.')

  const row = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(id).first<{ username: string }>()
  if (!row) return notFound()

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
  await logActivity(env, admin.sub, admin.username, 'user.delete', `Deleted user ${row.username}`)
  return ok()
}
