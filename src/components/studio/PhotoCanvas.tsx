import { useEffect, useMemo, useState } from 'react'
import { useStudio } from '../../store/StudioContext'
import { renderPreviewDataUrl } from '../../lib/compositor'
import { applyCssFilters, revokeUrl } from '../../lib/image'
import { padPhotoNumber } from '../../lib/utils'
import { Button } from '../ui/Button'

export function PhotoCanvas() {
  const {
    session,
    activeFrame,
    selectPhoto,
    rotateActive,
    setPreviewMode,
  } = useStudio()

  const photos = session.photos
  const activeIndex = photos.findIndex((p) => p.id === session.activePhotoId)
  const active = activeIndex >= 0 ? photos[activeIndex] : null

  const [zoom, setZoom] = useState(1)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [slider, setSlider] = useState(50)
  const [rendering, setRendering] = useState(false)

  useEffect(() => {
    setZoom(1)
  }, [active?.id])

  useEffect(() => {
    let cancelled = false
    let generated: string | null = null

    async function run() {
      if (!active || session.previewMode === 'original') {
        setPreviewUrl(null)
        return
      }
      setRendering(true)
      try {
        const url = await renderPreviewDataUrl({
          photoUrl: active.objectUrl,
          frameUrl: activeFrame?.objectUrl ?? null,
          width: active.width,
          height: active.height,
          adjustments: active.adjustments,
          frameConfig: session.frameConfig,
          includeSafeArea: session.frameConfig.showSafeArea,
          quality: 90,
        })
        if (cancelled) {
          revokeUrl(url)
          return
        }
        generated = url
        setPreviewUrl((prev) => {
          revokeUrl(prev)
          return url
        })
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    const t = window.setTimeout(() => void run(), 120)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      if (generated) revokeUrl(generated)
    }
  }, [
    active,
    activeFrame?.objectUrl,
    session.frameConfig,
    session.previewMode,
  ])

  const filter = useMemo(
    () => (active ? applyCssFilters(active.adjustments) : undefined),
    [active],
  )

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-400">
        Select a photograph to preview
      </div>
    )
  }

  const showFramed =
    session.previewMode === 'framed' ||
    session.previewMode === 'side-by-side' ||
    session.previewMode === 'before-after'

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-navy-950">
      <div className="flex flex-wrap items-center gap-2 border-b border-navy-700 bg-navy-900 px-3 py-2">
        <span className="text-xs font-semibold text-ink-200">
          PHOTO {padPhotoNumber(activeIndex, photos.length)} OF {photos.length}
        </span>
        <div className="mx-2 h-4 w-px bg-navy-600" />
        <Button
          size="sm"
          variant="ghost"
          disabled={activeIndex <= 0}
          onClick={() => selectPhoto(photos[activeIndex - 1].id)}
        >
          Prev
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={activeIndex >= photos.length - 1}
          onClick={() => selectPhoto(photos[activeIndex + 1].id)}
        >
          Next
        </Button>
        <div className="mx-2 h-4 w-px bg-navy-600" />
        <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
          Zoom +
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
          Zoom −
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setZoom(1)}>
          Fit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => rotateActive(-1)}>
          Rotate L
        </Button>
        <Button size="sm" variant="ghost" onClick={() => rotateActive(1)}>
          Rotate R
        </Button>
        <div className="mx-2 h-4 w-px bg-navy-600" />
        {(
          [
            ['original', 'Original'],
            ['framed', 'Framed'],
            ['side-by-side', 'Side by Side'],
            ['before-after', 'Before / After'],
          ] as const
        ).map(([mode, label]) => (
          <Button
            key={mode}
            size="sm"
            variant={session.previewMode === mode ? 'gold' : 'ghost'}
            onClick={() => setPreviewMode(mode)}
          >
            {label}
          </Button>
        ))}
        {rendering ? (
          <span className="ml-auto text-xs text-gold-500 animate-pulse-soft">
            Updating preview…
          </span>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto p-4">
        {session.previewMode === 'side-by-side' ? (
          <div className="mx-auto grid h-full max-w-6xl grid-cols-2 gap-3">
            <PreviewPane
              label="Original"
              src={active.objectUrl}
              zoom={zoom}
              filter={filter}
              rotation={active.adjustments.rotation}
            />
            <PreviewPane
              label="Framed"
              src={previewUrl ?? active.processedUrl ?? active.objectUrl}
              zoom={zoom}
            />
          </div>
        ) : session.previewMode === 'before-after' ? (
          <div className="relative mx-auto flex h-full max-w-4xl items-center justify-center">
            <div
              className="relative overflow-hidden rounded-md border border-navy-700 bg-navy-900"
              style={{ maxHeight: '100%' }}
            >
              <img
                src={active.objectUrl}
                alt="Original"
                className="block max-h-[calc(100vh-12rem)] w-auto select-none"
                style={{
                  transform: `scale(${zoom}) rotate(${active.adjustments.rotation}deg)`,
                  filter,
                }}
                draggable={false}
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${slider}%` }}
              >
                <img
                  src={previewUrl ?? active.processedUrl ?? active.objectUrl}
                  alt="Framed"
                  className="block max-h-[calc(100vh-12rem)] w-auto max-w-none select-none"
                  style={{
                    height: '100%',
                    width: 'auto',
                    maxWidth: 'none',
                    transform: `scale(${zoom})`,
                  }}
                  draggable={false}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={slider}
                onChange={(e) => setSlider(Number(e.target.value))}
                className="absolute bottom-3 left-1/2 w-1/2 -translate-x-1/2"
                aria-label="Before after slider"
              />
              <div
                className="pointer-events-none absolute inset-y-0 w-0.5 bg-gold-500"
                style={{ left: `${slider}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <PreviewPane
              label={showFramed && session.previewMode === 'framed' ? 'Framed Preview' : 'Original'}
              src={
                session.previewMode === 'original'
                  ? active.objectUrl
                  : previewUrl ?? active.processedUrl ?? active.objectUrl
              }
              zoom={zoom}
              filter={session.previewMode === 'original' ? filter : undefined}
              rotation={
                session.previewMode === 'original'
                  ? active.adjustments.rotation
                  : 0
              }
              large
            />
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewPane({
  label,
  src,
  zoom,
  filter,
  rotation = 0,
  large,
}: {
  label: string
  src: string
  zoom: number
  filter?: string
  rotation?: number
  large?: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
        {label}
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-md border border-navy-700 bg-[linear-gradient(45deg,#111a26_25%,transparent_25%),linear-gradient(-45deg,#111a26_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#111a26_75%),linear-gradient(-45deg,transparent_75%,#111a26_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-navy-900">
        <img
          src={src}
          alt={label}
          className={`block select-none object-contain ${large ? 'max-h-[calc(100vh-12rem)]' : 'max-h-full'} max-w-full`}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            filter,
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}
