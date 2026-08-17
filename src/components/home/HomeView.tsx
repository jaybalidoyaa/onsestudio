import { useAuth } from '../../store/AuthContext'
import { useStudio } from '../../store/StudioContext'
import {
  STUDIO_CLOSING,
  STUDIO_INTRO,
  STUDIO_MOTTO,
  STUDIO_PURPOSE,
  STUDIO_SCOPE,
} from '../../lib/brand'
import { Button } from '../ui/Button'

const ACTIONS = [
  {
    id: 'studio' as const,
    title: 'Studio',
    blurb:
      'Upload response and event photographs, apply official frames, and prepare each image individually.',
    cta: 'Open Studio',
    editorsOnly: true,
  },
  {
    id: 'gallery' as const,
    title: 'Gallery',
    blurb:
      'Organize completed photographs into albums with their corresponding details.',
    cta: 'Open Gallery',
    editorsOnly: false,
  },
  {
    id: 'facebook' as const,
    title: 'Facebook',
    blurb:
      'Publish official Page posts from albums or a blank draft for the community.',
    cta: 'Create Post',
    editorsOnly: false,
  },
  {
    id: 'frames' as const,
    title: 'Frames',
    blurb: 'Manage reusable official documentation frame overlays.',
    cta: 'Frame Library',
    editorsOnly: true,
  },
]

export function HomeView() {
  const { user, canEdit, isAdmin } = useAuth()
  const { setView, albums, session, frames } = useStudio()

  return (
    <div className="relative h-full overflow-y-auto bg-navy-950">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,184,74,0.12), transparent 55%),
            radial-gradient(ellipse 60% 40% at 100% 20%, rgba(30,42,58,0.9), transparent 50%),
            linear-gradient(180deg, #0d1520 0%, #080e16 45%, #0d1520 100%)
          `,
        }}
      />

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="flex flex-col items-center pb-10 pt-4 text-center sm:pb-12 sm:pt-8">
          <img
            src="/logo.png"
            alt="Brigada Onse Sun Valley Fire and Rescue"
            className="mb-7 h-28 w-28 object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:h-36 sm:w-36"
            width={144}
            height={144}
          />
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
            Brigada Onse SVFAR
          </h1>
          <p className="mt-2.5 text-lg font-semibold uppercase tracking-[0.22em] text-gold-500">
            Studio
          </p>

          <div className="mx-auto mt-8 max-w-2xl space-y-3 text-left text-sm leading-relaxed text-ink-300 sm:text-base">
            <p>{STUDIO_INTRO}</p>
            <p>{STUDIO_PURPOSE}</p>
            <p>{STUDIO_SCOPE}</p>
            <p className="font-semibold text-ink-100">{STUDIO_MOTTO}</p>
            <p className="text-gold-500">{STUDIO_CLOSING}</p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {canEdit ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setView('studio')}
              >
                Start documenting
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setView('gallery')}
              >
                Open Gallery
              </Button>
            )}
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setView('facebook')}
            >
              Create Facebook post
            </Button>
          </div>

          <p className="mt-5 text-xs text-ink-400">
            Signed in as{' '}
            <span className="font-medium text-ink-200">{user?.displayName}</span>
            {isAdmin ? (
              <span className="ml-1 text-gold-500">· Administrator</span>
            ) : null}
          </p>
        </section>

        {/* Stats bar */}
        <div className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-navy-700 bg-navy-700">
          {[
            ['Session photos', String(session.photos.length)],
            ['Albums', String(albums.length)],
            ['Frames', String(frames.length)],
          ].map(([label, value]) => (
            <div key={label} className="bg-navy-900 py-4 text-center">
              <div className="text-2xl font-semibold text-ink-50">{value}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Workspaces */}
        <section className="pb-10">
          <h2 className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
            Workspaces
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACTIONS.filter((a) => canEdit || !a.editorsOnly).map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setView(action.id)}
                className="group rounded-xl border border-navy-700 bg-navy-900/80 p-5 text-left transition-all hover:border-gold-500/50 hover:bg-navy-850 hover:shadow-lg"
              >
                <div className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-gold-500 group-hover:text-gold-400">
                  {action.title}
                </div>
                <p className="mb-3 text-sm leading-relaxed text-ink-300">
                  {action.blurb}
                </p>
                <span className="text-xs font-semibold text-ink-200 underline-offset-2 group-hover:text-gold-400 group-hover:underline">
                  {action.cta} →
                </span>
              </button>
            ))}
          </div>
        </section>

        <footer className="pb-4 text-center text-[11px] text-ink-500">
          {STUDIO_MOTTO} · made with love by{' '}
          <span className="text-gold-500">finest 12</span>
        </footer>
      </div>
    </div>
  )
}
