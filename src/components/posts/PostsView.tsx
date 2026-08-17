import { useEffect, useState } from 'react'
import { useStudio } from '../../store/StudioContext'
import { formatDisplayDate, formatDisplayTime } from '../../lib/utils'
import type { Album, AlbumPhoto } from '../../types'

type SortOption = 'newest' | 'oldest' | 'alpha'

export function PostsView() {
  const { albums, albumPhotos, loadAlbumPhotos } = useStudio()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    for (const album of albums.slice(0, 40)) {
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
        (a.location ?? '').toLowerCase().includes(q) ||
        (a.address ?? '').toLowerCase().includes(q) ||
        (a.alarm ?? '').toLowerCase().includes(q) ||
        (a.incidentType ?? '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt
      if (sort === 'oldest') return a.createdAt - b.createdAt
      return a.title.localeCompare(b.title)
    })

  const selectedAlbum = selectedId ? albums.find((a) => a.id === selectedId) : null
  const selectedPhotos = selectedId ? (albumPhotos[selectedId] ?? []) : []

  if (selectedAlbum) {
    return (
      <PostDetail
        album={selectedAlbum}
        photos={selectedPhotos}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-navy-950">
      {/* Page header */}
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-11 w-11 rounded-full bg-navy-800 object-contain p-0.5" />
            <div>
              <div className="font-semibold text-ink-50">Brigada Onse SVFAR Studio</div>
              <div className="text-xs text-ink-400">Photo documentation archive</div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts…"
              className="min-w-0 flex-1 rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-gold-500 focus:outline-none"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-ink-50 focus:border-gold-500 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alpha">A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-700 py-20 text-center">
              <div className="mb-3 text-4xl opacity-20">📋</div>
              <p className="font-semibold text-ink-200">
                {albums.length === 0 ? 'No posts yet' : 'No results found'}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {albums.length === 0
                  ? 'Albums created in Studio will appear here.'
                  : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filtered.map((album) => (
                <FeedCard
                  key={album.id}
                  album={album}
                  photos={albumPhotos[album.id] ?? []}
                  onClick={() => setSelectedId(album.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Feed card ─────────────────────────────────────────────────

function FeedCard({
  album,
  photos,
  onClick,
}: {
  album: Album
  photos: AlbumPhoto[]
  onClick: () => void
}) {
  const preview = photos.slice(0, 4)
  const extra = photos.length - 4

  return (
    <article className="overflow-hidden rounded-2xl border border-navy-700 bg-navy-900">
      {/* Who posted it */}
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <img
          src="/logo.png"
          alt=""
          className="h-10 w-10 shrink-0 rounded-full bg-navy-800 object-contain p-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink-50">
            Brigada Onse Sun Valley Fire and Rescue
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-400">
            <span>{formatDisplayDate(album.date)}</span>
            {album.time ? <><span>·</span><span>{formatDisplayTime(album.time)}</span></> : null}
            <span>·</span>
            <span className="rounded border border-navy-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
              {album.incidentType}
            </span>
          </div>
        </div>
      </div>

      {/* Incident details */}
      <div className="px-4 pb-3 sm:px-5">
        <h2 className="mb-2 text-base font-bold text-ink-50">{album.title}</h2>
        <div className="space-y-1 text-sm">
          {(album.address || album.location) ? (
            <p className="text-ink-300">
              <span className="mr-1.5">📍</span>{album.address || album.location}
            </p>
          ) : null}
          {album.alarm ? (
            <p>
              <span className="mr-1.5">🚨</span>
              <span className="font-semibold text-gold-400">{album.alarm}</span>
            </p>
          ) : null}
          {(album.unit || album.respondingUnits) ? (
            <p className="text-ink-300">
              <span className="mr-1.5">🚒</span>{album.unit || album.respondingUnits}
            </p>
          ) : null}
          {(album.callsign || album.documentationOfficer) ? (
            <p className="text-ink-300">
              <span className="mr-1.5">👤</span>{album.callsign || album.documentationOfficer}
            </p>
          ) : null}
        </div>
      </div>

      {/* Photo grid — clickable */}
      {preview.length > 0 ? (
        <button type="button" onClick={onClick} className="w-full">
          <PhotoGrid photos={preview} extra={extra} />
        </button>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-navy-800 px-4 py-2.5 sm:px-5">
        <span className="text-xs text-ink-500">
          {album.photoCount} photo{album.photoCount === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={onClick}
          className="text-xs font-semibold text-gold-500 hover:text-gold-400"
        >
          View all →
        </button>
      </div>
    </article>
  )
}

// ── Photo grid ────────────────────────────────────────────────

function PhotoGrid({ photos, extra }: { photos: AlbumPhoto[]; extra: number }) {
  const src = (p: AlbumPhoto) => p.thumbnailUrl ?? p.processedUrl ?? ''

  if (photos.length === 1) {
    return (
      <div className="aspect-[16/9] overflow-hidden bg-navy-850">
        <img src={src(photos[0])} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }
  if (photos.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-px bg-navy-800">
        {photos.map((p) => (
          <div key={p.id} className="aspect-square overflow-hidden bg-navy-850">
            <img src={src(p)} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    )
  }
  if (photos.length === 3) {
    return (
      <div className="grid grid-cols-[2fr_1fr] gap-px bg-navy-800">
        <div className="row-span-2 overflow-hidden bg-navy-850" style={{ aspectRatio: '4/3' }}>
          <img src={src(photos[0])} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
        {photos.slice(1).map((p) => (
          <div key={p.id} className="aspect-square overflow-hidden bg-navy-850">
            <img src={src(p)} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    )
  }
  // 4+
  return (
    <div className="grid grid-cols-2 gap-px bg-navy-800">
      {photos.slice(0, 3).map((p) => (
        <div key={p.id} className="aspect-square overflow-hidden bg-navy-850">
          <img src={src(p)} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ))}
      <div className="relative aspect-square overflow-hidden bg-navy-850">
        <img src={src(photos[3])} alt="" className="h-full w-full object-cover opacity-40" loading="lazy" />
        {extra > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-ink-50">+{extra + 1}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Post detail ───────────────────────────────────────────────

function PostDetail({
  album,
  photos,
  onBack,
}: {
  album: Album
  photos: AlbumPhoto[]
  onBack: () => void
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  return (
    <div className="flex h-full min-h-0 flex-col bg-navy-950">
      {/* Header */}
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-ink-400 transition-colors hover:text-ink-50"
          >
            ← Back to Posts
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-4">

          {/* Post card */}
          <article className="overflow-hidden rounded-2xl border border-navy-700 bg-navy-900">
            {/* Poster */}
            <div className="flex items-center gap-3 px-5 py-4">
              <img
                src="/logo.png"
                alt=""
                className="h-12 w-12 shrink-0 rounded-full bg-navy-800 object-contain p-0.5"
              />
              <div>
                <div className="font-semibold text-ink-50">
                  Brigada Onse Sun Valley Fire and Rescue
                </div>
                <div className="mt-0.5 text-xs text-ink-400">
                  {formatDisplayDate(album.date)}
                  {album.time ? ` · ${formatDisplayTime(album.time)}` : ''}
                  {' · '}
                  <span className="rounded border border-navy-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    {album.incidentType}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="border-t border-navy-800 px-5 py-4">
              <h1 className="mb-4 text-xl font-bold text-ink-50">{album.title}</h1>
              <div className="grid gap-2 sm:grid-cols-2">
                {(album.address || album.location) ? (
                  <DetailCard icon="📍" label="Location" value={album.address || album.location || ''} />
                ) : null}
                {album.alarm ? (
                  <DetailCard icon="🚨" label="Alarm" value={album.alarm} highlight />
                ) : null}
                {(album.unit || album.respondingUnits) ? (
                  <DetailCard icon="🚒" label="Responding unit" value={album.unit || album.respondingUnits || ''} />
                ) : null}
                {(album.callsign || album.documentationOfficer) ? (
                  <DetailCard icon="👤" label="Personnel" value={album.callsign || album.documentationOfficer || ''} />
                ) : null}
                {(album.barangay || album.city) ? (
                  <DetailCard icon="🗺" label="Area" value={[album.barangay, album.city].filter(Boolean).join(', ')} />
                ) : null}
              </div>
              {album.notes ? (
                <p className="mt-3 text-sm leading-relaxed text-ink-300">{album.notes}</p>
              ) : null}
            </div>

            {photos.length > 0 ? (
              <div className="border-t border-navy-800 px-5 py-2.5 text-xs text-ink-500">
                {photos.length} photograph{photos.length === 1 ? '' : 's'}
              </div>
            ) : null}
          </article>

          {/* Photo grid */}
          {photos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-navy-700 py-12 text-center text-sm text-ink-500">
              Loading photos…
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxIdx(index)}
                  className="group relative overflow-hidden rounded-xl border border-navy-700 bg-navy-900 transition-all hover:border-gold-500/60 hover:shadow-lg"
                >
                  <img
                    src={photo.thumbnailUrl ?? photo.processedUrl}
                    alt={`Photo ${index + 1}`}
                    className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="absolute bottom-1.5 left-2 text-[10px] font-semibold text-ink-100 opacity-0 transition-opacity group-hover:opacity-100">
                    {index + 1}/{photos.length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && photos[lightboxIdx] ? (
        <div
          className="absolute inset-0 z-50 flex flex-col bg-navy-950/98 backdrop-blur-md"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="flex shrink-0 items-center justify-between border-b border-navy-800 bg-navy-900/80 px-4 py-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm text-ink-300">
              <span className="font-semibold text-ink-100">{lightboxIdx + 1}</span>
              <span className="mx-1 text-ink-600">/</span>
              {photos.length}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setLightboxIdx(Math.max(0, lightboxIdx - 1))}
                disabled={lightboxIdx === 0}
                className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-1.5 text-xs font-semibold text-ink-200 hover:text-ink-50 disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => setLightboxIdx(Math.min(photos.length - 1, lightboxIdx + 1))}
                disabled={lightboxIdx === photos.length - 1}
                className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-1.5 text-xs font-semibold text-ink-200 hover:text-ink-50 disabled:opacity-30"
              >
                Next →
              </button>
              <button
                type="button"
                onClick={() => setLightboxIdx(null)}
                className="ml-1 rounded-lg border border-navy-700 bg-navy-800 px-3 py-1.5 text-xs font-semibold text-ink-200 hover:border-alert-500/50 hover:text-alert-400"
              >
                ✕
              </button>
            </div>
          </div>

          <div
            className="flex min-h-0 flex-1 items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIdx].processedUrl ?? photos[lightboxIdx].thumbnailUrl}
              alt={photos[lightboxIdx].filename}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
          </div>

          {/* Thumbnail strip */}
          <div
            className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-navy-800 bg-navy-900/80 px-4 py-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLightboxIdx(i)}
                className={`shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                  i === lightboxIdx
                    ? 'border-gold-500 opacity-100'
                    : 'border-transparent opacity-40 hover:opacity-80'
                }`}
              >
                <img
                  src={p.thumbnailUrl ?? p.processedUrl}
                  alt=""
                  className="h-11 w-11 object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DetailCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: string
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-navy-850 px-3.5 py-2.5">
      <span className="mt-0.5 text-base leading-none">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
        <div className={`mt-0.5 text-sm font-medium ${highlight ? 'text-gold-400' : 'text-ink-200'}`}>
          {value}
        </div>
      </div>
    </div>
  )
}
