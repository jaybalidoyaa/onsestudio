import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildFacebookCaption,
  captionSourceFromAlbum,
  captionSourceFromMetadata,
} from '../../lib/caption'
import { postPhotosToFacebookPage } from '../../lib/facebook'
import { createId, formatDisplayDate } from '../../lib/utils'
import { useAuth } from '../../store/AuthContext'
import { useStudio } from '../../store/StudioContext'
import { Button } from '../ui/Button'
import { Field, Select, Textarea } from '../ui/Panel'

type PostMode = 'album' | 'blank'

interface ManualPhoto {
  id: string
  name: string
  blob: Blob
  url: string
}

export function FacebookView() {
  const { albums, albumPhotos, loadAlbumPhotos, session, setView } = useStudio()
  const { settings, saveFacebookSettings, isAdmin, logActivity, user, canEdit } =
    useAuth()

  const [mode, setMode] = useState<PostMode>('blank')
  const [albumId, setAlbumId] = useState('')
  const [caption, setCaption] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [manualPhotos, setManualPhotos] = useState<ManualPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const configured =
    Boolean(settings.facebook.pageId.trim()) &&
    Boolean(settings.facebook.pageAccessToken.trim())

  const activeAlbum = albums.find((a) => a.id === albumId) ?? null
  const albumPics = albumId ? albumPhotos[albumId] ?? [] : []

  useEffect(() => {
    if (mode === 'album' && albumId) void loadAlbumPhotos(albumId)
  }, [mode, albumId, loadAlbumPhotos])

  // Auto-populate caption from album source only (blank = empty by default)
  useEffect(() => {
    if (mode === 'blank') {
      setCaption('')
      return
    }
    if (activeAlbum) {
      setCaption(buildFacebookCaption(captionSourceFromAlbum(activeAlbum)))
      setSelected(
        (albumPhotos[activeAlbum.id] ?? [])
          .slice(0, Math.min(10, (albumPhotos[activeAlbum.id] ?? []).length))
          .map((p) => p.id),
      )
      return
    }
    setCaption(buildFacebookCaption(captionSourceFromMetadata(session.metadata)))
    setSelected([])
  }, [mode, activeAlbum, albumPhotos, session.metadata])

  useEffect(() => {
    return () => {
      manualPhotos.forEach((p) => URL.revokeObjectURL(p.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedAlbumBlobs = useMemo(
    () =>
      albumPics
        .filter((p) => selected.includes(p.id))
        .map((p) => p.processedBlob),
    [albumPics, selected],
  )

  const postBlobs =
    mode === 'blank'
      ? manualPhotos.map((p) => p.blob)
      : selectedAlbumBlobs

  const toggleAlbumPhoto = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const addManualFiles = (files: FileList | File[] | null) => {
    if (!files) return
    const arr = Array.from(files)
    if (!arr.length) return
    const next: ManualPhoto[] = []
    for (const file of arr) {
      if (!file.type.startsWith('image/')) continue
      next.push({
        id: createId('mphoto'),
        name: file.name,
        blob: file,
        url: URL.createObjectURL(file),
      })
    }
    setManualPhotos((prev) => [...prev, ...next])
  }

  const removeManual = (id: string) => {
    setManualPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  const publish = async () => {
    setError('')
    setSuccess('')
    if (!configured) {
      setError('Connect your Facebook Page in Settings before posting.')
      return
    }
    // Photos are optional for blank posts
    if (mode === 'album' && !postBlobs.length) {
      setError('Select at least one photograph from the album.')
      return
    }
    setBusy(true)
    setProgress('Connecting to Facebook Page…')
    try {
      const result = await postPhotosToFacebookPage({
        pageId: settings.facebook.pageId,
        accessToken: settings.facebook.pageAccessToken,
        caption,
        photos: postBlobs,
        onProgress: (current, total) =>
          setProgress(`Uploading photograph ${current} of ${total}…`),
      })

      if (
        isAdmin &&
        result.pageName &&
        result.pageName !== settings.facebook.pageName
      ) {
        await saveFacebookSettings({
          ...settings.facebook,
          pageName: result.pageName,
        })
      }

      await logActivity(
        'facebook.post',
        `Posted ${mode} (${postBlobs.length} photo${postBlobs.length === 1 ? '' : 's'}) to ${result.pageName || 'Facebook Page'}`,
      )
      setProgress('')
      setSuccess(
        result.postId
          ? `Posted to ${result.pageName || 'Facebook Page'}. Post ID: ${result.postId}`
          : `Post published successfully.`,
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

  const copyAndOpenFacebook = async () => {
    try {
      await navigator.clipboard.writeText(caption)
      window.open('https://www.facebook.com/', '_blank', 'noopener,noreferrer')
      setSuccess('Caption copied. Facebook opened — paste your post there.')
    } catch {
      setError('Could not copy caption.')
    }
  }

  const pageLabel =
    settings.facebook.pageName ||
    settings.facebook.pageId ||
    'Facebook Page'

  // Album side panel preview
  const albumPreview: [string, string][] = activeAlbum
    ? [
        ['Date', formatDisplayDate(activeAlbum.date)],
        ['Address', activeAlbum.address || activeAlbum.location || '—'],
        ['Alarm', activeAlbum.alarm || '—'],
        ['Unit', activeAlbum.unit || activeAlbum.respondingUnits || '—'],
        ['Callsign', activeAlbum.callsign || activeAlbum.documentationOfficer || '—'],
      ]
    : [
        ['Date', formatDisplayDate(session.metadata.date)],
        ['Address', session.metadata.address || '—'],
        ['Alarm', session.metadata.alarm || '—'],
        ['Unit', session.metadata.unit || '—'],
        ['Callsign', session.metadata.callsign || '—'],
      ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-navy-950">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-navy-700 bg-navy-900 px-4 py-3.5 sm:px-5">
        <div>
          <h1 className="text-lg font-semibold text-ink-50">Facebook Post</h1>
          <p className="mt-0.5 text-xs text-ink-400">
            {pageLabel} · {user?.displayName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-navy-600 p-0.5">
            <button
              type="button"
              onClick={() => setMode('blank')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                mode === 'blank'
                  ? 'bg-gold-500 text-navy-950'
                  : 'text-ink-300 hover:text-ink-50'
              }`}
            >
              Blank post
            </button>
            <button
              type="button"
              onClick={() => setMode('album')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                mode === 'album'
                  ? 'bg-gold-500 text-navy-950'
                  : 'text-ink-300 hover:text-ink-50'
              }`}
            >
              From album
            </button>
          </div>
          {!configured && isAdmin ? (
            <Button size="sm" variant="secondary" onClick={() => setView('settings')}>
              Connect Page
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        {/* ── Composer ── */}
        <section className="flex min-h-0 flex-col border-r border-navy-700 bg-navy-900">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">

            {/* Page identity */}
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt=""
                className="h-11 w-11 shrink-0 rounded-full bg-navy-850 object-contain"
              />
              <div>
                <div className="font-semibold text-ink-50">
                  {settings.facebook.pageName || 'Brigada Onse Sun Valley Fire and Rescue'}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-400">
                  Public · {mode === 'blank' ? 'Text post' : 'From album'}
                </div>
              </div>
            </div>

            {/* Album picker (album mode only) */}
            {mode === 'album' ? (
              <Field label="Album source">
                <Select
                  value={albumId}
                  onChange={(e) => setAlbumId(e.target.value)}
                >
                  <option value="">Use current Studio session</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} · {formatDisplayDate(a.date)} · {a.photoCount} photos
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {/* Post text */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                  Post text
                </span>
                {mode === 'album' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (activeAlbum) {
                        setCaption(buildFacebookCaption(captionSourceFromAlbum(activeAlbum)))
                      } else {
                        setCaption(buildFacebookCaption(captionSourceFromMetadata(session.metadata)))
                      }
                    }}
                  >
                    Apply template
                  </Button>
                ) : null}
              </div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[260px] w-full font-sans text-sm leading-relaxed lg:min-h-[340px]"
                placeholder="Write your post…"
              />
            </div>

            {/* Photos — blank mode: optional drag-drop */}
            {mode === 'blank' ? (
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                    Photos{' '}
                    <span className="font-normal text-ink-500">
                      ({manualPhotos.length} · optional)
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileRef.current?.click()}
                  >
                    Add photos
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addManualFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </div>

                {manualPhotos.length === 0 ? (
                  <div
                    ref={dropRef}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      addManualFiles(Array.from(e.dataTransfer.files))
                    }}
                    onClick={() => fileRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-sm transition-colors ${
                      dragging
                        ? 'border-gold-500 bg-gold-500/5 text-gold-400'
                        : 'border-navy-600 bg-navy-850 text-ink-400 hover:border-navy-500 hover:text-ink-200'
                    }`}
                  >
                    <span className="mb-1 text-2xl">🖼</span>
                    <span>Drop photos here or click to add</span>
                    <span className="mt-1 text-xs text-ink-500">Optional — post will publish without photos if left empty</span>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      addManualFiles(Array.from(e.dataTransfer.files))
                    }}
                    className={`rounded-xl border-2 border-dashed p-2 transition-colors ${
                      dragging ? 'border-gold-500 bg-gold-500/5' : 'border-navy-700'
                    }`}
                  >
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                      {manualPhotos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="group relative overflow-hidden rounded-lg border border-navy-600"
                        >
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="aspect-square w-full object-cover"
                          />
                          <span className="absolute left-1 top-1 rounded bg-navy-950/80 px-1 text-[10px] text-ink-200">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            className="absolute right-1 top-1 rounded bg-navy-950/80 px-1.5 py-0.5 text-xs text-alert-400 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => removeManual(photo.id)}
                            aria-label="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Album mode: photo selector */
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                    Album photos ({selected.length} selected)
                  </span>
                  {albumId ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(albumPics.map((p) => p.id))}>All</Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelected([])}>None</Button>
                    </div>
                  ) : null}
                </div>
                {!albumId ? (
                  <div className="rounded-xl border border-navy-700 bg-navy-850 px-4 py-4 text-sm text-ink-300">
                    Select an album above to attach photographs, or switch to{' '}
                    <strong className="text-ink-50">Blank post</strong> to write freely.
                    {canEdit ? (
                      <div className="mt-3">
                        <Button size="sm" variant="secondary" onClick={() => setView('studio')}>
                          Open Studio
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : albumPics.length === 0 ? (
                  <p className="text-sm text-ink-400">Loading photographs…</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                    {albumPics.map((photo, index) => {
                      const on = selected.includes(photo.id)
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => toggleAlbumPhoto(photo.id)}
                          className={`relative overflow-hidden rounded-lg border transition-all ${
                            on
                              ? 'border-gold-500 ring-1 ring-gold-500'
                              : 'border-navy-600 opacity-50 hover:opacity-75'
                          }`}
                          aria-pressed={on}
                        >
                          <img
                            src={photo.thumbnailUrl}
                            alt={`Photo ${index + 1}`}
                            className="aspect-square w-full object-cover"
                          />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Status messages */}
            {progress ? (
              <p className="animate-pulse-soft text-sm text-gold-500">{progress}</p>
            ) : null}
            {error ? (
              <p className="rounded-xl border border-alert-500/40 bg-alert-500/10 px-4 py-2.5 text-sm text-alert-400">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="rounded-xl border border-ok-500/40 bg-ok-500/10 px-4 py-2.5 text-sm text-ok-400">
                {success}
              </p>
            ) : null}
          </div>

          {/* Footer actions */}
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-navy-700 bg-navy-900 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void navigator.clipboard.writeText(caption)}
                disabled={!caption.trim()}
              >
                Copy caption
              </Button>
              <Button variant="ghost" onClick={() => void copyAndOpenFacebook()}>
                Open Facebook
              </Button>
            </div>
            <Button
              variant="primary"
              className="min-w-[140px]"
              disabled={busy || !configured}
              onClick={() => void publish()}
            >
              {busy ? 'Posting…' : 'Post to Page'}
            </Button>
          </footer>
        </section>

        {/* ── Side panel ── */}
        <aside className="flex min-h-0 flex-col overflow-y-auto bg-navy-950 p-4 sm:p-5">
          {mode === 'blank' ? (
            <>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Blank post
              </h3>
              <div className="mb-4 rounded-xl border border-navy-700 bg-navy-900 p-3.5 text-xs leading-relaxed text-ink-300">
                Write anything in the post text area. Photos are optional — you
                can publish a text-only post or attach up to 10 photos.
              </div>
            </>
          ) : (
            <>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                Album details
              </h3>
              <dl className="mb-4 overflow-hidden rounded-xl border border-navy-700 bg-navy-900">
                {albumPreview.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-3 border-b border-navy-800 px-3.5 py-2.5 text-sm last:border-0"
                  >
                    <dt className="text-ink-400">{k}</dt>
                    <dd className="max-w-[60%] text-right font-medium text-ink-100">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mb-4 rounded-xl border border-navy-700 bg-navy-900 p-3.5 text-xs leading-relaxed text-ink-300">
                Pulls details from the selected Gallery album. Use{' '}
                <strong className="text-ink-50">Apply template</strong> to
                rebuild the official caption.
              </div>
            </>
          )}

          {/* Connection status */}
          {configured ? (
            <div className="rounded-xl border border-ok-500/30 bg-ok-500/5 p-3.5 text-sm text-ink-300">
              Connected to <strong className="text-ink-50">{pageLabel}</strong>
            </div>
          ) : (
            <div className="rounded-xl border border-warn-500/40 bg-warn-500/10 p-3.5 text-sm text-ink-100">
              Facebook Page not connected.{' '}
              {isAdmin ? (
                <button
                  type="button"
                  className="font-semibold text-gold-500 hover:underline"
                  onClick={() => setView('settings')}
                >
                  Connect in Settings →
                </button>
              ) : (
                'Ask an admin to connect it in Settings.'
              )}
            </div>
          )}

          <div className="mt-auto pt-6 text-[11px] text-ink-500">
            {postBlobs.length} photo{postBlobs.length === 1 ? '' : 's'} ready ·{' '}
            {caption.length} characters
          </div>
        </aside>
      </div>
    </div>
  )
}
