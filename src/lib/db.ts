import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Album,
  AlbumPhoto,
  PersistedFrame,
  PersistedSessionMeta,
  PersistedStudioPhoto,
} from '../types'

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
}

const DB_NAME = 'onse-studio'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<StudioDB>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<StudioDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
