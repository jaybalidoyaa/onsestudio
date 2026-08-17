import { IRequest } from 'itty-router'
import { ok } from '../utils/response'
import { requireAdmin } from '../utils/auth'
import type { Env, ActivityRow } from '../types'

// ── GET /api/activity ─────────────────────────────────────────
export async function listActivity(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAdmin(request as unknown as Request, env)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '40', 10), 200)

  const { results } = await env.DB.prepare(
    'SELECT * FROM activity ORDER BY created_at DESC LIMIT ?',
  ).bind(limit).all<ActivityRow>()

  return ok({
    activity: (results ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      action: r.action,
      detail: r.detail,
      createdAt: r.created_at,
    })),
  })
}
