import { IRequest } from 'itty-router'
import { createId } from '../utils/crypto'
import { ok, created, err, notFound } from '../utils/response'
import { requireAuth } from '../utils/auth'
import { putObject, getObject, deleteObject } from '../utils/r2'
import type { Env, FrameRow } from '../types'

function publicFrame(r: FrameRow, baseUrl: string) {
  return {
    id: r.id,
    name: r.name,
    filename: r.filename,
    mimeType: r.mime_type,
    width: r.width,
    height: r.height,
    hasTransparency: r.has_transparency === 1,
    objectUrl: `${baseUrl}/api/files/${encodeURIComponent(r.r2_blob)}`,
    thumbnailUrl: `${baseUrl}/api/files/${encodeURIComponent(r.r2_thumb)}`,
    createdAt: r.created_at,
  }
}

// ── GET /api/frames ───────────────────────────────────────────
export async function listFrames(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth

  const { results } = await env.DB.prepare(
    'SELECT * FROM frames ORDER BY created_at DESC',
  ).all<FrameRow>()

  const baseUrl = env.FRONTEND_URL.replace(/\/$/, '')
  return ok({ frames: (results ?? []).map((r) => publicFrame(r, baseUrl)) })
}

// ── POST /api/frames ──────────────────────────────────────────
// Accepts multipart/form-data: blob (File), thumb (File), name, width, height, hasTransparency
export async function uploadFrame(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user } = auth
  if (user.role === 'viewer') return err('Insufficient permissions.', 403)

  const form = await request.formData()
  const blobFile = form.get('blob') as File | null
  const thumbFile = form.get('thumb') as File | null

  if (!blobFile || !thumbFile) return err('blob and thumb files are required.')

  const id = createId('frm')
  const r2Blob = `frames/${id}/original`
  const r2Thumb = `frames/${id}/thumb`

  await Promise.all([
    putObject(env, r2Blob, await blobFile.arrayBuffer(), blobFile.type || 'image/png'),
    putObject(env, r2Thumb, await thumbFile.arrayBuffer(), thumbFile.type || 'image/png'),
  ])

  const now = Date.now()
  await env.DB.prepare(
    `INSERT INTO frames (id, name, filename, mime_type, width, height, has_transparency, r2_blob, r2_thumb, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    (form.get('name') as string) || blobFile.name,
    blobFile.name,
    blobFile.type || 'image/png',
    parseInt((form.get('width') as string) || '0', 10),
    parseInt((form.get('height') as string) || '0', 10),
    (form.get('hasTransparency') as string) === 'true' ? 1 : 0,
    r2Blob, r2Thumb, now,
  ).run()

  const row = await env.DB.prepare('SELECT * FROM frames WHERE id = ?').bind(id).first<FrameRow>()
  const baseUrl = env.FRONTEND_URL.replace(/\/$/, '')
  return created({ frame: publicFrame(row!, baseUrl) })
}

// ── PATCH /api/frames/:id ─────────────────────────────────────
export async function renameFrame(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user } = auth
  if (user.role === 'viewer') return err('Insufficient permissions.', 403)

  const id = request.params?.id ?? ''
  const row = await env.DB.prepare('SELECT id FROM frames WHERE id = ?').bind(id).first()
  if (!row) return notFound()

  const body = await request.json<{ name: string }>()
  if (!body.name?.trim()) return err('Name is required.')

  await env.DB.prepare('UPDATE frames SET name = ? WHERE id = ?').bind(body.name.trim(), id).run()

  const updated = await env.DB.prepare('SELECT * FROM frames WHERE id = ?').bind(id).first<FrameRow>()
  const baseUrl = env.FRONTEND_URL.replace(/\/$/, '')
  return ok({ frame: publicFrame(updated!, baseUrl) })
}

// ── DELETE /api/frames/:id ────────────────────────────────────
export async function deleteFrame(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user } = auth
  if (user.role === 'viewer') return err('Insufficient permissions.', 403)

  const id = request.params?.id ?? ''
  const row = await env.DB.prepare('SELECT r2_blob, r2_thumb FROM frames WHERE id = ?').bind(id).first<Pick<FrameRow, 'r2_blob' | 'r2_thumb'>>()
  if (!row) return notFound()

  await Promise.all([deleteObject(env, row.r2_blob), deleteObject(env, row.r2_thumb)])
  await env.DB.prepare('DELETE FROM frames WHERE id = ?').bind(id).run()

  return ok()
}

// ── GET /api/files/:key ───────────────────────────────────────
// Serves R2 objects (photos, frames, thumbnails). Key is URL-encoded.
export async function serveFile(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth

  const key = decodeURIComponent(request.params?.key ?? '')
  if (!key) return notFound()

  const response = await getObject(env, key)
  if (!response) return notFound()

  return response
}
