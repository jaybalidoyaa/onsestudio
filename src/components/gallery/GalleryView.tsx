import { useEffect, useMemo, useRef, useState } from 'react'
import { useStudio } from '../../store/StudioContext'
import {
  formatDisplayDate,
  formatDisplayTime,
  padPhotoNumber,
} from '../../lib/utils'
import { INCIDENT_TYPES, type Album, type AlbumPhoto, type IncidentType } from '../../types'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea, StatusBadge } from '../ui/Panel'

export function GalleryView() {
  const {
    filteredAlbums,
    selectedAlbumId,
    setSelectedAlbumId,
    galleryQuery,
    setGalleryQuery,
    galleryTypeFilter,
    setGalleryTypeFilter,
    galleryDateFilter,
    setGalleryDateFilter,
    gallerySort,
    setGallerySort,
    albumPhotos,
    loadAlbumPhotos,
    setView,
  } = useStudio()

  useEffect(() => {
    for (const album of filteredAlbums.slice(0, 24)) {
      void loadAlbumPhotos(album.id)
    }
  }, [filteredAlbums, loadAlbumPhotos])

  useEffect(() => {
    if (selectedAlbumId) void loadAlbumPhotos(selectedAlbumId)
  }, [selectedAlbumId, loadAlbumPhotos])

  if (selectedAlbumId) {
    return (
      <AlbumDetail
        albumId={selectedAlbumId}
        onBack={() => setSelectedAlbumId(null)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-4 py-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink-50">
              Photo Documentation Gallery
            </h1>
            <p className="text-sm text-ink-400">
              Completed incident albums and archives
            </p>
          </div>
          <Button variant="primary" onClick={() => setView('studio')}>
            New Studio Session
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            value={galleryQuery}
            onChange={(e) => setGalleryQuery(e.target.value)}
            placeholder="Search title, location, unit…"
            className="max-w-xs"
            aria-label="Search albums"
          />
          <Select
            value={galleryTypeFilter}
            onChange={(e) =>
              setGalleryTypeFilter(e.target.value as IncidentType | 'ALL')
            }
            aria-label="Filter by type"
            className="max-w-[200px]"
          >
            <option value="ALL">All types</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            value={galleryDateFilter}
            onChange={(e) =>
              setGalleryDateFilter(
                e.target.value as typeof galleryDateFilter,
              )
            }
            aria-label="Filter by date"
            className="max-w-[160px]"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </Select>
          <Select
            value={gallerySort}
            onChange={(e) =>
              setGallerySort(e.target.value as typeof gallerySort)
            }
            aria-label="Sort albums"
            className="max-w-[180px]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alpha">Alphabetical</option>
            <option value="updated">Recently updated</option>
            <option value="photo-count">Photo count</option>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {filteredAlbums.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-navy-600 text-center">
            <h2 className="mb-2 text-lg font-semibold text-ink-50">
              No albums yet
            </h2>
            <p className="mb-4 max-w-sm text-sm text-ink-400">
              Process photographs in Studio and create an album to archive them
              here.
            </p>
            <Button variant="primary" onClick={() => setView('studio')}>
              Go to Studio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAlbums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                coverUrl={
                  albumPhotos[album.id]?.find((p) => p.id === album.coverPhotoId)
                    ?.thumbnailUrl ??
                  albumPhotos[album.id]?.[0]?.thumbnailUrl
                }
                onOpen={() => {
                  void loadAlbumPhotos(album.id)
                  setSelectedAlbumId(album.id)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AlbumCard({
  album,
  coverUrl,
  onOpen,
}: {
  album: Album
  coverUrl?: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-lg border border-navy-700 bg-navy-900 text-left transition-colors hover:border-gold-500/50"
    >
      <div className="aspect-[16/10] bg-navy-850">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-400">
            Loading cover…
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink-50 group-hover:text-gold-400">
            {album.title}
          </h2>
          <StatusBadge status={album.status} />
        </div>
        <p className="text-xs text-ink-300">
          {[album.location, album.city].filter(Boolean).join(', ') || '—'}
        </p>
        <p className="text-xs text-ink-400">
          {formatDisplayDate(album.date)} · {album.photoCount} Photos
        </p>
        <p className="text-[11px] uppercase tracking-wide text-ink-400">
          {album.incidentType}
        </p>
      </div>
    </button>
  )
}

function AlbumDetail({
  albumId,
  onBack,
}: {
  albumId: string
  onBack: () => void
}) {
  const {
    albums,
    albumPhotos,
    loadAlbumPhotos,
    updateAlbum,
    deleteAlbum,
    setAlbumCover,
    addPhotosToAlbum,
    downloadAlbum,
    downloadAlbumPhoto,
    deleteAlbumPhoto,
  } = useStudio()

  const album = albums.find((a) => a.id === albumId)
  const photos = albumPhotos[albumId] ?? []
  const [editing, setEditing] = useState(false)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Album>>({})
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadAlbumPhotos(albumId)
  }, [albumId, loadAlbumPhotos])

  if (!album) {
    return (
      <div className="flex h-full items-center justify-center">
        <Button onClick={onBack}>Back to Gallery</Button>
      </div>
    )
  }

  const viewerIndex = photos.findIndex((p) => p.id === viewerId)
  const viewer = viewerIndex >= 0 ? photos[viewerIndex] : null

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onBack}>
            ← Gallery
          </Button>
          <StatusBadge status={album.status} />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-50">{album.title}</h1>
            <p className="text-sm text-ink-300">
              {[album.location, album.barangay, album.city]
                .filter(Boolean)
                .join(', ')}
            </p>
            <p className="text-sm text-ink-400">
              {formatDisplayDate(album.date)} · {formatDisplayTime(album.time)} ·{' '}
              {album.photoCount} Photos
            </p>
            {album.respondingUnits ? (
              <p className="mt-1 text-xs text-ink-300">
                Responding: {album.respondingUnits}
              </p>
            ) : null}
            {album.frameName ? (
              <p className="text-xs text-ink-400">Frame: {album.frameName}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraft(album)
                setEditing(true)
              }}
            >
              Edit Details
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => addInputRef.current?.click()}
            >
              Add Photos
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void downloadAlbum(albumId)}
            >
              Download Album
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (confirm('Delete this album and all of its photographs?')) {
                  void deleteAlbum(albumId)
                  onBack()
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
        <input
          ref={addInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addPhotosToAlbum(albumId, e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-md border border-navy-700 bg-navy-900"
            >
              <button
                type="button"
                className="block w-full"
                onClick={() => setViewerId(photo.id)}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={`Photo ${padPhotoNumber(index, photos.length)}`}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </button>
              <div className="flex items-center justify-between px-2 py-1.5 text-[10px] text-ink-300">
                <span>PHOTO {padPhotoNumber(index, photos.length)}</span>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 hover:text-gold-500"
                  onClick={() => void setAlbumCover(albumId, photo.id)}
                >
                  Cover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing ? (
        <EditAlbumModal
          draft={draft}
          setDraft={setDraft}
          onClose={() => setEditing(false)}
          onSave={() => {
            void updateAlbum(albumId, draft)
            setEditing(false)
          }}
        />
      ) : null}

      {viewer ? (
        <AlbumViewer
          photo={viewer}
          index={viewerIndex}
          total={photos.length}
          onClose={() => setViewerId(null)}
          onPrev={() => setViewerId(photos[Math.max(0, viewerIndex - 1)].id)}
          onNext={() =>
            setViewerId(photos[Math.min(photos.length - 1, viewerIndex + 1)].id)
          }
          onDownload={() => void downloadAlbumPhoto(albumId, viewer.id)}
          onDelete={() => {
            void deleteAlbumPhoto(albumId, viewer.id)
            setViewerId(null)
          }}
        />
      ) : null}
    </div>
  )
}

function EditAlbumModal({
  draft,
  setDraft,
  onClose,
  onSave,
}: {
  draft: Partial<Album>
  setDraft: (d: Partial<Album>) => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-navy-950/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-navy-600 bg-navy-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold-500">
          Edit Album Details
        </h2>
        <div className="flex flex-col gap-3">
          <Field label="Title">
            <Input
              value={draft.title ?? ''}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <Field label="Incident Type">
            <Select
              value={draft.incidentType}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  incidentType: e.target.value as IncidentType,
                })
              }
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date">
              <Input
                type="date"
                value={draft.date ?? ''}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>
            <Field label="Time">
              <Input
                type="time"
                value={draft.time ?? ''}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Location">
            <Input
              value={draft.location ?? ''}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Barangay">
              <Input
                value={draft.barangay ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, barangay: e.target.value })
                }
              />
            </Field>
            <Field label="City">
              <Input
                value={draft.city ?? ''}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Responding Unit">
            <Input
              value={draft.respondingUnits ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, respondingUnits: e.target.value })
              }
            />
          </Field>
          <Field label="Documentation Officer">
            <Input
              value={draft.documentationOfficer ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  documentationOfficer: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Description / Notes">
            <Textarea
              value={draft.notes ?? ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

function AlbumViewer({
  photo,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  onDownload,
  onDelete,
}: {
  photo: AlbumPhoto
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  const [showOriginal, setShowOriginal] = useState(false)
  const src = useMemo(
    () => (showOriginal ? photo.originalUrl : photo.processedUrl),
    [photo.originalUrl, photo.processedUrl, showOriginal],
  )

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-navy-950/95">
      <div className="flex items-center gap-2 border-b border-navy-700 px-3 py-2">
        <span className="text-xs font-semibold text-ink-200">
          PHOTO {index + 1} / {total}
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={onPrev} disabled={index <= 0}>
            Prev
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onNext}
            disabled={index >= total - 1}
          >
            Next
          </Button>
          <Button
            size="sm"
            variant={showOriginal ? 'gold' : 'secondary'}
            onClick={() => setShowOriginal((v) => !v)}
          >
            {showOriginal ? 'View Processed' : 'View Original'}
          </Button>
          <Button size="sm" variant="secondary" onClick={onDownload}>
            Download
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <img
          src={src}
          alt={photo.filename}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    </div>
  )
}
