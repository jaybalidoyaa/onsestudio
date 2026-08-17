export type AppView = 'home' | 'studio' | 'gallery' | 'frames' | 'facebook' | 'settings' | 'logs' | 'posts'

export type PhotoStatus =
  | 'uploaded'
  | 'ready'
  | 'processing'
  | 'processed'
  | 'error'

export type AlbumStatus = 'draft' | 'processing' | 'completed'

export type IncidentType =
  | 'Fire Incident'
  | 'Rescue Operation'
  | 'Medical Response'
  | 'Flood Response'
  | 'Disaster Response'
  | 'Training'
  | 'Fire Prevention Activity'
  | 'Community Activity'
  | 'Other'

export type FrameFitMode =
  | 'fit-frame'
  | 'fit-photo'
  | 'cover'
  | 'contain'
  | 'stretch'

export type FramePosition = 'top' | 'center' | 'bottom' | 'custom'

export type PreviewMode = 'original' | 'framed' | 'side-by-side' | 'before-after'

export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom'

export type AlbumSort =
  | 'newest'
  | 'oldest'
  | 'alpha'
  | 'updated'
  | 'photo-count'

export interface PhotoAdjustments {
  brightness: number
  contrast: number
  exposure: number
  saturation: number
  sharpness: number
  rotation: number
  crop: { x: number; y: number; width: number; height: number } | null
}

export interface IncidentMetadata {
  /** Headline used in albums / exports */
  title: string
  /** Incident date (YYYY-MM-DD) */
  date: string
  /** Full address / location for Facebook post */
  address: string
  /** Alarm level, e.g. "10-70 1st Alarm" */
  alarm: string
  /** Responding unit, e.g. "Sun Valley Engine" */
  unit: string
  /** Responding personnel / callsign, e.g. "Finest 12" */
  callsign: string
  time: string
  incidentType: IncidentType
}

export interface FrameConfig {
  fitMode: FrameFitMode
  position: FramePosition
  scale: number
  opacity: number
  offsetX: number
  offsetY: number
  showSafeArea: boolean
}

export interface ExportSettings {
  format: 'jpeg' | 'png'
  quality: number
  includeOriginals: boolean
}

export interface StudioPhoto {
  id: string
  filename: string
  mimeType: string
  width: number
  height: number
  status: PhotoStatus
  selected: boolean
  errorMessage?: string
  adjustments: PhotoAdjustments
  originalBlob: Blob
  thumbnailUrl: string
  objectUrl: string
  processedBlob?: Blob
  processedUrl?: string
  createdAt: number
}

export interface FrameAsset {
  id: string
  name: string
  filename: string
  mimeType: string
  width: number
  height: number
  hasTransparency: boolean
  blob: Blob
  thumbnailUrl: string
  objectUrl: string
  createdAt: number
}

export interface StudioSession {
  id: string
  createdAt: number
  updatedAt: number
  metadata: IncidentMetadata
  photos: StudioPhoto[]
  activePhotoId: string | null
  activeFrameId: string | null
  frameConfig: FrameConfig
  exportSettings: ExportSettings
  previewMode: PreviewMode
}

export interface AlbumPhoto {
  id: string
  albumId: string
  filename: string
  order: number
  width: number
  height: number
  originalBlob: Blob
  processedBlob: Blob
  thumbnailBlob: Blob
  originalUrl?: string
  processedUrl?: string
  thumbnailUrl?: string
  createdAt: number
}

export interface Album {
  id: string
  title: string
  incidentType: IncidentType
  date: string
  time: string
  location: string
  address: string
  alarm: string
  unit: string
  callsign: string
  barangay: string
  city: string
  respondingUnits: string
  documentationOfficer: string
  notes: string
  frameId: string | null
  frameName: string
  coverPhotoId: string | null
  photoCount: number
  status: AlbumStatus
  createdAt: number
  updatedAt: number
}

export interface PersistedFrame {
  id: string
  name: string
  filename: string
  mimeType: string
  width: number
  height: number
  hasTransparency: boolean
  blob: Blob
  thumbnailBlob: Blob
  createdAt: number
}

export interface PersistedSessionMeta {
  id: string
  createdAt: number
  updatedAt: number
  metadata: IncidentMetadata
  activePhotoId: string | null
  activeFrameId: string | null
  frameConfig: FrameConfig
  exportSettings: ExportSettings
  previewMode: PreviewMode
  photoIds: string[]
}

export interface PersistedStudioPhoto {
  id: string
  sessionId: string
  filename: string
  mimeType: string
  width: number
  height: number
  status: PhotoStatus
  selected: boolean
  errorMessage?: string
  adjustments: PhotoAdjustments
  originalBlob: Blob
  thumbnailBlob: Blob
  processedBlob?: Blob
  createdAt: number
}

export const INCIDENT_TYPES: IncidentType[] = [
  'Fire Incident',
  'Rescue Operation',
  'Medical Response',
  'Flood Response',
  'Disaster Response',
  'Training',
  'Fire Prevention Activity',
  'Community Activity',
  'Other',
]

export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 0,
  contrast: 0,
  exposure: 0,
  saturation: 0,
  sharpness: 0,
  rotation: 0,
  crop: null,
}

export const DEFAULT_FRAME_CONFIG: FrameConfig = {
  // Stretch frame to the fixed 940×788 output canvas
  fitMode: 'stretch',
  position: 'center',
  scale: 100,
  opacity: 100,
  offsetX: 0,
  offsetY: 0,
  showSafeArea: false,
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'jpeg',
  quality: 95,
  includeOriginals: false,
}

export function createDefaultMetadata(): IncidentMetadata {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 5)
  return {
    title: 'FIRE RESPONSE OPERATION',
    incidentType: 'Fire Incident',
    date,
    time,
    address: '',
    alarm: '',
    unit: '',
    callsign: '',
  }
}

/** Normalize older saved metadata / albums into the current shape. */
export function normalizeMetadata(
  raw: Partial<IncidentMetadata> | (Partial<IncidentMetadata> & Record<string, unknown>),
): IncidentMetadata {
  const defaults = createDefaultMetadata()
  const record = raw as Partial<IncidentMetadata> & Record<string, unknown>
  const address =
    (record.address as string) ||
    (record.location as string) ||
    defaults.address
  return {
    title: (record.title as string) || defaults.title,
    incidentType:
      (record.incidentType as IncidentType) || defaults.incidentType,
    date: (record.date as string) || defaults.date,
    time: (record.time as string) || defaults.time,
    address,
    alarm: (record.alarm as string) || '',
    unit:
      (record.unit as string) ||
      (record.respondingUnits as string) ||
      '',
    callsign:
      (record.callsign as string) ||
      (record.documentationOfficer as string) ||
      '',
  }
}
