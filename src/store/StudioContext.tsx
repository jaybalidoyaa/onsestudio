import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { compositePhoto } from '../lib/compositor'
import * as db from '../lib/db'
import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '../lib/output'
import {
  createObjectUrl,
  createThumbnailBlob,
  detectTransparency,
  ImageLoadError,
  readImageDimensions,
  revokeUrl,
} from '../lib/image'
import { exportPhotosAsZip, exportSinglePhoto } from '../lib/export'
import { createId, isSupportedFrameType, isSupportedPhotoType } from '../lib/utils'
import {
  createDefaultMetadata,
  normalizeMetadata,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_FRAME_CONFIG,
  type Album,
  type AlbumPhoto,
  type AlbumSort,
  type AppView,
  type DateFilter,
  type ExportSettings,
  type FrameAsset,
  type FrameConfig,
  type IncidentMetadata,
  type IncidentType,
  type PersistedFrame,
  type PreviewMode,
  type StudioPhoto,
  type StudioSession,
} from '../types'

interface ProcessingProgress {
  current: number
  total: number
  message: string
}

interface Toast {
  id: string
  type: 'info' | 'success' | 'error'
  message: string
}

interface StudioContextValue {
  view: AppView
  setView: (view: AppView) => void
  session: StudioSession
  frames: FrameAsset[]
  activeFrame: FrameAsset | null
  albums: Album[]
  albumPhotos: Record<string, AlbumPhoto[]>
  selectedAlbumId: string | null
  setSelectedAlbumId: (id: string | null) => void
  processing: ProcessingProgress | null
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  toast: Toast | null
  dismissToast: () => void
  ready: boolean

  // Session
  newSession: () => Promise<void>
  saveSession: () => Promise<void>
  resetSession: () => Promise<void>

  // Photos
  addPhotos: (files: FileList | File[]) => Promise<void>
  removePhotos: (ids: string[]) => void
  selectPhoto: (id: string) => void
  togglePhotoSelected: (id: string) => void
  selectAll: () => void
  selectNone: () => void
  invertSelection: () => void
  selectByStatus: (status: 'processed' | 'unprocessed') => void
  updateAdjustments: (id: string, patch: Partial<StudioPhoto['adjustments']>) => void
  rotateActive: (dir: 1 | -1) => void

  // Metadata / frame config
  updateMetadata: (patch: Partial<IncidentMetadata>) => void
  updateFrameConfig: (patch: Partial<FrameConfig>) => void
  updateExportSettings: (patch: Partial<ExportSettings>) => void
  setPreviewMode: (mode: PreviewMode) => void

  // Frames
  uploadFrame: (file: File) => Promise<void>
  useFrame: (id: string) => void
  removeActiveFrame: () => void
  deleteLibraryFrame: (id: string) => Promise<void>
  renameFrame: (id: string, name: string) => Promise<void>

  // Processing
  applyFrame: (scope: 'current' | 'selected' | 'all') => Promise<void>
  createAlbumFromSession: () => Promise<string | null>

  // Export
  exportCurrent: () => Promise<void>
  exportSelected: () => Promise<void>
  exportAll: () => Promise<void>

  // Gallery
  refreshAlbums: () => Promise<void>
  loadAlbumPhotos: (albumId: string) => Promise<AlbumPhoto[]>
  updateAlbum: (id: string, patch: Partial<Album>) => Promise<void>
  deleteAlbum: (id: string) => Promise<void>
  setAlbumCover: (albumId: string, photoId: string) => Promise<void>
  addPhotosToAlbum: (albumId: string, files: FileList | File[]) => Promise<void>
  downloadAlbum: (albumId: string) => Promise<void>
  downloadAlbumPhoto: (albumId: string, photoId: string) => Promise<void>
  deleteAlbumPhoto: (albumId: string, photoId: string) => Promise<void>

  // Gallery filters (UI state)
  galleryQuery: string
  setGalleryQuery: (q: string) => void
  galleryTypeFilter: IncidentType | 'ALL'
  setGalleryTypeFilter: (t: IncidentType | 'ALL') => void
  galleryDateFilter: DateFilter
  setGalleryDateFilter: (d: DateFilter) => void
  gallerySort: AlbumSort
  setGallerySort: (s: AlbumSort) => void
  filteredAlbums: Album[]
}

const StudioContext = createContext<StudioContextValue | null>(null)

function createEmptySession(): StudioSession {
  return {
    id: createId('session'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: createDefaultMetadata(),
    photos: [],
    activePhotoId: null,
    activeFrameId: null,
    frameConfig: { ...DEFAULT_FRAME_CONFIG },
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
    previewMode: 'framed',
  }
}

function hydrateFrame(persisted: PersistedFrame): FrameAsset {
  return {
    id: persisted.id,
    name: persisted.name,
    filename: persisted.filename,
    mimeType: persisted.mimeType,
    width: persisted.width,
    height: persisted.height,
    hasTransparency: persisted.hasTransparency,
    blob: persisted.blob,
    thumbnailUrl: createObjectUrl(persisted.thumbnailBlob),
    objectUrl: createObjectUrl(persisted.blob),
    createdAt: persisted.createdAt,
  }
}

function hydrateAlbumPhoto(photo: AlbumPhoto): AlbumPhoto {
  return {
    ...photo,
    originalUrl: createObjectUrl(photo.originalBlob),
    processedUrl: createObjectUrl(photo.processedBlob),
    thumbnailUrl: createObjectUrl(photo.thumbnailBlob),
  }
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>('studio')
  const [session, setSession] = useState<StudioSession>(createEmptySession)
  const [frames, setFrames] = useState<FrameAsset[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [albumPhotos, setAlbumPhotos] = useState<Record<string, AlbumPhoto[]>>({})
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [processing, setProcessing] = useState<ProcessingProgress | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [ready, setReady] = useState(false)
  const [galleryQuery, setGalleryQuery] = useState('')
  const [galleryTypeFilter, setGalleryTypeFilter] = useState<IncidentType | 'ALL'>('ALL')
  const [galleryDateFilter, setGalleryDateFilter] = useState<DateFilter>('all')
  const [gallerySort, setGallerySort] = useState<AlbumSort>('newest')
  const saveTimer = useRef<number | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = createId('toast')
    setToast({ id, type, message })
    window.setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t))
    }, 4200)
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const activeFrame = useMemo(
    () => frames.find((f) => f.id === session.activeFrameId) ?? null,
    [frames, session.activeFrameId],
  )

  /* ---------- Bootstrap ---------- */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [persistedFrames, persistedAlbums, latest] = await Promise.all([
          db.listFrames(),
          db.listAlbums(),
          db.getLatestSessionMeta(),
        ])
        if (cancelled) return

        setFrames(persistedFrames.map(hydrateFrame))
        setAlbums(persistedAlbums)

        if (latest) {
          const photosRaw = await db.listSessionPhotos(latest.id)
          const photos: StudioPhoto[] = await Promise.all(
            photosRaw.map(async (p) => {
              const objectUrl = createObjectUrl(p.originalBlob)
              const thumbnailUrl = createObjectUrl(p.thumbnailBlob)
              const processedUrl = p.processedBlob
                ? createObjectUrl(p.processedBlob)
                : undefined
              return {
                id: p.id,
                filename: p.filename,
                mimeType: p.mimeType,
                width: p.width,
                height: p.height,
                status: p.status,
                selected: p.selected,
                errorMessage: p.errorMessage,
                adjustments: p.adjustments,
                originalBlob: p.originalBlob,
                thumbnailUrl,
                objectUrl,
                processedBlob: p.processedBlob,
                processedUrl,
                createdAt: p.createdAt,
              }
            }),
          )
          setSession({
            id: latest.id,
            createdAt: latest.createdAt,
            updatedAt: latest.updatedAt,
            metadata: normalizeMetadata(
              latest.metadata as Partial<IncidentMetadata>,
            ),
            photos,
            activePhotoId: latest.activePhotoId ?? photos[0]?.id ?? null,
            activeFrameId: latest.activeFrameId,
            frameConfig: latest.frameConfig,
            exportSettings: latest.exportSettings,
            previewMode: latest.previewMode,
          })
        }
      } catch (err) {
        console.error(err)
        showToast('Could not restore previous session.', 'error')
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showToast])

  /* ---------- Persist session (debounced) ---------- */
  const persistSession = useCallback(async (s: StudioSession) => {
    const meta = {
      id: s.id,
      createdAt: s.createdAt,
      updatedAt: Date.now(),
      metadata: s.metadata,
      activePhotoId: s.activePhotoId,
      activeFrameId: s.activeFrameId,
      frameConfig: s.frameConfig,
      exportSettings: s.exportSettings,
      previewMode: s.previewMode,
      photoIds: s.photos.map((p) => p.id),
    }
    await db.saveSessionMeta(meta)
    await Promise.all(
      s.photos.map((p) =>
        db.saveSessionPhoto({
          id: p.id,
          sessionId: s.id,
          filename: p.filename,
          mimeType: p.mimeType,
          width: p.width,
          height: p.height,
          status: p.status,
          selected: p.selected,
          errorMessage: p.errorMessage,
          adjustments: p.adjustments,
          originalBlob: p.originalBlob,
          thumbnailBlob: p.originalBlob, // overwritten below if we have thumb
          processedBlob: p.processedBlob,
          createdAt: p.createdAt,
        }),
      ),
    )
    // Store proper thumbnails
    for (const p of s.photos) {
      try {
        const res = await fetch(p.thumbnailUrl)
        const thumb = await res.blob()
        await db.saveSessionPhoto({
          id: p.id,
          sessionId: s.id,
          filename: p.filename,
          mimeType: p.mimeType,
          width: p.width,
          height: p.height,
          status: p.status,
          selected: p.selected,
          errorMessage: p.errorMessage,
          adjustments: p.adjustments,
          originalBlob: p.originalBlob,
          thumbnailBlob: thumb,
          processedBlob: p.processedBlob,
          createdAt: p.createdAt,
        })
      } catch {
        /* keep fallback */
      }
    }
  }, [])

  const scheduleSave = useCallback(
    (s: StudioSession) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        void persistSession(s)
      }, 800)
    },
    [persistSession],
  )

  const updateSession = useCallback(
    (updater: (prev: StudioSession) => StudioSession) => {
      setSession((prev) => {
        const next = updater(prev)
        const stamped = { ...next, updatedAt: Date.now() }
        scheduleSave(stamped)
        return stamped
      })
    },
    [scheduleSave],
  )

  /* ---------- Session actions ---------- */
  const newSession = useCallback(async () => {
    const prev = sessionRef.current
    for (const p of prev.photos) {
      revokeUrl(p.objectUrl)
      revokeUrl(p.thumbnailUrl)
      revokeUrl(p.processedUrl)
    }
    await db.clearSession(prev.id)
    const next = createEmptySession()
    setSession(next)
    scheduleSave(next)
    setView('studio')
    showToast('New studio session started.', 'success')
  }, [scheduleSave, showToast])

  const saveSession = useCallback(async () => {
    await persistSession(sessionRef.current)
    showToast('Session saved.', 'success')
  }, [persistSession, showToast])

  const resetSession = useCallback(async () => {
    await newSession()
  }, [newSession])

  /* ---------- Photos ---------- */
  const addPhotos = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)
      const accepted: StudioPhoto[] = []
      let rejected = 0

      for (const file of list) {
        if (!isSupportedPhotoType(file)) {
          rejected++
          continue
        }
        try {
          const { width, height, url } = await readImageDimensions(file)
          const thumbBlob = await createThumbnailBlob(file)
          const thumbUrl = createObjectUrl(thumbBlob)
          accepted.push({
            id: createId('photo'),
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
            width,
            height,
            status: 'ready',
            selected: true,
            adjustments: { ...DEFAULT_ADJUSTMENTS },
            originalBlob: file,
            thumbnailUrl: thumbUrl,
            objectUrl: url,
            createdAt: Date.now(),
          })
        } catch (err) {
          rejected++
          console.error(err)
        }
      }

      if (accepted.length) {
        updateSession((prev) => ({
          ...prev,
          photos: [...prev.photos, ...accepted],
          activePhotoId: prev.activePhotoId ?? accepted[0].id,
        }))
        showToast(
          `${accepted.length} photograph${accepted.length === 1 ? '' : 's'} uploaded.`,
          'success',
        )
      }
      if (rejected) {
        showToast(
          `${rejected} file${rejected === 1 ? '' : 's'} could not be imported.`,
          'error',
        )
      }
    },
    [showToast, updateSession],
  )

  const removePhotos = useCallback(
    (ids: string[]) => {
      updateSession((prev) => {
        const idSet = new Set(ids)
        const remaining = prev.photos.filter((p) => {
          if (!idSet.has(p.id)) return true
          revokeUrl(p.objectUrl)
          revokeUrl(p.thumbnailUrl)
          revokeUrl(p.processedUrl)
          void db.deleteSessionPhoto(p.id)
          return false
        })
        return {
          ...prev,
          photos: remaining,
          activePhotoId:
            prev.activePhotoId && idSet.has(prev.activePhotoId)
              ? remaining[0]?.id ?? null
              : prev.activePhotoId,
        }
      })
    },
    [updateSession],
  )

  const selectPhoto = useCallback(
    (id: string) => {
      updateSession((prev) => ({ ...prev, activePhotoId: id }))
    },
    [updateSession],
  )

  const togglePhotoSelected = useCallback(
    (id: string) => {
      updateSession((prev) => ({
        ...prev,
        photos: prev.photos.map((p) =>
          p.id === id ? { ...p, selected: !p.selected } : p,
        ),
      }))
    },
    [updateSession],
  )

  const selectAll = useCallback(() => {
    updateSession((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => ({ ...p, selected: true })),
    }))
  }, [updateSession])

  const selectNone = useCallback(() => {
    updateSession((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => ({ ...p, selected: false })),
    }))
  }, [updateSession])

  const invertSelection = useCallback(() => {
    updateSession((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => ({ ...p, selected: !p.selected })),
    }))
  }, [updateSession])

  const selectByStatus = useCallback(
    (status: 'processed' | 'unprocessed') => {
      updateSession((prev) => ({
        ...prev,
        photos: prev.photos.map((p) => ({
          ...p,
          selected:
            status === 'processed'
              ? p.status === 'processed'
              : p.status !== 'processed',
        })),
      }))
    },
    [updateSession],
  )

  const updateAdjustments = useCallback(
    (id: string, patch: Partial<StudioPhoto['adjustments']>) => {
      updateSession((prev) => ({
        ...prev,
        photos: prev.photos.map((p) =>
          p.id === id
            ? {
                ...p,
                adjustments: { ...p.adjustments, ...patch },
                status: p.status === 'processed' ? 'ready' : p.status,
              }
            : p,
        ),
      }))
    },
    [updateSession],
  )

  const rotateActive = useCallback(
    (dir: 1 | -1) => {
      const id = sessionRef.current.activePhotoId
      if (!id) return
      const photo = sessionRef.current.photos.find((p) => p.id === id)
      if (!photo) return
      const rotation = (((photo.adjustments.rotation + dir * 90) % 360) + 360) % 360
      updateAdjustments(id, { rotation })
    },
    [updateAdjustments],
  )

  const updateMetadata = useCallback(
    (patch: Partial<IncidentMetadata>) => {
      updateSession((prev) => ({
        ...prev,
        metadata: { ...prev.metadata, ...patch },
      }))
    },
    [updateSession],
  )

  const updateFrameConfig = useCallback(
    (patch: Partial<FrameConfig>) => {
      updateSession((prev) => ({
        ...prev,
        frameConfig: { ...prev.frameConfig, ...patch },
      }))
    },
    [updateSession],
  )

  const updateExportSettings = useCallback(
    (patch: Partial<ExportSettings>) => {
      updateSession((prev) => ({
        ...prev,
        exportSettings: { ...prev.exportSettings, ...patch },
      }))
    },
    [updateSession],
  )

  const setPreviewMode = useCallback(
    (mode: PreviewMode) => {
      updateSession((prev) => ({ ...prev, previewMode: mode }))
    },
    [updateSession],
  )

  /* ---------- Frames ---------- */
  const uploadFrame = useCallback(
    async (file: File) => {
      if (!isSupportedFrameType(file)) {
        showToast('Unsupported frame format. Use PNG, JPG, WEBP, or SVG.', 'error')
        return
      }
      try {
        const { width, height, url } = await readImageDimensions(file)
        const hasTransparency = await detectTransparency(file)
        const thumbBlob = await createThumbnailBlob(file)
        const id = createId('frame')
        const persisted: PersistedFrame = {
          id,
          name: file.name.replace(/\.[^.]+$/, ''),
          filename: file.name,
          mimeType: file.type || 'image/png',
          width,
          height,
          hasTransparency,
          blob: file,
          thumbnailBlob: thumbBlob,
          createdAt: Date.now(),
        }
        await db.saveFrame(persisted)
        const asset = hydrateFrame(persisted)
        // revoke temporary url from readImageDimensions — hydrate creates its own
        revokeUrl(url)
        setFrames((prev) => [asset, ...prev])
        updateSession((prev) => ({ ...prev, activeFrameId: id }))
        showToast('Frame uploaded and ready to use.', 'success')
      } catch (err) {
        console.error(err)
        showToast(
          err instanceof ImageLoadError
            ? err.message
            : 'Unable to load this frame. Please try another file.',
          'error',
        )
      }
    },
    [showToast, updateSession],
  )

  const useFrame = useCallback(
    (id: string) => {
      updateSession((prev) => ({ ...prev, activeFrameId: id }))
      showToast('Frame selected.', 'success')
    },
    [showToast, updateSession],
  )

  const removeActiveFrame = useCallback(() => {
    updateSession((prev) => ({ ...prev, activeFrameId: null }))
  }, [updateSession])

  const deleteLibraryFrame = useCallback(
    async (id: string) => {
      await db.deleteFrame(id)
      setFrames((prev) => {
        const target = prev.find((f) => f.id === id)
        if (target) {
          revokeUrl(target.objectUrl)
          revokeUrl(target.thumbnailUrl)
        }
        return prev.filter((f) => f.id !== id)
      })
      updateSession((prev) =>
        prev.activeFrameId === id ? { ...prev, activeFrameId: null } : prev,
      )
      showToast('Frame removed from library.', 'info')
    },
    [showToast, updateSession],
  )

  const renameFrame = useCallback(
    async (id: string, name: string) => {
      const existing = await db.getFrame(id)
      if (!existing) return
      const updated = { ...existing, name }
      await db.saveFrame(updated)
      setFrames((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name } : f)),
      )
    },
    [],
  )

  /* ---------- Processing ---------- */
  const processOne = useCallback(
    async (
      photo: StudioPhoto,
      frame: FrameAsset | null,
      frameConfig: FrameConfig,
      exportSettings: ExportSettings,
    ): Promise<StudioPhoto> => {
      try {
        const blob = await compositePhoto({
          photoUrl: photo.objectUrl,
          frameUrl: frame?.objectUrl ?? null,
          width: OUTPUT_WIDTH,
          height: OUTPUT_HEIGHT,
          adjustments: photo.adjustments,
          frameConfig,
          outputType:
            exportSettings.format === 'png' ? 'image/png' : 'image/jpeg',
          quality: exportSettings.quality,
          includeSafeArea: false,
        })
        revokeUrl(photo.processedUrl)
        return {
          ...photo,
          status: 'processed',
          // Output is always the fixed documentation size
          width: OUTPUT_WIDTH,
          height: OUTPUT_HEIGHT,
          processedBlob: blob,
          processedUrl: createObjectUrl(blob),
          errorMessage: undefined,
        }
      } catch (err) {
        console.error(err)
        return {
          ...photo,
          status: 'error',
          errorMessage:
            'Unable to process this photograph. Please try another image.',
        }
      }
    },
    [],
  )

  const applyFrame = useCallback(
    async (scope: 'current' | 'selected' | 'all') => {
      const s = sessionRef.current
      const frame = frames.find((f) => f.id === s.activeFrameId) ?? null
      if (!frame && scope !== 'current') {
        // Allow processing without frame (adjustments only), but warn
        showToast('No frame selected — applying adjustments only.', 'info')
      }

      let targets: StudioPhoto[] = []
      if (scope === 'current') {
        const active = s.photos.find((p) => p.id === s.activePhotoId)
        if (active) targets = [active]
      } else if (scope === 'selected') {
        targets = s.photos.filter((p) => p.selected)
      } else {
        targets = [...s.photos]
      }

      if (!targets.length) {
        showToast('No photographs selected.', 'error')
        return
      }

      setProcessing({
        current: 0,
        total: targets.length,
        message: 'Applying frame...',
      })

      // Mark processing
      updateSession((prev) => ({
        ...prev,
        photos: prev.photos.map((p) =>
          targets.some((t) => t.id === p.id)
            ? { ...p, status: 'processing' as const }
            : p,
        ),
      }))

      const results = new Map<string, StudioPhoto>()
      for (let i = 0; i < targets.length; i++) {
        setProcessing({
          current: i + 1,
          total: targets.length,
          message: `Applying frame... ${i + 1} / ${targets.length}`,
        })
        const processed = await processOne(
          targets[i],
          frame,
          s.frameConfig,
          s.exportSettings,
        )
        results.set(processed.id, processed)
        // Yield to UI
        await new Promise((r) => setTimeout(r, 0))
      }

      updateSession((prev) => ({
        ...prev,
        photos: prev.photos.map((p) => results.get(p.id) ?? p),
      }))

      setProcessing(null)
      const ok = [...results.values()].filter((p) => p.status === 'processed').length
      showToast(
        `✓ ${ok} photo${ok === 1 ? '' : 's'} processed`,
        ok ? 'success' : 'error',
      )
    },
    [frames, processOne, showToast, updateSession],
  )

  /* ---------- Album creation ---------- */
  const refreshAlbums = useCallback(async () => {
    const list = await db.listAlbums()
    setAlbums(list)
  }, [])

  const createAlbumFromSession = useCallback(async () => {
    const s = sessionRef.current
    const processed = s.photos.filter(
      (p) => p.status === 'processed' && p.processedBlob,
    )
    if (!processed.length) {
      showToast('Process at least one photograph before creating an album.', 'error')
      return null
    }

    const albumId = createId('album')
    const frame = frames.find((f) => f.id === s.activeFrameId)
    const now = Date.now()
    const album: Album = {
      id: albumId,
      title: s.metadata.title || 'FIRE RESPONSE OPERATION',
      incidentType: s.metadata.incidentType,
      date: s.metadata.date,
      time: s.metadata.time,
      location: s.metadata.address,
      address: s.metadata.address,
      alarm: s.metadata.alarm,
      unit: s.metadata.unit,
      callsign: s.metadata.callsign,
      barangay: '',
      city: '',
      respondingUnits: s.metadata.unit,
      documentationOfficer: s.metadata.callsign,
      notes: '',
      frameId: frame?.id ?? null,
      frameName: frame?.name ?? 'None',
      coverPhotoId: null,
      photoCount: processed.length,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    }

    const albumPhotoRecords: AlbumPhoto[] = []
    for (let i = 0; i < processed.length; i++) {
      const p = processed[i]
      const thumb = await createThumbnailBlob(p.processedBlob!)
      const record: AlbumPhoto = {
        id: createId('aphoto'),
        albumId,
        filename: p.filename,
        order: i,
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
        originalBlob: p.originalBlob,
        processedBlob: p.processedBlob!,
        thumbnailBlob: thumb,
        createdAt: now,
      }
      await db.saveAlbumPhoto(record)
      albumPhotoRecords.push(record)
    }

    album.coverPhotoId = albumPhotoRecords[0]?.id ?? null
    await db.saveAlbum(album)
    await refreshAlbums()

    const hydrated = albumPhotoRecords.map(hydrateAlbumPhoto)
    setAlbumPhotos((prev) => ({ ...prev, [albumId]: hydrated }))
    setSelectedAlbumId(albumId)
    setView('gallery')
    showToast('Album created and added to Gallery.', 'success')
    return albumId
  }, [frames, refreshAlbums, showToast])

  /* ---------- Export ---------- */
  const getExportables = useCallback(
    (photos: StudioPhoto[]) =>
      photos
        .map((p, index) => ({
          photo: p,
          index,
          blob: p.processedBlob ?? p.originalBlob,
        }))
        .filter((x) => x.blob),
    [],
  )

  const exportCurrent = useCallback(async () => {
    const s = sessionRef.current
    const photo = s.photos.find((p) => p.id === s.activePhotoId)
    if (!photo) return
    const blob = photo.processedBlob ?? photo.originalBlob
    const index = s.photos.findIndex((p) => p.id === photo.id)
    await exportSinglePhoto(blob, index, s.metadata)
    showToast('Photograph downloaded.', 'success')
  }, [showToast])

  const exportSelected = useCallback(async () => {
    const s = sessionRef.current
    const selected = s.photos.filter((p) => p.selected)
    if (!selected.length) {
      showToast('No photographs selected.', 'error')
      return
    }
    if (selected.length === 1) {
      const index = s.photos.findIndex((p) => p.id === selected[0].id)
      await exportSinglePhoto(
        selected[0].processedBlob ?? selected[0].originalBlob,
        index,
        s.metadata,
      )
    } else {
      const items = getExportables(selected).map((x, i) => ({
        blob: x.blob,
        index: i,
      }))
      await exportPhotosAsZip(items, s.metadata)
    }
    showToast('Export complete.', 'success')
  }, [getExportables, showToast])

  const exportAll = useCallback(async () => {
    const s = sessionRef.current
    if (!s.photos.length) {
      showToast('No photographs to export.', 'error')
      return
    }
    const items = getExportables(s.photos).map((x) => ({
      blob: x.blob,
      index: x.index,
    }))
    await exportPhotosAsZip(items, s.metadata)
    showToast('All photographs exported.', 'success')
  }, [getExportables, showToast])

  /* ---------- Gallery ---------- */
  const albumPhotosRef = useRef(albumPhotos)
  albumPhotosRef.current = albumPhotos
  const loadingAlbumsRef = useRef(new Set<string>())

  const loadAlbumPhotos = useCallback(async (albumId: string) => {
    const cached = albumPhotosRef.current[albumId]
    if (cached) return cached
    if (loadingAlbumsRef.current.has(albumId)) {
      return albumPhotosRef.current[albumId] ?? []
    }
    loadingAlbumsRef.current.add(albumId)
    try {
      const photos = (await db.listAlbumPhotos(albumId)).map(hydrateAlbumPhoto)
      setAlbumPhotos((prev) => ({ ...prev, [albumId]: photos }))
      return photos
    } finally {
      loadingAlbumsRef.current.delete(albumId)
    }
  }, [])

  const updateAlbum = useCallback(
    async (id: string, patch: Partial<Album>) => {
      const existing = albums.find((a) => a.id === id)
      if (!existing) return
      const updated = { ...existing, ...patch, updatedAt: Date.now() }
      await db.saveAlbum(updated)
      setAlbums((prev) => prev.map((a) => (a.id === id ? updated : a)))
      showToast('Album details updated.', 'success')
    },
    [albums, showToast],
  )

  const deleteAlbum = useCallback(
    async (id: string) => {
      const photos = albumPhotos[id] ?? (await db.listAlbumPhotos(id))
      for (const p of photos) {
        revokeUrl(p.originalUrl)
        revokeUrl(p.processedUrl)
        revokeUrl(p.thumbnailUrl)
      }
      await db.deleteAlbum(id)
      setAlbums((prev) => prev.filter((a) => a.id !== id))
      setAlbumPhotos((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (selectedAlbumId === id) setSelectedAlbumId(null)
      showToast('Album deleted.', 'info')
    },
    [albumPhotos, selectedAlbumId, showToast],
  )

  const setAlbumCover = useCallback(
    async (albumId: string, photoId: string) => {
      await updateAlbum(albumId, { coverPhotoId: photoId })
    },
    [updateAlbum],
  )

  const addPhotosToAlbum = useCallback(
    async (albumId: string, files: FileList | File[]) => {
      const album = albums.find((a) => a.id === albumId)
      if (!album) return
      const frame = album.frameId
        ? frames.find((f) => f.id === album.frameId) ??
          (await db.getFrame(album.frameId).then((f) => (f ? hydrateFrame(f) : null)))
        : null

      const list = Array.from(files).filter(isSupportedPhotoType)
      if (!list.length) {
        showToast('No supported photographs found.', 'error')
        return
      }

      setProcessing({
        current: 0,
        total: list.length,
        message: 'Adding photographs...',
      })
      await updateAlbum(albumId, { status: 'processing' })

      const existing = await loadAlbumPhotos(albumId)
      const startOrder = existing.length
      const added: AlbumPhoto[] = []

      for (let i = 0; i < list.length; i++) {
        setProcessing({
          current: i + 1,
          total: list.length,
          message: `Processing ${i + 1} / ${list.length}`,
        })
        const file = list[i]
        try {
          const { url } = await readImageDimensions(file)
          const blob = await compositePhoto({
            photoUrl: url,
            frameUrl: frame?.objectUrl ?? null,
            width: OUTPUT_WIDTH,
            height: OUTPUT_HEIGHT,
            adjustments: { ...DEFAULT_ADJUSTMENTS },
            frameConfig: { ...DEFAULT_FRAME_CONFIG },
            outputType: 'image/jpeg',
            quality: 95,
          })
          const thumb = await createThumbnailBlob(blob)
          const record: AlbumPhoto = {
            id: createId('aphoto'),
            albumId,
            filename: file.name,
            order: startOrder + i,
            width: OUTPUT_WIDTH,
            height: OUTPUT_HEIGHT,
            originalBlob: file,
            processedBlob: blob,
            thumbnailBlob: thumb,
            createdAt: Date.now(),
          }
          await db.saveAlbumPhoto(record)
          added.push(hydrateAlbumPhoto(record))
          revokeUrl(url)
        } catch (err) {
          console.error(err)
        }
      }

      setAlbumPhotos((prev) => ({
        ...prev,
        [albumId]: [...(prev[albumId] ?? existing), ...added],
      }))
      await updateAlbum(albumId, {
        photoCount: startOrder + added.length,
        status: 'completed',
        coverPhotoId: album.coverPhotoId ?? added[0]?.id ?? null,
      })
      setProcessing(null)
      showToast(`${added.length} photograph${added.length === 1 ? '' : 's'} added.`, 'success')
    },
    [albums, frames, loadAlbumPhotos, showToast, updateAlbum],
  )

  const downloadAlbum = useCallback(
    async (albumId: string) => {
      const album = albums.find((a) => a.id === albumId)
      if (!album) return
      const photos = await loadAlbumPhotos(albumId)
      await exportPhotosAsZip(
        photos.map((p, index) => ({ blob: p.processedBlob, index })),
        {
          title: album.title,
          location: album.location || album.address,
          address: album.address || album.location,
          date: album.date,
        },
      )
      showToast('Album downloaded.', 'success')
    },
    [albums, loadAlbumPhotos, showToast],
  )

  const downloadAlbumPhoto = useCallback(
    async (albumId: string, photoId: string) => {
      const photos = await loadAlbumPhotos(albumId)
      const photo = photos.find((p) => p.id === photoId)
      const album = albums.find((a) => a.id === albumId)
      if (!photo || !album) return
      await exportSinglePhoto(photo.processedBlob, photo.order, {
        title: album.title,
        location: album.location || album.address,
        address: album.address || album.location,
        date: album.date,
      })
    },
    [albums, loadAlbumPhotos],
  )

  const deleteAlbumPhotoFn = useCallback(
    async (albumId: string, photoId: string) => {
      const photos = await loadAlbumPhotos(albumId)
      const target = photos.find((p) => p.id === photoId)
      if (target) {
        revokeUrl(target.originalUrl)
        revokeUrl(target.processedUrl)
        revokeUrl(target.thumbnailUrl)
      }
      await db.deleteAlbumPhoto(photoId)
      const remaining = photos.filter((p) => p.id !== photoId)
      setAlbumPhotos((prev) => ({ ...prev, [albumId]: remaining }))
      const album = albums.find((a) => a.id === albumId)
      await updateAlbum(albumId, {
        photoCount: remaining.length,
        coverPhotoId:
          album?.coverPhotoId === photoId
            ? remaining[0]?.id ?? null
            : album?.coverPhotoId ?? null,
      })
    },
    [albums, loadAlbumPhotos, updateAlbum],
  )

  /* ---------- Gallery filtering ---------- */
  const filteredAlbums = useMemo(() => {
    const q = galleryQuery.trim().toLowerCase()
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(startOfToday)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(startOfToday)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    let list = [...albums]

    if (galleryTypeFilter !== 'ALL') {
      list = list.filter((a) => a.incidentType === galleryTypeFilter)
    }

    if (galleryDateFilter !== 'all' && galleryDateFilter !== 'custom') {
      list = list.filter((a) => {
        const d = new Date(`${a.date}T00:00:00`)
        if (galleryDateFilter === 'today') return d >= startOfToday
        if (galleryDateFilter === 'week') return d >= weekAgo
        if (galleryDateFilter === 'month') return d >= monthAgo
        return true
      })
    }

    if (q) {
      list = list.filter((a) => {
        const hay = [
          a.title,
          a.incidentType,
          a.location,
          a.barangay,
          a.city,
          a.respondingUnits,
          a.documentationOfficer,
          a.date,
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }

    list.sort((a, b) => {
      switch (gallerySort) {
        case 'oldest':
          return a.createdAt - b.createdAt
        case 'alpha':
          return a.title.localeCompare(b.title)
        case 'updated':
          return b.updatedAt - a.updatedAt
        case 'photo-count':
          return b.photoCount - a.photoCount
        case 'newest':
        default:
          return b.createdAt - a.createdAt
      }
    })

    return list
  }, [
    albums,
    galleryDateFilter,
    galleryQuery,
    gallerySort,
    galleryTypeFilter,
  ])

  const value: StudioContextValue = {
    view,
    setView,
    session,
    frames,
    activeFrame,
    albums,
    albumPhotos,
    selectedAlbumId,
    setSelectedAlbumId,
    processing,
    panelOpen,
    setPanelOpen,
    toast,
    dismissToast,
    ready,
    newSession,
    saveSession,
    resetSession,
    addPhotos,
    removePhotos,
    selectPhoto,
    togglePhotoSelected,
    selectAll,
    selectNone,
    invertSelection,
    selectByStatus,
    updateAdjustments,
    rotateActive,
    updateMetadata,
    updateFrameConfig,
    updateExportSettings,
    setPreviewMode,
    uploadFrame,
    useFrame,
    removeActiveFrame,
    deleteLibraryFrame,
    renameFrame,
    applyFrame,
    createAlbumFromSession,
    exportCurrent,
    exportSelected,
    exportAll,
    refreshAlbums,
    loadAlbumPhotos,
    updateAlbum,
    deleteAlbum,
    setAlbumCover,
    addPhotosToAlbum,
    downloadAlbum,
    downloadAlbumPhoto,
    deleteAlbumPhoto: deleteAlbumPhotoFn,
    galleryQuery,
    setGalleryQuery,
    galleryTypeFilter,
    setGalleryTypeFilter,
    galleryDateFilter,
    setGalleryDateFilter,
    gallerySort,
    setGallerySort,
    filteredAlbums,
  }

  return (
    <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
  )
}

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used within StudioProvider')
  return ctx
}
