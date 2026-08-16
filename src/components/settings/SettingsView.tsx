import { useStudio } from '../../store/StudioContext'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'

const SHORTCUTS = [
  ['Ctrl/Cmd + O', 'Open / import photos'],
  ['Ctrl/Cmd + S', 'Save session'],
  ['Delete', 'Remove selected photos'],
  ['← / →', 'Previous / next photo'],
  ['Space', 'Toggle original / framed'],
  ['R', 'Rotate active photo'],
] as const

export function SettingsView() {
  const { newSession, resetSession, saveSession, albums, frames, session } =
    useStudio()

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-50">Settings</h1>
          <p className="text-sm text-ink-400">
            Local-first studio preferences and storage
          </p>
        </div>

        <Panel title="About">
          <p className="text-sm text-ink-300">
            <strong className="text-ink-50">Onse Studio</strong> is a
            standalone Emergency Response Photo Documentation Studio. Frames are
            user-provided overlays. Processed photographs are archived as albums
            in the Gallery.
          </p>
        </Panel>

        <Panel title="Storage">
          <ul className="space-y-2 text-sm text-ink-300">
            <li>
              Session photos:{' '}
              <strong className="text-ink-50">{session.photos.length}</strong>
            </li>
            <li>
              Saved frames:{' '}
              <strong className="text-ink-50">{frames.length}</strong>
            </li>
            <li>
              Gallery albums:{' '}
              <strong className="text-ink-50">{albums.length}</strong>
            </li>
            <li className="text-xs text-ink-400">
              Data is stored in this browser via IndexedDB. Clearing site data
              will remove local sessions, frames, and albums.
            </li>
          </ul>
        </Panel>

        <Panel title="Session">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void saveSession()}>
              Save Session Now
            </Button>
            <Button variant="secondary" onClick={() => void newSession()}>
              New Session
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (
                  confirm(
                    'Reset the current studio session? Uploaded photos in this session will be cleared.',
                  )
                ) {
                  void resetSession()
                }
              }}
            >
              Reset Session
            </Button>
          </div>
        </Panel>

        <Panel title="Keyboard Shortcuts">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-mono text-xs text-gold-500">{k}</dt>
                <dd className="text-ink-300">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  )
}
