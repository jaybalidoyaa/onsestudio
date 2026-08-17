import { IRequest } from 'itty-router'
import { ok, err } from '../utils/response'
import { requireAuth, requireAdmin } from '../utils/auth'
import { logActivity } from './auth'
import type { Env, SettingsRow } from '../types'

function publicSettings(row: SettingsRow) {
  return {
    facebook: {
      pageId: row.fb_page_id,
      pageAccessToken: row.fb_page_access_token,
      pageName: row.fb_page_name,
      defaultHashtags: row.fb_default_hashtags,
    },
    email: {
      enabled: row.email_enabled === 1,
      adminNotificationEmail: row.email_admin_notify,
    },
    requireLogin: row.require_login === 1,
    sessionHours: row.session_hours,
    updatedAt: row.updated_at,
  }
}

// ── GET /api/settings ─────────────────────────────────────────
export async function getSettings(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth

  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = ?').bind('app').first<SettingsRow>()
  if (!row) return err('Settings not found.', 500)

  // Non-admins don't get Facebook token or email internals
  const { user } = auth
  if (user.role !== 'admin') {
    return ok({
      facebook: { pageId: row.fb_page_id, pageName: row.fb_page_name, defaultHashtags: row.fb_default_hashtags, pageAccessToken: '' },
      email: { enabled: row.email_enabled === 1, adminNotificationEmail: '' },
      requireLogin: row.require_login === 1,
      sessionHours: row.session_hours,
      updatedAt: row.updated_at,
    })
  }

  return ok(publicSettings(row))
}

// ── PATCH /api/settings/email ─────────────────────────────────
export async function saveEmailSettings(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user: admin } = auth

  const body = await request.json<{ enabled?: boolean; adminNotificationEmail?: string }>()

  const sets: string[] = []
  const vals: unknown[] = []

  if (body.enabled !== undefined) { sets.push('email_enabled = ?'); vals.push(body.enabled ? 1 : 0) }
  if (body.adminNotificationEmail !== undefined) { sets.push('email_admin_notify = ?'); vals.push(body.adminNotificationEmail.trim()) }

  if (sets.length === 0) return err('Nothing to update.')
  sets.push('updated_at = ?'); vals.push(Date.now())
  vals.push('app')

  await env.DB.prepare(`UPDATE settings SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
  await logActivity(env, admin.sub, admin.username, 'settings.email', 'Updated email notification settings')

  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = ?').bind('app').first<SettingsRow>()
  return ok(publicSettings(row!))
}

// ── PATCH /api/settings/facebook ─────────────────────────────
export async function saveFacebookSettings(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user: admin } = auth

  const body = await request.json<{
    pageId?: string
    pageAccessToken?: string
    pageName?: string
    defaultHashtags?: string
  }>()

  const sets: string[] = []
  const vals: unknown[] = []

  if (body.pageId !== undefined) { sets.push('fb_page_id = ?'); vals.push(body.pageId.trim()) }
  if (body.pageAccessToken !== undefined) { sets.push('fb_page_access_token = ?'); vals.push(body.pageAccessToken.trim()) }
  if (body.pageName !== undefined) { sets.push('fb_page_name = ?'); vals.push(body.pageName.trim()) }
  if (body.defaultHashtags !== undefined) { sets.push('fb_default_hashtags = ?'); vals.push(body.defaultHashtags) }

  if (sets.length === 0) return err('Nothing to update.')
  sets.push('updated_at = ?'); vals.push(Date.now())
  vals.push('app')

  await env.DB.prepare(`UPDATE settings SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
  await logActivity(env, admin.sub, admin.username, 'settings.facebook', 'Updated Facebook Page connection')

  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = ?').bind('app').first<SettingsRow>()
  return ok(publicSettings(row!))
}

// ── PATCH /api/settings ───────────────────────────────────────
export async function saveSettings(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user: admin } = auth

  const body = await request.json<{ requireLogin?: boolean; sessionHours?: number }>()

  const sets: string[] = []
  const vals: unknown[] = []

  if (body.requireLogin !== undefined) { sets.push('require_login = ?'); vals.push(body.requireLogin ? 1 : 0) }
  if (body.sessionHours !== undefined) { sets.push('session_hours = ?'); vals.push(Math.max(1, Math.min(168, body.sessionHours))) }

  if (sets.length === 0) return err('Nothing to update.')
  sets.push('updated_at = ?'); vals.push(Date.now())
  vals.push('app')

  await env.DB.prepare(`UPDATE settings SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
  await logActivity(env, admin.sub, admin.username, 'settings.update', 'Updated application settings')

  const row = await env.DB.prepare('SELECT * FROM settings WHERE id = ?').bind('app').first<SettingsRow>()
  return ok(publicSettings(row!))
}
