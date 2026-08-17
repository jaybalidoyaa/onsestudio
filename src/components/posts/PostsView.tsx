import { useEffect, useState } from 'react'
import { useStudio } from '../../store/StudioContext'
import { formatDisplayDate, formatDisplayTime } from '../../lib/utils'
import type { Album } from '../../types'
import { Button } from '../ui/Button'

type SortOption = 'newest' | 'oldest' | 'alpha'

export function PostsView() {
  const { albums, albumPhotos, loadAlbumPhotos, setView, setSelectedAlbumId } = useStudio()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Preload covers
  useEffect(() => {
    for (const album of albums.slice(0, 30)) {
      void loadAlbumPhotos(album.id)
    }
  }, [albums, loadAlbumPhotos])

  useEffect(() => {
    if (selectedId) void loadAlbumPhotos(selectedId)
  }, [selectedId, loadAlbumPhotos])

  const filtered = albums
    .filter((a) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        a.title.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.address?.toLowerCase().includes(q) ||
        a.alarm?.toLowerCase().includes(q) ||
        a.incidentType?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt
      if (sort === 'oldest') return a.createdAt - b.createdAt
      return a.title.localeCompare(b.title)
    })

  const selected = selectedId ? albums.find((a) => a.id === selectedId) : null
  const photos = selectedId ? (albumPhotos[selectedId] ?? []) : []

  if (selected) {
    return <PostDetail album={selected} photos={photos} onBack={() => setSelectedId(null)} onOpenGallery={() => { setSelectedAlbumId(selected.id); setView('gallery') }} />
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-navy-950">
      {/* Header */}
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-5 py-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-50">Posts</h1>
            <p className="mt-0.5 text-sm text-ink-400">
              Brigada Onse SVFAR — photo documentation archive
            </p>
          </div>
          <div className="text-xs text-ink-500">
            {filtered.length} album{filtered.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, location, alarm type…"
            className="w-full max-w-xs rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-gold-500 focus:outline-none"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ink-50 focus:border-gold-500 focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-navy-600 text-center">
            <p className="text-lg font-semibold text-ink-50">
              {albums.length === 0 ? 'No posts yet' : 'No results'}
            </p>
            <p className="mt-2 max-w-sm text-sm text-ink-400">
              {albums.length === 0
                ? 'Albums created in Studio will appear here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((album) => {
              const cover =
                albumPhotos[album.id]?.find((p) => p.id === album.coverPhotoId)?.thumbnailUrl ??
                albumPhotos[album.id]?.[0]?.thumbnailUrl
              return (
                <PostCard
                  key={album.id}
                  album={album}
                  coverUrl={cover}
                  onClick={() => setSelectedId(album.id)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PostCard({ album, coverUrl, onClick }: { album: Album; coverUrl?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-xl border border-navy-700 bg-navy-900 text-left transition-all hover:border-gold-500/50 hover:shadow-xl"
    >
      {/* Cover image */}
      <div className="aspect-[16/10] overflow-hidden bg-navy-850">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-3xl opacity-20">🖼</span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold leading-snug text-ink-50 group-hover:text-gold-400">
            {album.title}
          </h2>
          <span className="shrink-0 rounded-full border border-navy-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
            {album.photoCount} photos
          </span>
        </div>
        {(album.address || album.location) ? (
          <p className="mb-1 text-xs text-ink-300">
            📍 {album.address || album.location}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
          <span>{formatDisplayDate(album.date)}</span>
          {album.alarm ? <span>{album.alarm}</span> : null}
        </div>
        <div className="mt-2">
          <span className="inline-flex rounded-md bg-navy-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-ink-400">
            {album.incidentType}
          </span>
        </div>
      </div>
    </button>
  )
}

function PostDetail({
  album,
  photos,
  onBack,
  onOpenGallery,
}: {
  album: Album
  photos: ReturnType<typeof useStudio>['albumPhotos'][string]
  onBack: () => void
  onOpenGallery: () => void
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  return (
    <div className="flex h-full min-h-0 flex-col bg-navy-950">
      {/* Header */}
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-5 py-4">
        <div className="mb-2 flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onBack}>
            ← Posts
          </Button>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-50">{album.title}</h1>
            {(album.address || album.location) ? (
              <p className="mt-0.5 text-sm text-ink-300">
                📍 {album.address || album.location}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-400">
              <span>{formatDisplayDate(album.date)}</span>
              {album.time ? <span>{formatDisplayTime(album.time)}</span> : null}
              <span>{album.photoCount} photos</span>
              {album.alarm ? <span>{album.alarm}</span> : null}
            </div>
            {album.unit || album.respondingUnits ? (
              <p className="mt-1 text-xs text-ink-400">
                Responding: {album.unit || album.respondingUnits}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onOpenGallery}>
              Open in Gallery
            </Button>
          </div>
        </div>
      </div>

      {/* Photo grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {photos.length === 0 ? (
          <p className="text-sm text-ink-400">Loading photos…</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxIdx(index)}
                className="group relative overflow-hidden rounded-lg border border-navy-700 bg-navy-900 transition-all hover:border-gold-500/50 hover:shadow-lg"
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={`Photo ${index + 1}`}
                  className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && photos[lightboxIdx] ? (
        <div
          className="absolute inset-0 z-50 flex flex-col bg-navy-950/98 backdrop-blur-sm"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="flex shrink-0 items-center justify-between border-b border-navy-700 px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm text-ink-300">
              {lightboxIdx + 1} / {photos.length}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setLightboxIdx(Math.max(0, lightboxIdx - 1))} disabled={lightboxIdx === 0}>Prev</Button>
              <Button size="sm" variant="ghost" onClick={() => setLightboxIdx(Math.min(photos.length - 1, lightboxIdx + 1))} disabled={lightboxIdx === photos.length - 1}>Next</Button>
              <Button size="sm" variant="ghost" onClick={() => setLightboxIdx(null)}>Close</Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <img
              src={photos[lightboxIdx].processedUrl ?? photos[lightboxIdx].thumbnailUrl}
              alt={photos[lightboxIdx].filename}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
