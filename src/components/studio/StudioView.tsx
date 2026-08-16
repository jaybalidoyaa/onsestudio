import { useStudio } from '../../store/StudioContext'
import { PhotoUploader } from './PhotoUploader'
import { PhotoGallery } from './PhotoGallery'
import { PhotoCanvas } from './PhotoCanvas'
import { StudioPanel } from './StudioPanel'

export function StudioView() {
  const { session, uploadFrame } = useStudio()

  if (!session.photos.length) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <PhotoUploader />
          <input
            id="frame-file-input"
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
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0">
      <PhotoGallery />
      <PhotoCanvas />
      <StudioPanel />
    </div>
  )
}
