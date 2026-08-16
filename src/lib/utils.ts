export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function padPhotoNumber(index: number, total = 0): string {
  const width = Math.max(2, String(Math.max(total, 1)).length)
  return String(index + 1).padStart(width, '0')
}

export function slugify(value: string): string {
  return (
    value
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60) || 'untitled'
  )
}

export function formatDisplayDate(date: string): string {
  if (!date) return '—'
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDisplayTime(time: string): string {
  if (!time) return '—'
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return time
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function buildExportFilename(
  index: number,
  metadata: { title: string; location: string; date: string },
  ext: string,
): string {
  const parts = [
    padPhotoNumber(index),
    slugify(metadata.title || 'photo'),
    slugify(metadata.location || ''),
    metadata.date || '',
  ].filter(Boolean)
  return `${parts.join('_')}.${ext}`
}

export function buildAlbumZipName(title: string, date: string): string {
  return `${slugify(title || 'album')}_${date || 'export'}.zip`
}

export function isSupportedPhotoType(file: File): boolean {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  if (
    type === 'image/jpeg' ||
    type === 'image/png' ||
    type === 'image/webp' ||
    type === 'image/heic' ||
    type === 'image/heif'
  ) {
    return true
  }
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(name)
}

export function isSupportedFrameType(file: File): boolean {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  if (
    type === 'image/png' ||
    type === 'image/jpeg' ||
    type === 'image/webp' ||
    type === 'image/svg+xml'
  ) {
    return true
  }
  return /\.(png|jpe?g|webp|svg)$/i.test(name)
}
