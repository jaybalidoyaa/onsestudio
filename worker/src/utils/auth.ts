import { verifyJwt } from './crypto'
import { unauthorized } from './response'
import type { Env, JwtPayload } from '../types'

/** Extract and verify the Bearer JWT from the Authorization header.
 *  Returns the parsed payload or null. */
export async function getSession(request: Request, env: Env): Promise<JwtPayload | null> {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null

  const payload = await verifyJwt(token, env.JWT_SECRET)
  if (!payload) return null

  const p = payload as Record<string, unknown>
  // Check expiry
  if (typeof p.exp === 'number' && p.exp * 1000 < Date.now()) return null

  // Check session not revoked in DB
  const row = await env.DB.prepare('SELECT id FROM sessions WHERE id = ? AND expires_at > ?')
    .bind(p.sessionId, Date.now())
    .first()
  if (!row) return null

  return payload as unknown as JwtPayload
}

/** Middleware: require a valid session, attach user to request context. */
export async function requireAuth(
  request: Request,
  env: Env,
): Promise<{ user: JwtPayload } | Response> {
  const user = await getSession(request, env)
  if (!user) return unauthorized()
  return { user }
}

/** Middleware: require admin role. */
export async function requireAdmin(
  request: Request,
  env: Env,
): Promise<{ user: JwtPayload } | Response> {
  const result = await requireAuth(request, env)
  if (result instanceof Response) return result
  if (result.user.role !== 'admin') return unauthorized('Admin access required.')
  return result
}
