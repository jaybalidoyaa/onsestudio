import { useCallback, useRef, useState } from 'react'
import { useStudio } from '../../store/StudioContext'
import { Button } from '../ui/Button'

export function PhotoUploader({ compact = false }: { compact?: boolean }) {
  const { addPhotos } = useStudio()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (files?.length) void addPhotos(files)
    },
    [addPhotos],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      onFiles(e.dataTransfer.files)
    },
    [onFiles],
  )

  if (compact) {
    return (
      <>
        <input
          id="photo-file-input"
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic"
          multiple
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
        >
          Upload Photos
        </Button>
      </>
    )
  }

  return (
    <div
      className={`flex h-full min-h-[320px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 text-center transition-colors ${
        dragging
          ? 'border-gold-500 bg-gold-500/5'
          : 'border-navy-600 bg-navy-900/40'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        id="photo-file-input"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="mb-4 text-gold-500" aria-hidden>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h3l2-2h6l2 2h3v12H4V7z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink-50">
        Photo Documentation Studio
      </h1>
      <p className="mb-6 max-w-md text-sm text-ink-300">
        Create professional emergency-response documentation from your
        photographs. Upload photos, apply your frame, and build an album.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="primary" size="lg" onClick={() => inputRef.current?.click()}>
          Upload Photos
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => document.getElementById('frame-file-input')?.click()}
        >
          Upload Frame
        </Button>
      </div>
      <p className="mt-4 text-xs text-ink-400">
        JPG, PNG, WEBP{dragging ? ' — drop to upload' : ' — or drag & drop'}
      </p>
    </div>
  )
}
