import { useRef, useState } from 'react'
import { useStudio } from '../../store/StudioContext'
import { Button } from '../ui/Button'
import { Field, Input, Panel, Select, StatusBadge } from '../ui/Panel'

export function StudioPanel() {
  const {
    session,
    activeFrame,
    frames,
    updateMetadata,
    updateFrameConfig,
    updateExportSettings,
    updateAdjustments,
    uploadFrame,
    useFrame,
    removeActiveFrame,
    applyFrame,
    exportCurrent,
    exportSelected,
    exportAll,
    createAlbumFromSession,
    panelOpen,
    setPanelOpen,
  } = useStudio()

  const frameInputRef = useRef<HTMLInputElement>(null)
  const [frameDragging, setFrameDragging] = useState(false)
  const active = session.photos.find((p) => p.id === session.activePhotoId)
  const processed = session.photos.filter((p) => p.status === 'processed').length
  const selected = session.photos.filter((p) => p.selected).length
  const ready = session.photos.filter((p) => p.status !== 'error').length

  const panel = (
    <div className="flex h-full w-full flex-col gap-3 overflow-y-auto p-3">
      <Panel title="Event Information">
        <p className="mb-3 text-[11px] text-ink-400">
          These fields fill the official Facebook incident caption when you post.
        </p>
        <div className="flex flex-col gap-3">
          <Field label="Date">
            <Input
              type="date"
              value={session.metadata.date}
              onChange={(e) => updateMetadata({ date: e.target.value })}
            />
          </Field>
          <Field label="Location / Address">
            <Input
              value={session.metadata.address}
              onChange={(e) => updateMetadata({ address: e.target.value })}
              placeholder="Sun Valley, Parañaque City"
            />
          </Field>
          <Field label="Incident Type / Alarm" hint='Example: 10-70 1st Alarm'>
            <Input
              value={session.metadata.alarm}
              onChange={(e) => updateMetadata({ alarm: e.target.value })}
              placeholder="10-70 1st Alarm"
            />
          </Field>
          <Field label="Responding Unit" hint="Example: Sun Valley Engine">
            <Input
              value={session.metadata.unit}
              onChange={(e) => updateMetadata({ unit: e.target.value })}
              placeholder="Sun Valley Engine"
            />
          </Field>
          <Field label="Responding Personnel / Callsign" hint="Example: Finest 12">
            <Input
              value={session.metadata.callsign}
              onChange={(e) => updateMetadata({ callsign: e.target.value })}
              placeholder="Finest 12"
            />
          </Field>
          <Field label="Time (optional)">
            <Input
              type="time"
              value={session.metadata.time}
              onChange={(e) => updateMetadata({ time: e.target.value })}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Frame Overlay"
        actions={
          <Button size="sm" variant="primary" onClick={() => frameInputRef.current?.click()}>
            Upload Frame
          </Button>
        }
      >
        <input
          id="frame-file-input"
          ref={frameInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadFrame(file)
            e.target.value = ''
          }}
        />

        <div
          className={`mb-3 rounded-md border border-dashed p-3 text-center text-xs transition-colors ${
            frameDragging
              ? 'border-gold-500 bg-gold-500/5 text-gold-500'
              : 'border-navy-600 text-ink-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setFrameDragging(true)
          }}
          onDragLeave={() => setFrameDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setFrameDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) void uploadFrame(file)
          }}
        >
          Drag & drop your frame PNG here
        </div>

        {activeFrame ? (
          <div className="mb-3 overflow-hidden rounded-md border border-navy-600 bg-navy-900">
            <div className="flex aspect-[16/10] items-center justify-center bg-[linear-gradient(45deg,#1e2a3a_25%,transparent_25%),linear-gradient(-45deg,#1e2a3a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e2a3a_75%),linear-gradient(-45deg,transparent_75%,#1e2a3a_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0]">
              <img
                src={activeFrame.objectUrl}
                alt={activeFrame.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="space-y-1 border-t border-navy-700 p-2 text-xs text-ink-300">
              <div className="font-medium text-ink-100">{activeFrame.name}</div>
              <div>{activeFrame.filename}</div>
              <div>
                {activeFrame.width}×{activeFrame.height} ·{' '}
                {activeFrame.mimeType.replace('image/', '').toUpperCase()}
              </div>
              <div>
                Transparency:{' '}
                {activeFrame.hasTransparency ? 'Detected' : 'Not detected'}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => frameInputRef.current?.click()}
                >
                  Replace
                </Button>
                <Button size="sm" variant="ghost" onClick={removeActiveFrame}>
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mb-3 text-xs text-ink-400">
            Upload your organization&apos;s documentation frame. It will be
            composited as an overlay on each photograph independently.
          </p>
        )}

        {frames.length > 0 ? (
          <div className="mb-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              Frame Library
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {frames.slice(0, 6).map((frame) => (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => useFrame(frame.id)}
                  className={`overflow-hidden rounded border p-1 ${
                    frame.id === session.activeFrameId
                      ? 'border-gold-500'
                      : 'border-navy-600 hover:border-navy-500'
                  }`}
                  title={frame.name}
                >
                  <img
                    src={frame.thumbnailUrl}
                    alt={frame.name}
                    className="aspect-square w-full object-contain bg-navy-950"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Field label="Fit Mode">
            <Select
              value={session.frameConfig.fitMode}
              onChange={(e) =>
                updateFrameConfig({
                  fitMode: e.target.value as typeof session.frameConfig.fitMode,
                })
              }
            >
              <option value="stretch">Stretch to 940×788</option>
              <option value="fit-frame">Fit frame to canvas</option>
              <option value="fit-photo">Fit photo inside frame</option>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </Select>
          </Field>
          <Field label={`Frame Scale (${session.frameConfig.scale}%)`}>
            <input
              type="range"
              min={50}
              max={150}
              value={session.frameConfig.scale}
              onChange={(e) =>
                updateFrameConfig({ scale: Number(e.target.value) })
              }
              className="w-full"
            />
          </Field>
          <Field label={`Opacity (${session.frameConfig.opacity}%)`}>
            <input
              type="range"
              min={0}
              max={100}
              value={session.frameConfig.opacity}
              onChange={(e) =>
                updateFrameConfig({ opacity: Number(e.target.value) })
              }
              className="w-full"
            />
          </Field>
          <Field label="Position">
            <Select
              value={session.frameConfig.position}
              onChange={(e) =>
                updateFrameConfig({
                  position: e.target.value as typeof session.frameConfig.position,
                })
              }
            >
              <option value="center">Center</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="custom">Custom</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-xs text-ink-200">
            <input
              type="checkbox"
              checked={session.frameConfig.showSafeArea}
              onChange={(e) =>
                updateFrameConfig({ showSafeArea: e.target.checked })
              }
              className="accent-gold-500"
            />
            Show safe area guides (preview only)
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <Button
            variant="primary"
            onClick={() => void applyFrame('current')}
            disabled={!active}
          >
            Apply to Current Photo
          </Button>
          <Button
            variant="secondary"
            onClick={() => void applyFrame('selected')}
            disabled={!selected}
          >
            Apply to Selected ({selected})
          </Button>
          <Button
            variant="gold"
            onClick={() => void applyFrame('all')}
            disabled={!session.photos.length}
          >
            Apply to All Photos
          </Button>
        </div>
      </Panel>

      {active ? (
        <Panel title="Adjustments">
          <div className="flex flex-col gap-2">
            {(
              [
                ['brightness', 'Brightness'],
                ['contrast', 'Contrast'],
                ['exposure', 'Exposure'],
                ['saturation', 'Saturation'],
                ['sharpness', 'Sharpness'],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={`${label} (${active.adjustments[key]})`}
              >
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={active.adjustments[key]}
                  onChange={(e) =>
                    updateAdjustments(active.id, {
                      [key]: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </Field>
            ))}
            <Field label={`Rotation (${active.adjustments.rotation}°)`}>
              <input
                type="range"
                min={0}
                max={360}
                step={90}
                value={active.adjustments.rotation}
                onChange={(e) =>
                  updateAdjustments(active.id, {
                    rotation: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </Field>
          </div>
        </Panel>
      ) : null}

      <Panel title="Export">
        <div className="mb-3 rounded-md border border-navy-700 bg-navy-850 px-2 py-1.5 text-xs text-ink-300">
          Output size:{' '}
          <strong className="text-ink-50">940 × 788 px</strong>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <Stat label="Total Photos" value={session.photos.length} />
          <Stat label="Ready" value={ready} />
          <Stat label="Processed" value={processed} />
          <Stat label="Selected" value={selected} />
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Field label="Format">
            <Select
              value={session.exportSettings.format}
              onChange={(e) =>
                updateExportSettings({
                  format: e.target.value as 'jpeg' | 'png',
                })
              }
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </Select>
          </Field>
          <Field label={`Quality (${session.exportSettings.quality})`}>
            <Input
              type="number"
              min={90}
              max={100}
              value={session.exportSettings.quality}
              onChange={(e) =>
                updateExportSettings({
                  quality: Math.min(100, Math.max(90, Number(e.target.value) || 95)),
                })
              }
            />
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <Button variant="secondary" onClick={() => void exportCurrent()}>
            Export Current Photo
          </Button>
          <Button variant="secondary" onClick={() => void exportSelected()}>
            Export Selected
          </Button>
          <Button variant="primary" onClick={() => void exportAll()}>
            Download All (ZIP)
          </Button>
          <Button
            variant="gold"
            disabled={!processed}
            onClick={() => void createAlbumFromSession()}
          >
            Create Album → Gallery
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-ink-400">
          Each photograph exports as an individual file. Originals remain
          untouched.
        </p>
      </Panel>

      <Panel title="Workflow">
        <ol className="space-y-1.5 text-xs text-ink-300">
          {[
            'Upload photographs',
            'Enter incident details',
            'Upload your frame',
            'Preview & apply to photos',
            'Create album / export',
          ].map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="font-mono text-gold-500">
                {String(i + 1).padStart(2, '0')}
              </span>
              {step}
            </li>
          ))}
        </ol>
        {active ? (
          <div className="mt-3 border-t border-navy-700 pt-2 text-xs">
            Active status: <StatusBadge status={active.status} />
          </div>
        ) : null}
      </Panel>
    </div>
  )

  return (
    <>
      {/* Desktop panel */}
      <aside className="hidden h-full w-[320px] shrink-0 border-l border-navy-700 bg-navy-900 lg:flex lg:flex-col">
        {panel}
      </aside>

      {/* Mobile drawer */}
      {panelOpen ? (
        <div className="absolute inset-0 z-30 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/70"
            aria-label="Close panel"
            onClick={() => setPanelOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(100%,340px)] flex-col border-l border-navy-700 bg-navy-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-navy-700 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gold-500">
                Studio Panel
              </span>
              <Button size="sm" variant="ghost" onClick={() => setPanelOpen(false)}>
                Close
              </Button>
            </div>
            {panel}
          </aside>
        </div>
      ) : null}
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-navy-700 bg-navy-850 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="text-lg font-semibold text-ink-50">{value}</div>
    </div>
  )
}
