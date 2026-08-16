import { useEffect } from 'react'
import { useStudio } from '../store/StudioContext'

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function useKeyboardShortcuts() {
  const {
    view,
    session,
    selectPhoto,
    removePhotos,
    saveSession,
    newSession,
    exportSelected,
    rotateActive,
    setPreviewMode,
  } = useStudio()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (view !== 'studio') return
      if (isTypingTarget(e.target)) return

      const mod = e.metaKey || e.ctrlKey
      const photos = session.photos
      const activeId = session.activePhotoId
      const activeIndex = photos.findIndex((p) => p.id === activeId)

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveSession()
        return
      }

      if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        document.getElementById('photo-file-input')?.click()
        return
      }

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        // Lightweight: rotate undo approximation not full history — skip silently
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = photos.filter((p) => p.selected).map((p) => p.id)
        if (selected.length) {
          e.preventDefault()
          removePhotos(selected)
        } else if (activeId) {
          e.preventDefault()
          removePhotos([activeId])
        }
        return
      }

      if (e.key === 'ArrowLeft' && activeIndex > 0) {
        e.preventDefault()
        selectPhoto(photos[activeIndex - 1].id)
        return
      }

      if (e.key === 'ArrowRight' && activeIndex >= 0 && activeIndex < photos.length - 1) {
        e.preventDefault()
        selectPhoto(photos[activeIndex + 1].id)
        return
      }

      if (e.key === ' ' && activeId) {
        e.preventDefault()
        setPreviewMode(
          session.previewMode === 'framed' ? 'original' : 'framed',
        )
        return
      }

      if (e.key.toLowerCase() === 'r' && !mod) {
        rotateActive(1)
      }

      if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        void exportSelected()
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        void newSession()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    exportSelected,
    newSession,
    removePhotos,
    rotateActive,
    saveSession,
    selectPhoto,
    session.activePhotoId,
    session.photos,
    session.previewMode,
    setPreviewMode,
    view,
  ])
}
