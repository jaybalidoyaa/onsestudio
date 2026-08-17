import { AutoRouter } from 'itty-router'
import type { Env } from './types'

// Route handlers
import { setupAdmin, login, logout, me } from './routes/auth'
import { listUsers, createUser, updateUser, resetPassword, deleteUser } from './routes/users'
import { submitAccessRequest, listAccessRequests, approveAccessRequest, rejectAccessRequest } from './routes/access'
import { getSettings, saveEmailSettings, saveFacebookSettings, saveSettings } from './routes/settings'
import { listAlbums, createAlbum, updateAlbum, deleteAlbum, listAlbumPhotos, addAlbumPhoto, deleteAlbumPhoto, listPublicAlbums, listPublicAlbumPhotos } from './routes/albums'
import { listFrames, uploadFrame, renameFrame, deleteFrame, serveFile } from './routes/frames'
import { listActivity } from './routes/activity'

const router = AutoRouter<Request, [Env]>()

// ── Health ────────────────────────────────────────────────────
router.get('/api/health', () => new Response(JSON.stringify({ ok: true, service: 'onse-studio-api' }), {
  headers: { 'Content-Type': 'application/json' },
}))

// ── Auth ──────────────────────────────────────────────────────
router.post('/api/auth/setup', setupAdmin)
router.post('/api/auth/login', login)
router.post('/api/auth/logout', logout)
router.get('/api/auth/me', me)

// ── Users ─────────────────────────────────────────────────────
router.get('/api/users', listUsers)
router.post('/api/users', createUser)
router.patch('/api/users/:id', updateUser)
router.post('/api/users/:id/reset-password', resetPassword)
router.delete('/api/users/:id', deleteUser)

// ── Access requests ───────────────────────────────────────────
router.post('/api/access-requests', submitAccessRequest)
router.get('/api/access-requests', listAccessRequests)
router.post('/api/access-requests/:id/approve', approveAccessRequest)
router.post('/api/access-requests/:id/reject', rejectAccessRequest)

// ── Settings ──────────────────────────────────────────────────
router.get('/api/settings', getSettings)
router.patch('/api/settings', saveSettings)
router.patch('/api/settings/email', saveEmailSettings)
router.patch('/api/settings/facebook', saveFacebookSettings)

// ── Albums ────────────────────────────────────────────────────
router.get('/api/albums', listAlbums)
router.post('/api/albums', createAlbum)
router.patch('/api/albums/:id', updateAlbum)
router.delete('/api/albums/:id', deleteAlbum)
router.get('/api/albums/:id/photos', listAlbumPhotos)
router.post('/api/albums/:id/photos', addAlbumPhoto)
router.delete('/api/albums/:albumId/photos/:photoId', deleteAlbumPhoto)

// ── Frames ────────────────────────────────────────────────────
router.get('/api/frames', listFrames)
router.post('/api/frames', uploadFrame)
router.patch('/api/frames/:id', renameFrame)
router.delete('/api/frames/:id', deleteFrame)

// ── File serving (R2 proxy) ───────────────────────────────────
router.get('/api/files/:key+', serveFile)

// ── Activity log ──────────────────────────────────────────────
router.get('/api/activity', listActivity)

// ── Public endpoints (no auth) ────────────────────────────────
router.get('/api/public/albums', listPublicAlbums)
router.get('/api/public/albums/:id/photos', listPublicAlbumPhotos)

// ── CORS headers added to every response ─────────────────────
function addCors(response: Response, origin: string): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.CORS_ORIGIN || '*'

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    try {
      const response = await router.fetch(request, env)
      return addCors(response, origin)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      return addCors(
        new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
        origin,
      )
    }
  },
} satisfies ExportedHandler<Env>