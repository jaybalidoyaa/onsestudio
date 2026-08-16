export type AppView = 'studio' | 'gallery' | 'frames' | 'settings'

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
  title: string
  incidentType: IncidentType
  date: string
  time: string
  location: string
  barangay: string
  city: string
  respondingUnits: string
  documentationOfficer: string
  notes: string
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
  fitMode: 'fit-frame',
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
    title: '',
    incidentType: 'Fire Incident',
    date,
    time,
    location: '',
    barangay: '',
    city: '',
    respondingUnits: '',
    documentationOfficer: '',
    notes: '',
  }
}
