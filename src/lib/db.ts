import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Album,
  AlbumPhoto,
  PersistedFrame,
  PersistedSessionMeta,
  PersistedStudioPhoto,
} from '../types'
import type { AccessRequest } from '../types/access'
import type { ActivityEntry, AppSettings, StudioUser } from '../types/auth'
import { DEFAULT_APP_SETTINGS } from '../types/auth'

interface StudioDB extends DBSchema {
  frames: {
    key: string
    value: PersistedFrame
    indexes: { 'by-created': number }
  }
  albums: {
    key: string
    value: Album
    indexes: { 'by-created': number; 'by-updated': number }
  }
  albumPhotos: {
    key: string
    value: AlbumPhoto
    indexes: { 'by-album': string }
  }
  sessionMeta: {
    key: string
    value: PersistedSessionMeta
  }
  sessionPhotos: {
    key: string
    value: PersistedStudioPhoto
    indexes: { 'by-session': string }
  }
  users: {
    key: string
    value: StudioUser
    indexes: { 'by-username': string }
  }
  settings: {
    key: string
    value: AppSettings
  }
  activity: {
    key: string
    value: ActivityEntry
    indexes: { 'by-created': number }
  }
  accessRequests: {
    key: string
    value: AccessRequest
    indexes: { 'by-created': number; 'by-status': string }
  }
}

const DB_NAME = 'onse-studio'
const DB_VERSION = 3

let dbPromise: Promise<IDBPDatabase<StudioDB>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<StudioDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const frames = db.createObjectStore('frames', { keyPath: 'id' })
          frames.createIndex('by-created', 'createdAt')

          const albums = db.createObjectStore('albums', { keyPath: 'id' })
          albums.createIndex('by-created', 'createdAt')
          albums.createIndex('by-updated', 'updatedAt')

          const albumPhotos = db.createObjectStore('albumPhotos', {
            keyPath: 'id',
          })
          albumPhotos.createIndex('by-album', 'albumId')

          db.createObjectStore('sessionMeta', { keyPath: 'id' })

          const sessionPhotos = db.createObjectStore('sessionPhotos', {
            keyPath: 'id',
          })
          sessionPhotos.createIndex('by-session', 'sessionId')
        }

        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('users')) {
            const users = db.createObjectStore('users', { keyPath: 'id' })
            users.createIndex('by-username', 'username', { unique: true })
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('activity')) {
            const activity = db.createObjectStore('activity', { keyPath: 'id' })
            activity.createIndex('by-created', 'createdAt')
          }
        }

        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('accessRequests')) {
            const accessRequests = db.createObjectStore('accessRequests', {
              keyPath: 'id',
            })
            accessRequests.createIndex('by-created', 'createdAt')
            accessRequests.createIndex('by-status', 'status')
          }
        }
      },
    })
  }
  return dbPromise
}

/* ---------- Frames ---------- */

export async function saveFrame(frame: PersistedFrame) {
  const db = await getDb()
  await db.put('frames', frame)
}

export async function listFrames(): Promise<PersistedFrame[]> {
  const db = await getDb()
  const frames = await db.getAllFromIndex('frames', 'by-created')
  return frames.reverse()
}

export async function getFrame(id: string) {
  const db = await getDb()
  return db.get('frames', id)
}

export async function deleteFrame(id: string) {
  const db = await getDb()
  await db.delete('frames', id)
}

/* ---------- Albums ---------- */

export async function saveAlbum(album: Album) {
  const db = await getDb()
  await db.put('albums', album)
}

export async function listAlbums(): Promise<Album[]> {
  const db = await getDb()
  const albums = await db.getAllFromIndex('albums', 'by-updated')
  return albums.reverse()
}

export async function getAlbum(id: string) {
  const db = await getDb()
  return db.get('albums', id)
}

export async function deleteAlbum(id: string) {
  const db = await getDb()
  const photos = await db.getAllFromIndex('albumPhotos', 'by-album', id)
  const tx = db.transaction(['albums', 'albumPhotos'], 'readwrite')
  await Promise.all([
    ...photos.map((p) => tx.objectStore('albumPhotos').delete(p.id)),
    tx.objectStore('albums').delete(id),
    tx.done,
  ])
}

export async function saveAlbumPhoto(photo: AlbumPhoto) {
  const db = await getDb()
  await db.put('albumPhotos', photo)
}

export async function listAlbumPhotos(albumId: string): Promise<AlbumPhoto[]> {
  const db = await getDb()
  const photos = await db.getAllFromIndex('albumPhotos', 'by-album', albumId)
  return photos.sort((a, b) => a.order - b.order)
}

export async function deleteAlbumPhoto(id: string) {
  const db = await getDb()
  await db.delete('albumPhotos', id)
}

/* ---------- Session ---------- */

export async function saveSessionMeta(meta: PersistedSessionMeta) {
  const db = await getDb()
  await db.put('sessionMeta', meta)
}

export async function getSessionMeta(id: string) {
  const db = await getDb()
  return db.get('sessionMeta', id)
}

export async function getLatestSessionMeta() {
  const db = await getDb()
  const all = await db.getAll('sessionMeta')
  if (!all.length) return null
  return all.sort((a, b) => b.updatedAt - a.updatedAt)[0]
}

export async function saveSessionPhoto(photo: PersistedStudioPhoto) {
  const db = await getDb()
  await db.put('sessionPhotos', photo)
}

export async function listSessionPhotos(
  sessionId: string,
): Promise<PersistedStudioPhoto[]> {
  const db = await getDb()
  const photos = await db.getAllFromIndex(
    'sessionPhotos',
    'by-session',
    sessionId,
  )
  return photos.sort((a, b) => a.createdAt - b.createdAt)
}

export async function deleteSessionPhoto(id: string) {
  const db = await getDb()
  await db.delete('sessionPhotos', id)
}

export async function clearSession(sessionId: string) {
  const db = await getDb()
  const photos = await listSessionPhotos(sessionId)
  const tx = db.transaction(['sessionMeta', 'sessionPhotos'], 'readwrite')
  await Promise.all([
    ...photos.map((p) => tx.objectStore('sessionPhotos').delete(p.id)),
    tx.objectStore('sessionMeta').delete(sessionId),
    tx.done,
  ])
}

/* ---------- Users ---------- */

export async function saveUser(user: StudioUser) {
  const db = await getDb()
  await db.put('users', user)
}

export async function listUsers(): Promise<StudioUser[]> {
  const db = await getDb()
  const users = await db.getAll('users')
  return users.sort((a, b) => a.username.localeCompare(b.username))
}

export async function getUser(id: string) {
  const db = await getDb()
  return db.get('users', id)
}

export async function getUserByUsername(username: string) {
  const db = await getDb()
  return db.getFromIndex('users', 'by-username', username.toLowerCase())
}

export async function deleteUser(id: string) {
  const db = await getDb()
  await db.delete('users', id)
}

export async function countUsers() {
  const db = await getDb()
  return db.count('users')
}

/* ---------- Settings ---------- */

// Local IndexedDB persisted shape — has an 'id' key required by the store
type PersistedSettings = AppSettings & { id: string }

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDb()
  const existing = await db.get('settings', 'app') as PersistedSettings | undefined
  if (existing) {
    return {
      ...DEFAULT_APP_SETTINGS,
      ...existing,
      facebook: {
        ...DEFAULT_APP_SETTINGS.facebook,
        ...(existing.facebook ?? {}),
      },
      email: {
        ...DEFAULT_APP_SETTINGS.email,
        ...(existing.email ?? {}),
      },
    }
  }
  const initial: PersistedSettings = { ...DEFAULT_APP_SETTINGS, id: 'app' }
  await db.put('settings', initial)
  return { ...DEFAULT_APP_SETTINGS }
}

export async function saveAppSettings(settings: AppSettings) {
  const db = await getDb()
  const persisted: PersistedSettings = { ...settings, id: 'app', updatedAt: Date.now() }
  await db.put('settings', persisted)
}

/* ---------- Activity ---------- */

export async function addActivity(entry: ActivityEntry) {
  const db = await getDb()
  await db.put('activity', entry)
  const all = await db.getAllFromIndex('activity', 'by-created')
  if (all.length > 200) {
    const oldest = all.slice(0, all.length - 200)
    await Promise.all(oldest.map((e) => db.delete('activity', e.id)))
  }
}

export async function listActivity(limit = 40): Promise<ActivityEntry[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('activity', 'by-created')
  return all.reverse().slice(0, limit)
}

/* ---------- Access requests ---------- */

export async function saveAccessRequest(request: AccessRequest) {
  const db = await getDb()
  await db.put('accessRequests', request)
}

export async function listAccessRequests(): Promise<AccessRequest[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('accessRequests', 'by-created')
  return all.reverse()
}

export async function getAccessRequest(id: string) {
  const db = await getDb()
  return db.get('accessRequests', id)
}

export async function deleteAccessRequest(id: string) {
  const db = await getDb()
  await db.delete('accessRequests', id)
}
