import { useStudio } from '../../store/StudioContext'
import { padPhotoNumber } from '../../lib/utils'
import { StatusBadge } from '../ui/Panel'
import { Button } from '../ui/Button'
import { PhotoUploader } from './PhotoUploader'

export function PhotoGallery() {
  const {
    session,
    selectPhoto,
    togglePhotoSelected,
    removePhotos,
    selectAll,
    selectNone,
    invertSelection,
    selectByStatus,
  } = useStudio()

  const { photos, activePhotoId } = session

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-navy-700 bg-navy-900">
      <div className="flex items-center justify-between gap-2 border-b border-navy-700 px-2.5 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-300">
          Photos
        </span>
        <PhotoUploader compact />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-navy-700 p-2">
        <Button size="sm" variant="ghost" onClick={selectAll}>
          All
        </Button>
        <Button size="sm" variant="ghost" onClick={selectNone}>
          None
        </Button>
        <Button size="sm" variant="ghost" onClick={invertSelection}>
          Invert
        </Button>
        <Button size="sm" variant="ghost" onClick={() => selectByStatus('processed')}>
          Processed
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => selectByStatus('unprocessed')}
        >
          Unprocessed
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1.5">
          {photos.map((photo, index) => {
            const active = photo.id === activePhotoId
            return (
              <li key={photo.id}>
                <div
                  className={`group relative rounded-md border p-1.5 transition-colors ${
                    active
                      ? 'border-gold-500 bg-navy-800'
                      : 'border-navy-700 bg-navy-850 hover:border-navy-500'
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full gap-2 text-left"
                    onClick={() => selectPhoto(photo.id)}
                    aria-current={active ? 'true' : undefined}
                    aria-label={`Photo ${padPhotoNumber(index, photos.length)}, ${photo.filename}`}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-navy-950">
                      <img
                        src={photo.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="text-[11px] font-semibold text-ink-50">
                        PHOTO {padPhotoNumber(index, photos.length)}
                      </div>
                      <div className="truncate text-[10px] text-ink-400">
                        {photo.filename}
                      </div>
                      <StatusBadge status={photo.status} />
                    </div>
                  </button>
                  <div className="absolute left-2 top-2">
                    <input
                      type="checkbox"
                      checked={photo.selected}
                      onChange={() => togglePhotoSelected(photo.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${photo.filename}`}
                      className="h-3.5 w-3.5 accent-gold-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded px-1 text-xs text-ink-400 opacity-0 hover:text-alert-500 group-hover:opacity-100"
                    onClick={() => removePhotos([photo.id])}
                    aria-label={`Remove ${photo.filename}`}
                  >
                    ×
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
