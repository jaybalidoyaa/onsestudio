import { useEffect } from 'react'
import { AuthProvider, useAuth } from './store/AuthContext'
import { StudioProvider, useStudio } from './store/StudioContext'
import { AppShell } from './components/layout/AppShell'
import { PublicHome } from './components/home/PublicHome'
import { HomeView } from './components/home/HomeView'
import { StudioView } from './components/studio/StudioView'
import { GalleryView } from './components/gallery/GalleryView'
import { FramesView } from './components/frames/FramesView'
import { FacebookView } from './components/facebook/FacebookView'
import { SettingsView } from './components/settings/SettingsView'
import { LogsView } from './components/logs/LogsView'
import { PostsView } from './components/posts/PostsView'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function AppRoutes() {
  const { view, ready, setView } = useStudio()
  const { canEdit, isAdmin } = useAuth()
  useKeyboardShortcuts()

  useEffect(() => {
    if (!canEdit && (view === 'studio' || view === 'frames')) {
      setView('gallery')
    }
    if (!isAdmin && view === 'logs') {
      setView('home')
    }
  }, [canEdit, isAdmin, setView, view])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-navy-950 text-sm text-ink-300">
        Loading studio…
      </div>
    )
  }

  return (
    <AppShell>
      {view === 'home' ? <HomeView /> : null}
      {view === 'studio' && canEdit ? <StudioView /> : null}
      {view === 'gallery' ? <GalleryView /> : null}
      {view === 'facebook' ? <FacebookView /> : null}
      {view === 'frames' && canEdit ? <FramesView /> : null}
      {view === 'settings' ? <SettingsView /> : null}
      {view === 'logs' && isAdmin ? <LogsView /> : null}
      {view === 'posts' ? <PostsView /> : null}
    </AppShell>
  )
}

function AuthenticatedApp() {
  const { ready: authReady, session, needsSetup } = useAuth()

  if (!authReady) {
    return (
      <div className="flex h-full items-center justify-center bg-navy-950 text-sm text-ink-300">
        Securing studio…
      </div>
    )
  }

  if (needsSetup || !session) {
    return <PublicHome />
  }

  return (
    <StudioProvider>
      <AppRoutes />
    </StudioProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}
