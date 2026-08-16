import type { Album } from '../types'
import { formatDisplayDate, formatDisplayTime } from './utils'

export function buildFacebookCaption(
  album: Album,
  hashtags = '',
): string {
  const lines = [
    album.title?.toUpperCase() || 'INCIDENT DOCUMENTATION',
    '',
    `Type: ${album.incidentType}`,
    `Date: ${formatDisplayDate(album.date)}`,
    `Time: ${formatDisplayTime(album.time)}`,
  ]

  const place = [album.location, album.barangay, album.city]
    .filter(Boolean)
    .join(', ')
  if (place) lines.push(`Location: ${place}`)
  if (album.respondingUnits) lines.push(`Responding: ${album.respondingUnits}`)
  if (album.documentationOfficer) {
    lines.push(`Documentation: ${album.documentationOfficer}`)
  }
  if (album.notes?.trim()) {
    lines.push('', album.notes.trim())
  }

  lines.push(
    '',
    '📸 Documentation by Brigada Onse — Sun Valley Fire and Rescue',
  )

  if (hashtags.trim()) {
    lines.push('', hashtags.trim())
  }

  return lines.join('\n')
}
