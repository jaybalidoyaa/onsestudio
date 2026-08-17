import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildFacebookCaption,
  captionSourceFromAlbum,
  captionSourceFromMetadata,
  isMedicalIncident,
  type CaptionSource,
} from '../../lib/caption'
import { postPhotosToFacebookPage } from '../../lib/facebook'
import { createId } from '../../lib/utils'
import {
  ALARM_TYPES,
  CALLSIGN_ROSTER,
  RESPONDING_UNITS,
} from '../../lib/rosters'
import { createDefaultMetadata } from '../../types'
import { useAuth } from '../../store/AuthContext'
import { useStudio } from '../../store/StudioContext'
import { formatDisplayDate, formatDisplayTime } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Panel'
import { MultiSelect } from '../ui/MultiSelect'

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
  const [blank, setBlank] = useState<CaptionSource>(() => {
    const d = createDefaultMetadata()
    return {
      date: d.date,
      time: d.time,
      address: '',
      alarm: '',
      unit: '',
      callsign: '',
    }
  })
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const configured =
    Boolean(settings.facebook.pageId.trim()) &&
    Boolean(settings.facebook.pageAccessToken.trim())

  const activeAlbum = albums.find((a) => a.id === albumId) ?? null
  const albumPics = albumId ? albumPhotos[albumId] ?? [] : []

  useEffect(() => {
    if (mode === 'album' && albumId) void loadAlbumPhotos(albumId)
  }, [mode, albumId, loadAlbumPhotos])

  useEffect(() => {
    if (mode === 'blank') {
      setCaption(buildFacebookCaption(blank))
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
  }, [mode, blank, activeAlbum, albumPhotos, session.metadata])

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

  const addManualFiles = (files: FileList | null) => {
    if (!files?.length) return
    const next: ManualPhoto[] = []
    for (const file of Array.from(files)) {
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

  const refreshCaption = () => {
    if (mode === 'blank') {
      setCaption(buildFacebookCaption(blank))
    } else if (activeAlbum) {
      setCaption(buildFacebookCaption(captionSourceFromAlbum(activeAlbum)))
    } else {
      setCaption(buildFacebookCaption(captionSourceFromMetadata(session.metadata)))
    }
  }

  const publish = async () => {
    setError('')
    setSuccess('')
    if (!configured) {
      setError('Connect your Facebook Page in Settings before posting.')
      return
    }
    if (!postBlobs.length) {
      setError(
        mode === 'blank'
          ? 'Add at least one photograph to your blank post.'
          : 'Select at least one photograph from an album.',
      )
      return
    }
    setBusy(true)
    setProgress('Resolving Page Access Token…')
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
        `Posted ${mode} (${postBlobs.length} photos) to ${result.pageName || 'Facebook Page'}`,
      )
      setProgress('')
      setSuccess(
        result.postId
          ? `Posted to ${result.pageName || 'Facebook Page'}. Post ID: ${result.postId}`
          : `Posted ${postBlobs.length} photo(s).`,
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
      setSuccess(
        'Caption copied. Facebook opened — paste and attach photos on the Page.',
      )
    } catch {
      setError('Could not copy caption.')
    }
  }

  const pageLabel =
    settings.facebook.pageName ||
    settings.facebook.pageId ||
    'Facebook Page'

  const fieldPreview: [string, string][] =
    mode === 'blank'
      ? [
          ['Date', blank.date ? formatDisplayDate(blank.date) : '—'],
          ['Time', blank.time ? formatDisplayTime(blank.time) : '—'],
          ['Address', blank.address || '—'],
          ['Alarm', blank.alarm || '—'],
          ['Unit', blank.unit || '—'],
          ['Callsign', blank.callsign || '—'],
          [
            'Template',
            isMedicalIncident(blank.alarm) ? 'Medical / Trauma' : 'Fire Response',
          ],
        ]
      : activeAlbum
        ? [
            ['Date', formatDisplayDate(activeAlbum.date)],
            ['Address', activeAlbum.address || activeAlbum.location || '—'],
            ['Alarm', activeAlbum.alarm || '—'],
            ['Unit', activeAlbum.unit || activeAlbum.respondingUnits || '—'],
            [
              'Callsign',
              activeAlbum.callsign || activeAlbum.documentationOfficer || '—',
            ],
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

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        {/* Composer — fills height */}
        <section className="flex min-h-0 flex-col border-r border-navy-700 bg-navy-900">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex items-start gap-3">
              <img
                src="/logo.png"
                alt=""
                className="h-11 w-11 rounded-full object-contain bg-navy-850"
              />
              <div>
                <div className="font-semibold text-ink-50">
                  {settings.facebook.pageName ||
                    'Brigada Onse Sun Valley Fire and Rescue'}
                </div>
                <div className="mt-1 text-[11px] text-ink-400">
                  Public ·{' '}
                  {mode === 'blank'
                    ? 'Manual blank post'
                    : 'Album / Studio source'}
                </div>
              </div>
            </div>

            {mode === 'album' ? (
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
            ) : (
              <div className="space-y-3 rounded-xl border border-navy-600 bg-navy-850 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
                  Manual incident details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date">
                    <Input
                      type="date"
                      value={blank.date}
                      onChange={(e) =>
                        setBlank((b) => ({ ...b, date: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Time">
                    <Input
                      type="time"
                      value={blank.time || ''}
                      onChange={(e) =>
                        setBlank((b) => ({ ...b, time: e.target.value }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Location / Address">
                  <Input
                    value={blank.address}
                    onChange={(e) =>
                      setBlank((b) => ({ ...b, address: e.target.value }))
                    }
                    placeholder="Sun Valley, Parañaque City"
                  />
                </Field>
                <Field label="Incident Type / Alarm">
                  <Select
                    value={
                      (ALARM_TYPES as readonly string[]).includes(blank.alarm)
                        ? blank.alarm
                        : ''
                    }
                    onChange={(e) =>
                      setBlank((b) => ({ ...b, alarm: e.target.value }))
                    }
                  >
                    <option value="">Select…</option>
                    {ALARM_TYPES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                  {blank.alarm ? (
                    <p className="mt-1 text-[10px] text-ink-400">
                      Caption template:{' '}
                      <span className="text-gold-500">
                        {isMedicalIncident(blank.alarm)
                          ? 'Medical / Trauma (smart narrative)'
                          : 'Fire Response'}
                      </span>
                    </p>
                  ) : null}
                </Field>
                <Field label="Responding Unit">
                  <MultiSelect
                    options={RESPONDING_UNITS}
                    value={blank.unit}
                    onChange={(unit) => setBlank((b) => ({ ...b, unit }))}
                    placeholder="Select units…"
                    searchable={false}
                    maxVisible={5}
                  />
                </Field>
                <Field label="Callsign">
                  <MultiSelect
                    options={CALLSIGN_ROSTER}
                    value={blank.callsign}
                    onChange={(callsign) =>
                      setBlank((b) => ({ ...b, callsign }))
                    }
                    placeholder="Select callsigns…"
                    searchable
                    maxVisible={6}
                  />
                </Field>
              </div>
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                  Post text
                </span>
                <Button size="sm" variant="ghost" onClick={refreshCaption}>
                  Apply template
                </Button>
              </div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[280px] w-full font-sans text-sm leading-relaxed lg:min-h-[360px]"
                placeholder="Write your post…"
              />
            </div>

            {mode === 'blank' ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                    Photos ({manualPhotos.length})
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
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-md border border-dashed border-navy-600 bg-navy-850 px-4 py-10 text-sm text-ink-400 hover:border-gold-500/40 hover:text-ink-200"
                  >
                    Drop or click to add photographs
                  </button>
                ) : (
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
                        <span className="absolute left-1 top-1 rounded bg-navy-950/80 px-1 text-[10px]">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded bg-navy-950/80 px-1.5 text-xs text-alert-500 opacity-0 group-hover:opacity-100"
                          onClick={() => removeManual(photo.id)}
                          aria-label="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                    Album photos ({selected.length} selected)
                  </span>
                  {albumId ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setSelected(albumPics.map((p) => p.id))
                        }
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
                  ) : null}
                </div>
                {!albumId ? (
                  <div className="rounded-md border border-navy-700 bg-navy-850 px-3 py-3 text-xs text-ink-300">
                    Select an album to attach processed photographs, or switch
                    to <strong className="text-ink-50">Blank post</strong> to
                    upload photos manually.
                    {canEdit ? (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setView('studio')}
                        >
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
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {progress ? (
              <p className="text-sm text-gold-500 animate-pulse-soft">{progress}</p>
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

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-navy-700 bg-navy-900 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void navigator.clipboard.writeText(caption)}
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
              disabled={busy || !postBlobs.length || !configured}
              onClick={() => void publish()}
            >
              {busy ? 'Posting…' : 'Post to Page'}
            </Button>
          </footer>
        </section>

        {/* Side panel — full height */}
        <aside className="flex min-h-0 flex-col overflow-y-auto bg-navy-950 p-4 sm:p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-500">
            Caption fields
          </h3>
          <dl className="mb-4 overflow-hidden rounded-xl border border-navy-700 bg-navy-900">
            {fieldPreview.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-3 border-b border-navy-800 px-3.5 py-2.5 text-sm last:border-0"
              >
                <dt className="text-ink-400">{k}</dt>
                <dd className="max-w-[60%] text-right font-medium text-ink-100">
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mb-4 rounded-xl border border-navy-700 bg-navy-900 p-3.5 text-xs leading-relaxed text-ink-300">
            {mode === 'blank' ? (
              <>
                Fill details and add photos here. Use{' '}
                <strong className="text-ink-50">Apply template</strong> to
                rebuild the official caption anytime.
              </>
            ) : (
              <>
                Pulls details from a Gallery album or the current Studio session.
                Switch to <strong className="text-ink-50">Blank post</strong>{' '}
                for a fully manual draft.
              </>
            )}
          </div>

          {configured ? (
            <div className="rounded-xl border border-ok-500/30 bg-ok-500/5 p-3.5 text-sm text-ink-300">
              Connected to{' '}
              <strong className="text-ink-50">{pageLabel}</strong>
            </div>
          ) : (
            <div className="rounded-xl border border-warn-500/40 bg-warn-500/10 p-3.5 text-sm text-ink-100">
              Facebook Page is not connected. Ask an admin to add credentials in
              Settings.
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
