import { StudioProvider, useStudio } from './store/StudioContext'
import { AppShell } from './components/layout/AppShell'
import { StudioView } from './components/studio/StudioView'
import { GalleryView } from './components/gallery/GalleryView'
import { FramesView } from './components/frames/FramesView'
import { SettingsView } from './components/settings/SettingsView'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function AppRoutes() {
  const { view, ready } = useStudio()
  useKeyboardShortcuts()

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-navy-950 text-sm text-ink-300">
        Loading studio…
      </div>
    )
  }

  return (
    <AppShell>
      {view === 'studio' ? <StudioView /> : null}
      {view === 'gallery' ? <GalleryView /> : null}
      {view === 'frames' ? <FramesView /> : null}
      {view === 'settings' ? <SettingsView /> : null}
    </AppShell>
  )
}

export default function App() {
  return (
    <StudioProvider>
      <AppRoutes />
    </StudioProvider>
  )
}
