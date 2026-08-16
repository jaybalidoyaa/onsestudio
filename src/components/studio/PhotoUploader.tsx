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
      <div className="mb-4" aria-hidden>
        <img
          src="/logo.png"
          alt=""
          className="mx-auto h-20 w-20 object-contain"
          width={80}
          height={80}
        />
      </div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink-50">
        Brigada Onse SVFAR Studio
      </h1>
      <p className="mb-4 max-w-lg text-sm leading-relaxed text-ink-300">
        Upload response and event photographs, apply our official photo frames,
        prepare each photograph individually, and organize completed images into
        albums. One platform. One standard. Every moment documented.
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
      <p className="mt-6 max-w-md text-[11px] text-ink-400">
        Brigada Onse SVFAR Studio — preserving the moments, documenting the
        mission.
      </p>
    </div>
  )
}
