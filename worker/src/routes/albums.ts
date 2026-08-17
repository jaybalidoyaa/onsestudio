import { IRequest } from 'itty-router'
import { createId } from '../utils/crypto'
import { ok, created, err, notFound } from '../utils/response'
import { requireAuth } from '../utils/auth'
import { logActivity } from './auth'
import { putObject, getObject, deletePrefix } from '../utils/r2'
import type { Env, AlbumRow, AlbumPhotoRow } from '../types'

function publicAlbum(r: AlbumRow) {
  return {
    id: r.id, title: r.title, incidentType: r.incident_type,
    date: r.date, time: r.time, location: r.location, address: r.address,
    alarm: r.alarm, unit: r.unit, callsign: r.callsign,
    barangay: r.barangay, city: r.city,
    respondingUnits: r.responding_units, documentationOfficer: r.documentation_officer,
    notes: r.notes, frameId: r.frame_id, frameName: r.frame_name,
    coverPhotoId: r.cover_photo_id, photoCount: r.photo_count,
    status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

function publicPhoto(r: AlbumPhotoRow, baseUrl: string) {
  return {
    id: r.id, albumId: r.album_id, filename: r.filename,
    order: r.sort_order, width: r.width, height: r.height,
    originalUrl: `${baseUrl}/api/files/${encodeURIComponent(r.r2_original)}`,
    processedUrl: `${baseUrl}/api/files/${encodeURIComponent(r.r2_processed)}`,
    thumbnailUrl: `${baseUrl}/api/files/${encodeURIComponent(r.r2_thumb)}`,
    createdAt: r.created_at,
  }
}

// ── GET /api/albums ───────────────────────────────────────────
export async function listAlbums(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth

  const { results } = await env.DB.prepare(
    'SELECT * FROM albums ORDER BY updated_at DESC',
  ).all<AlbumRow>()

  return ok({ albums: (results ?? []).map(publicAlbum) })
}

// ── POST /api/albums ──────────────────────────────────────────
export async function createAlbum(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user } = auth
  if (user.role === 'viewer') return err('Insufficient permissions.', 403)

  const body = await request.json<Partial<ReturnType<typeof publicAlbum>>>()
  const now = Date.now()
  const id = createId('alb')

  await env.DB.prepare(`
    INSERT INTO albums (id, title, incident_type, date, time, location, address, alarm,
      unit, callsign, barangay, city, responding_units, documentation_officer, notes,
      frame_id, frame_name, cover_photo_id, photo_count, status, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'draft',?,?)
  `).bind(
    id,
    body.title ?? 'Untitled',
    body.incidentType ?? 'Other',
    body.date ?? '', body.time ?? '',
    body.location ?? '', body.address ?? '',
    body.alarm ?? '', body.unit ?? '', body.callsign ?? '',
    body.barangay ?? '', body.city ?? '',
    body.respondingUnits ?? '', body.documentationOfficer ?? '',
    body.notes ?? '',
    body.frameId ?? null, body.frameName ?? '',
    null, now, now,
  ).run()

  const row = await env.DB.prepare('SELECT * FROM albums WHERE id = ?').bind(id).first<AlbumRow>()
  return created({ album: publicAlbum(row!) })
}

// ── PATCH /api/albums/:id ─────────────────────────────────────
export async function updateAlbum(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user } = auth
  if (user.role === 'viewer') return err('Insufficient permissions.', 403)

  const id = request.params?.id ?? ''
  const row = await env.DB.prepare('SELECT id FROM albums WHERE id = ?').bind(id).first()
  if (!row) return notFound()

  const body = await request.json<Record<string, unknown>>()
  const map: Record<string, string> = {
    title: 'title', incidentType: 'incident_type', date: 'date', time: 'time',
    location: 'location', address: 'address', alarm: 'alarm', unit: 'unit',
    callsign: 'callsign', barangay: 'barangay', city: 'city',
    respondingUnits: 'responding_units', documentationOfficer: 'documentation_officer',
    notes: 'notes', frameId: 'frame_id', frameName: 'frame_name',
    coverPhotoId: 'cover_photo_id', status: 'status',
  }

  const sets: string[] = []
  const vals: unknown[] = []
  for (const [jsKey, dbCol] of Object.entries(map)) {
    if (jsKey in body) { sets.push(`${dbCol} = ?`); vals.push(body[jsKey] ?? null) }
  }
  if (sets.length === 0) return err('Nothing to update.')
  sets.push('updated_at = ?'); vals.push(Date.now()); vals.push(id)

  await env.DB.prepare(`UPDATE albums SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()

  const updated = await env.DB.prepare('SELECT * FROM albums WHERE id = ?').bind(id).first<AlbumRow>()
  return ok({ album: publicAlbum(updated!) })
}

// ── DELETE /api/albums/:id ────────────────────────────────────
export async function deleteAlbum(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user } = auth
  if (user.role === 'viewer') return err('Insufficient permissions.', 403)

  const id = request.params?.id ?? ''
  const row = await env.DB.prepare('SELECT id FROM albums WHERE id = ?').bind(id).first()
  if (!row) return notFound()

  // Delete all R2 objects for this album
  await deletePrefix(env, `albums/${id}/`)
  await env.DB.prepare('DELETE FROM albums WHERE id = ?').bind(id).run()

  await logActivity(env, user.sub, user.username, 'album.delete', `Deleted album ${id}`)
  return ok()
}

// ── GET /api/albums/:id/photos ────────────────────────────────
export async function listAlbumPhotos(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth

  const albumId = request.params?.id ?? ''
  const { results } = await env.DB.prepare(
    'SELECT * FROM album_photos WHERE album_id = ? ORDER BY sort_order ASC',
  ).bind(albumId).all<AlbumPhotoRow>()

  const baseUrl = env.FRONTEND_URL.replace(/\/$/, '')
  return ok({ photos: (results ?? []).map((r) => publicPhoto(r, baseUrl)) })
}

// ── POST /api/albums/:id/photos ───────────────────────────────
// Accepts multipart/form-data with fields: original, processed, thumb (Blobs),
// plus JSON fields: filename, width, height, order.
export async function addAlbumPhoto(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user } = auth
  if (user.role === 'viewer') return err('Insufficient permissions.', 403)

  const albumId = request.params?.id ?? ''
  const album = await env.DB.prepare('SELECT id FROM albums WHERE id = ?').bind(albumId).first()
  if (!album) return notFound('Album not found.')

  const form = await request.formData()
  const originalFile = form.get('original') as File | null
  const processedFile = form.get('processed') as File | null
  const thumbFile = form.get('thumb') as File | null

  if (!originalFile || !processedFile || !thumbFile) {
    return err('original, processed, and thumb files are required.')
  }

  const filename = (form.get('filename') as string) || originalFile.name
  const width = parseInt((form.get('width') as string) || '0', 10)
  const height = parseInt((form.get('height') as string) || '0', 10)
  const order = parseInt((form.get('order') as string) || '0', 10)

  const photoId = createId('ph')
  const r2Original = `albums/${albumId}/original/${photoId}`
  const r2Processed = `albums/${albumId}/processed/${photoId}`
  const r2Thumb = `albums/${albumId}/thumb/${photoId}`

  await Promise.all([
    putObject(env, r2Original, await originalFile.arrayBuffer(), originalFile.type || 'image/jpeg'),
    putObject(env, r2Processed, await processedFile.arrayBuffer(), processedFile.type || 'image/jpeg'),
    putObject(env, r2Thumb, await thumbFile.arrayBuffer(), thumbFile.type || 'image/jpeg'),
  ])

  const now = Date.now()
  await env.DB.prepare(
    `INSERT INTO album_photos (id, album_id, filename, sort_order, width, height,
       r2_original, r2_processed, r2_thumb, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(photoId, albumId, filename, order, width, height, r2Original, r2Processed, r2Thumb, now).run()

  // Update photo_count on album
  await env.DB.prepare(
    "UPDATE albums SET photo_count = (SELECT COUNT(*) FROM album_photos WHERE album_id = ?), status = 'completed', updated_at = ? WHERE id = ?",
  ).bind(albumId, now, albumId).run()

  const baseUrl = env.FRONTEND_URL.replace(/\/$/, '')
  const photoRow = await env.DB.prepare('SELECT * FROM album_photos WHERE id = ?').bind(photoId).first<AlbumPhotoRow>()
  return created({ photo: publicPhoto(photoRow!, baseUrl) })
}

// ── DELETE /api/albums/:albumId/photos/:photoId ───────────────
export async function deleteAlbumPhoto(request: IRequest, env: Env): Promise<Response> {
  const auth = await requireAuth(request as unknown as Request, env)
  if (auth instanceof Response) return auth
  const { user } = auth
  if (user.role === 'viewer') return err('Insufficient permissions.', 403)

  const albumId = request.params?.albumId ?? ''
  const photoId = request.params?.photoId ?? ''

  const row = await env.DB.prepare(
    'SELECT * FROM album_photos WHERE id = ? AND album_id = ?',
  ).bind(photoId, albumId).first<AlbumPhotoRow>()
  if (!row) return notFound()

  await Promise.all([
    env.BUCKET.delete(row.r2_original),
    env.BUCKET.delete(row.r2_processed),
    env.BUCKET.delete(row.r2_thumb),
  ])

  await env.DB.prepare('DELETE FROM album_photos WHERE id = ?').bind(photoId).run()
  await env.DB.prepare(
    'UPDATE albums SET photo_count = (SELECT COUNT(*) FROM album_photos WHERE album_id = ?), updated_at = ? WHERE id = ?',
  ).bind(albumId, Date.now(), albumId).run()

  return ok()
}
