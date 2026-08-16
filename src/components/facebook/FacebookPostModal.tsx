import { useEffect, useMemo, useState } from 'react'
import { buildFacebookCaption } from '../../lib/caption'
import { postPhotosToFacebookPage, verifyFacebookPage } from '../../lib/facebook'
import { useAuth } from '../../store/AuthContext'
import type { Album, AlbumPhoto } from '../../types'
import { Button } from '../ui/Button'
import { Field, Textarea } from '../ui/Panel'

interface FacebookPostModalProps {
  album: Album
  photos: AlbumPhoto[]
  onClose: () => void
}

export function FacebookPostModal({
  album,
  photos,
  onClose,
}: FacebookPostModalProps) {
  const { settings, saveFacebookSettings, isAdmin, logActivity } = useAuth()
  const [caption, setCaption] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const configured =
    Boolean(settings.facebook.pageId.trim()) &&
    Boolean(settings.facebook.pageAccessToken.trim())

  useEffect(() => {
    setCaption(
      buildFacebookCaption(album, settings.facebook.defaultHashtags),
    )
    setSelected(photos.slice(0, Math.min(10, photos.length)).map((p) => p.id))
  }, [album, photos, settings.facebook.defaultHashtags])

  const selectedPhotos = useMemo(
    () => photos.filter((p) => selected.includes(p.id)),
    [photos, selected],
  )

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption)
    setSuccess('Caption copied to clipboard.')
  }

  const publish = async () => {
    setError('')
    setSuccess('')
    if (!configured) {
      setError('Connect your Facebook Page in Settings before posting.')
      return
    }
    if (!selectedPhotos.length) {
      setError('Select at least one photograph.')
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

      const blobs = selectedPhotos.map((p) => p.processedBlob)
      const result = await postPhotosToFacebookPage({
        pageId: settings.facebook.pageId,
        accessToken: settings.facebook.pageAccessToken,
        caption,
        photos: blobs,
        onProgress: (current, total) =>
          setProgress(`Uploading photograph ${current} of ${total}…`),
      })

      await logActivity(
        'facebook.post',
        `Posted “${album.title}” (${selectedPhotos.length} photos) to ${page.name || 'Facebook Page'}`,
      )
      setProgress('')
      setSuccess(
        result.postId
          ? `Posted to ${page.name}. Post ID: ${result.postId}`
          : `Posted ${selectedPhotos.length} photo(s) to ${page.name}.`,
      )
    } catch (err) {
      setProgress('')
      setError(err instanceof Error ? err.message : 'Unable to post to Facebook.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-navy-950/85 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-navy-600 bg-navy-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-navy-700 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-500">
              Post to Facebook Page
            </h2>
            <p className="text-xs text-ink-400">
              {settings.facebook.pageName ||
                settings.facebook.pageId ||
                'Page not connected'}{' '}
              · {album.title}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
            Close
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {!configured ? (
            <div className="rounded-md border border-warn-500/40 bg-warn-500/10 px-3 py-2 text-sm text-ink-100">
              Facebook Page is not connected. An administrator must add the Page
              ID and Page Access Token under Settings → Facebook.
            </div>
          ) : null}

          <Field label="Caption">
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                Photographs ({selected.length} selected)
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(photos.map((p) => p.id))}
                >
                  All
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                  None
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {photos.map((photo, index) => {
                const on = selected.includes(photo.id)
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => toggle(photo.id)}
                    className={`relative overflow-hidden rounded border ${
                      on ? 'border-gold-500' : 'border-navy-600 opacity-60'
                    }`}
                    aria-pressed={on}
                  >
                    <img
                      src={photo.thumbnailUrl}
                      alt={`Photo ${index + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                    <span className="absolute left-1 top-1 rounded bg-navy-950/80 px-1 text-[10px] text-ink-100">
                      {index + 1}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-ink-400">
              Tip: Facebook multi-photo posts work best with up to 10 images.
            </p>
          </div>

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

        <footer className="flex flex-wrap justify-end gap-2 border-t border-navy-700 px-4 py-3">
          <Button variant="secondary" onClick={() => void copyCaption()} disabled={busy}>
            Copy Caption
          </Button>
          <Button
            variant="primary"
            onClick={() => void publish()}
            disabled={busy || !selected.length}
          >
            {busy ? 'Posting…' : 'Post to Facebook Page'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
