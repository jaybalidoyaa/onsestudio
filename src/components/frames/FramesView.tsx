import { useEffect, useRef, useState } from 'react'
import { useStudio } from '../../store/StudioContext'
import { Button } from '../ui/Button'
import { Field, Input, Panel } from '../ui/Panel'

export function FramesView() {
  const {
    frames,
    session,
    uploadFrame,
    useFrame,
    deleteLibraryFrame,
    renameFrame,
    setView,
  } = useStudio()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-navy-700 bg-navy-900 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-50">Frame Library</h1>
            <p className="mt-0.5 text-sm text-ink-400">
              Upload and reuse documentation frame overlays
            </p>
          </div>
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            Upload Frame
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {/* Drop zone */}
        <div
          className={`mb-5 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging
              ? 'border-gold-500 bg-gold-500/5'
              : 'border-navy-600 bg-navy-900/40 hover:border-navy-500 hover:bg-navy-900/60'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) void uploadFrame(file)
          }}
        >
          <p className="mb-1.5 text-sm font-medium text-ink-200">
            Drag & drop a frame PNG with transparency
          </p>
          <p className="text-xs text-ink-400">
            PNG preferred · JPG · WEBP · SVG
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadFrame(file)
              e.target.value = ''
            }}
          />
        </div>

        {frames.length === 0 ? (
          <div className="rounded-xl border border-navy-700 bg-navy-900 p-10 text-center">
            <h2 className="mb-2 font-semibold text-ink-50">No frames yet</h2>
            <p className="mb-5 text-sm leading-relaxed text-ink-400">
              Your uploaded frames are stored locally and can be reused across
              sessions.
            </p>
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>
              Upload your first frame
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {frames.map((frame) => (
              <FrameCard
                key={frame.id}
                name={frame.name}
                filename={frame.filename}
                thumb={frame.thumbnailUrl}
                preview={frame.objectUrl}
                width={frame.width}
                height={frame.height}
                transparent={frame.hasTransparency}
                active={frame.id === session.activeFrameId}
                onUse={() => {
                  useFrame(frame.id)
                  setView('studio')
                }}
                onDelete={() => {
                  if (confirm(`Delete frame "${frame.name}"?`)) {
                    void deleteLibraryFrame(frame.id)
                  }
                }}
                onRename={(name) => void renameFrame(frame.id, name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FrameCard({
  name,
  filename,
  thumb,
  preview,
  width,
  height,
  transparent,
  active,
  onUse,
  onDelete,
  onRename,
}: {
  name: string
  filename: string
  thumb: string
  preview: string
  width: number
  height: number
  transparent: boolean
  active: boolean
  onUse: () => void
  onDelete: () => void
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  useEffect(() => setDraft(name), [name])

  return (
    <Panel
      className={active ? 'ring-2 ring-gold-500 ring-offset-1 ring-offset-navy-950' : ''}
      title={active ? '★ Active Frame' : undefined}
    >
      {/* Preview */}
      <div className="mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-navy-700 bg-[linear-gradient(45deg,#1e2a3a_25%,transparent_25%),linear-gradient(-45deg,#1e2a3a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e2a3a_75%),linear-gradient(-45deg,transparent_75%,#1e2a3a_75%)] bg-[length:12px_12px] bg-navy-950">
        <img
          src={preview || thumb}
          alt={name}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      {/* Name (inline editable) */}
      {editing ? (
        <Field label="Name">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onRename(draft.trim() || name)
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRename(draft.trim() || name)
                setEditing(false)
              }
              if (e.key === 'Escape') setEditing(false)
            }}
            autoFocus
          />
        </Field>
      ) : (
        <button
          type="button"
          className="mb-1 text-left text-sm font-semibold text-ink-50 hover:text-gold-400"
          onClick={() => setEditing(true)}
          title="Click to rename"
        >
          {name}
        </button>
      )}

      {/* Meta */}
      <p className="mb-0.5 truncate text-xs text-ink-400">{filename}</p>
      <p className="mb-3.5 text-xs text-ink-400">
        {width}×{height} ·{' '}
        {transparent ? (
          <span className="text-ok-400">Has transparency</span>
        ) : (
          'Opaque'
        )}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="primary" onClick={onUse}>
          Use in Studio
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Rename
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </Panel>
  )
}
