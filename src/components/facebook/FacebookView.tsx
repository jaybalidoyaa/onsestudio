import { useEffect, useMemo, useState } from 'react'
import {
  buildFacebookCaption,
  captionSourceFromAlbum,
  captionSourceFromMetadata,
} from '../../lib/caption'
import { postPhotosToFacebookPage, verifyFacebookPage } from '../../lib/facebook'
import { useAuth } from '../../store/AuthContext'
import { useStudio } from '../../store/StudioContext'
import { formatDisplayDate } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Field, Select, Textarea } from '../ui/Panel'

export function FacebookView() {
  const {
    albums,
    albumPhotos,
    loadAlbumPhotos,
    session,
    setView,
  } = useStudio()
  const { settings, saveFacebookSettings, isAdmin, logActivity, user, canEdit } =
    useAuth()

  const [albumId, setAlbumId] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [feeling, setFeeling] = useState('Documenting an incident response')

  const configured =
    Boolean(settings.facebook.pageId.trim()) &&
    Boolean(settings.facebook.pageAccessToken.trim())

  const activeAlbum = albums.find((a) => a.id === albumId) ?? null
  const photos = albumId ? albumPhotos[albumId] ?? [] : []

  useEffect(() => {
    if (albumId) void loadAlbumPhotos(albumId)
  }, [albumId, loadAlbumPhotos])

  useEffect(() => {
    if (activeAlbum) {
      setCaption(buildFacebookCaption(captionSourceFromAlbum(activeAlbum)))
      setSelected(
        (albumPhotos[activeAlbum.id] ?? [])
          .slice(0, Math.min(10, (albumPhotos[activeAlbum.id] ?? []).length))
          .map((p) => p.id),
      )
      return
    }
    // Fall back to current studio session event info
    setCaption(
      buildFacebookCaption(captionSourceFromMetadata(session.metadata)),
    )
    setSelected([])
  }, [activeAlbum, albumPhotos, session.metadata])

  const selectedPhotos = useMemo(
    () => photos.filter((p) => selected.includes(p.id)),
    [photos, selected],
  )

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const refreshCaptionFromSource = () => {
    if (activeAlbum) {
      setCaption(buildFacebookCaption(captionSourceFromAlbum(activeAlbum)))
    } else {
      setCaption(
        buildFacebookCaption(captionSourceFromMetadata(session.metadata)),
      )
    }
  }

  const publish = async () => {
    setError('')
    setSuccess('')
    if (!configured) {
      setError('Connect your Facebook Page in Settings before posting.')
      return
    }
    if (!selectedPhotos.length) {
      setError('Select at least one photograph from an album.')
      return
    }
    setBusy(true)
    setProgress('Connecting to Facebook…')
    try {
      const page = await verifyFacebookPage(
        settings.facebook.pageId,
        settings.facebook.pageAccessToken,
      )
      if (isAdmin && page.name !== settings.facebook.pageName) {
        await saveFacebookSettings({
          ...settings.facebook,
          pageName: page.name,
        })
      }

      const result = await postPhotosToFacebookPage({
        pageId: settings.facebook.pageId,
        accessToken: settings.facebook.pageAccessToken,
        caption,
        photos: selectedPhotos.map((p) => p.processedBlob),
        onProgress: (current, total) =>
          setProgress(`Uploading photograph ${current} of ${total}…`),
      })

      await logActivity(
        'facebook.post',
        `Posted “${activeAlbum?.title || 'incident'}” (${selectedPhotos.length} photos) to ${page.name || 'Facebook Page'}`,
      )
      setProgress('')
      setSuccess(
        result.postId
          ? `Posted to ${page.name}. Post ID: ${result.postId}`
          : `Posted ${selectedPhotos.length} photo(s) to ${page.name}.`,
      )
    } catch (err) {
      setProgress('')
      setError(
        err instanceof Error ? err.message : 'Unable to post to Facebook.',
      )
    } finally {
      setBusy(false)
    }
  }

  const pageLabel =
    settings.facebook.pageName ||
    settings.facebook.pageId ||
    'Facebook Page'

  return (
    <div className="flex h-full flex-col overflow-hidden bg-navy-950">
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-50">
              Create Facebook Post
            </h1>
            <p className="text-sm text-ink-400">
              Compose an official incident post using Event Information and
              album photographs
            </p>
          </div>
          {!configured && isAdmin ? (
            <Button variant="secondary" onClick={() => setView('settings')}>
              Connect Facebook Page
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_320px]">
          {/* Facebook-style composer card */}
          <section className="overflow-hidden rounded-xl border border-navy-600 bg-navy-900 shadow-lg">
            <header className="flex items-center justify-between border-b border-navy-700 px-4 py-3">
              <h2 className="text-base font-semibold text-ink-50">
                Create post
              </h2>
              <span className="text-xs text-ink-400">{pageLabel}</span>
            </header>

            <div className="space-y-4 p-4">
              <div className="flex items-start gap-3">
                <img
                  src="/logo.png"
                  alt=""
                  className="h-11 w-11 rounded-full object-contain bg-navy-850 p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink-50">
                    {settings.facebook.pageName ||
                      'Brigada Onse Sun Valley Fire and Rescue'}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-navy-700 px-2 py-0.5 text-[11px] text-ink-200">
                      Public
                    </span>
                    <span className="rounded-full bg-navy-700 px-2 py-0.5 text-[11px] text-ink-200">
                      {feeling}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-400">
                    Posting as {user?.displayName || 'Studio user'}
                  </p>
                </div>
              </div>

              <Field label="Album source">
                <Select
                  value={albumId}
                  onChange={(e) => setAlbumId(e.target.value)}
                >
                  <option value="">Use current Studio Event Information</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} · {formatDisplayDate(a.date)} · {a.photoCount}{' '}
                      photos
                    </option>
                  ))}
                </Select>
              </Field>

              {!albumId ? (
                <div className="rounded-md border border-navy-700 bg-navy-850 px-3 py-2 text-xs text-ink-300">
                  Caption is filled from Studio Event Information
                  {session.metadata.address
                    ? ` (${session.metadata.address})`
                    : ''}
                  . Select an album below to attach processed photographs, or
                  create an album first.
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setView(canEdit ? 'studio' : 'gallery')}
                    >
                      {canEdit ? 'Open Studio' : 'Open Gallery'}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                    Post text
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={refreshCaptionFromSource}
                  >
                    Reset template
                  </Button>
                </div>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={18}
                  className="min-h-[320px] font-sans text-sm leading-relaxed"
                  placeholder="What's happening on scene?"
                />
              </div>

              {albumId ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                      Add photos to your post ({selected.length} selected)
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelected(photos.map((p) => p.id))}
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelected([])}
                      >
                        None
                      </Button>
                    </div>
                  </div>
                  {photos.length === 0 ? (
                    <p className="text-sm text-ink-400">
                      Loading album photographs…
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {photos.map((photo, index) => {
                        const on = selected.includes(photo.id)
                        return (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => toggle(photo.id)}
                            className={`relative overflow-hidden rounded-lg border ${
                              on
                                ? 'border-gold-500 ring-1 ring-gold-500'
                                : 'border-navy-600 opacity-55'
                            }`}
                            aria-pressed={on}
                          >
                            <img
                              src={photo.thumbnailUrl}
                              alt={`Photo ${index + 1}`}
                              className="aspect-square w-full object-cover"
                            />
                            <span className="absolute left-1 top-1 rounded bg-navy-950/80 px-1 text-[10px]">
                              {index + 1}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-navy-700 bg-navy-850 px-3 py-2">
                <span className="text-xs text-ink-300">Add to your post</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!albums.length}
                  onClick={() => {
                    if (!albumId && albums[0]) setAlbumId(albums[0].id)
                  }}
                >
                  📷 Photo
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setFeeling((f) =>
                      f.includes('Proud')
                        ? 'Documenting an incident response'
                        : 'Feeling proud to serve',
                    )
                  }
                >
                  😊 Feeling
                </Button>
              </div>

              {progress ? (
                <p className="text-sm text-gold-500 animate-pulse-soft">
                  {progress}
                </p>
              ) : null}
              {error ? (
                <p className="rounded-md border border-alert-500/40 bg-alert-500/10 px-3 py-2 text-sm text-alert-500">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="rounded-md border border-ok-500/40 bg-ok-500/10 px-3 py-2 text-sm text-ok-500">
                  {success}
                </p>
              ) : null}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-700 bg-navy-850 px-4 py-3">
              <Button
                variant="secondary"
                onClick={() => void navigator.clipboard.writeText(caption)}
              >
                Copy caption
              </Button>
              <Button
                variant="primary"
                className="min-w-[140px]"
                disabled={busy || !selectedPhotos.length || !configured}
                onClick={() => void publish()}
              >
                {busy ? 'Posting…' : 'Post'}
              </Button>
            </footer>
          </section>

          {/* Side panel: live event fields preview */}
          <aside className="space-y-3">
            <div className="rounded-xl border border-navy-600 bg-navy-900 p-4">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Caption fields
              </h3>
              <dl className="space-y-2 text-sm">
                {(activeAlbum
                  ? [
                      ['Date', formatDisplayDate(activeAlbum.date)],
                      [
                        'Address',
                        activeAlbum.address || activeAlbum.location || '—',
                      ],
                      ['Alarm', activeAlbum.alarm || '—'],
                      [
                        'Unit',
                        activeAlbum.unit || activeAlbum.respondingUnits || '—',
                      ],
                      [
                        'Callsign',
                        activeAlbum.callsign ||
                          activeAlbum.documentationOfficer ||
                          '—',
                      ],
                    ]
                  : [
                      ['Date', formatDisplayDate(session.metadata.date)],
                      ['Address', session.metadata.address || '—'],
                      ['Alarm', session.metadata.alarm || '—'],
                      ['Unit', session.metadata.unit || '—'],
                      ['Callsign', session.metadata.callsign || '—'],
                    ]
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-navy-800 py-1.5">
                    <dt className="text-ink-400">{k}</dt>
                    <dd className="text-right font-medium text-ink-100">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] text-ink-400">
                Edit these in Studio → Event Information, then create an album
                or reset the caption template.
              </p>
              {canEdit ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => setView('studio')}
                >
                  Edit Event Information
                </Button>
              ) : null}
            </div>

            {!configured ? (
              <div className="rounded-xl border border-warn-500/40 bg-warn-500/10 p-4 text-sm text-ink-100">
                Facebook Page is not connected. Ask an admin to add the Page ID
                and access token in Settings.
              </div>
            ) : (
              <div className="rounded-xl border border-navy-600 bg-navy-900 p-4 text-sm text-ink-300">
                Connected to{' '}
                <strong className="text-ink-50">{pageLabel}</strong>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
