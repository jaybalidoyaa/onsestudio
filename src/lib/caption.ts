import type { Album, IncidentMetadata } from '../types'
import { normalizeMetadata } from '../types'
import { parseMultiValue } from './rosters'
import { formatDisplayDate, formatDisplayTime } from './utils'

export type CaptionSource = {
  date: string
  time?: string
  address: string
  alarm: string
  unit: string
  callsign: string
}

/** Medical / trauma incident types use the medical caption template. */
export const MEDICAL_ALARM_TYPES = [
  'Trauma Response',
  'Vehicular Accident',
  'Road Traffic Accident',
  'Medical Emergency',
  'Patient Conduction',
] as const

export function isMedicalIncident(alarm: string): boolean {
  const a = alarm.trim()
  return (MEDICAL_ALARM_TYPES as readonly string[]).includes(a)
}

export function captionSourceFromMetadata(
  metadata: IncidentMetadata,
): CaptionSource {
  const m = normalizeMetadata(metadata)
  return {
    date: m.date,
    time: m.time,
    address: m.address,
    alarm: m.alarm,
    unit: m.unit,
    callsign: m.callsign,
  }
}

export function captionSourceFromAlbum(album: Album): CaptionSource {
  return {
    date: album.date || '',
    time: album.time || '',
    address: album.address || album.location || '',
    alarm: album.alarm || '',
    unit: album.unit || album.respondingUnits || '',
    callsign: album.callsign || album.documentationOfficer || '',
  }
}

/** Firefighter emoji (person + fire engine ZWJ sequence) */
const FF = '\u{1F9D1}\u{200D}\u{1F692}'

function formatUnitBlock(unitField: string): string[] {
  const units = parseMultiValue(unitField)
  if (!units.length) return ['{unit}']
  return units
}

function formatCallsignBlock(callsignField: string): string[] {
  const signs = parseMultiValue(callsignField)
  if (!signs.length) return [`${FF}{callsign}`]
  return signs.map((s) => `${FF}${s}`)
}

function formatUnitNarrative(unitField: string): string {
  const units = parseMultiValue(unitField)
  if (!units.length) return '{unit}'
  if (units.length === 1) return units[0]
  if (units.length === 2) return `${units[0]} and ${units[1]}`
  return `${units.slice(0, -1).join(', ')}, and ${units[units.length - 1]}`
}

/**
 * Free on-device "smart" narrative for medical posts.
 * Builds a natural paragraph from alarm + time + date + address (no API / no cost).
 */
export function generateMedicalNarrative(source: CaptionSource): string {
  const timeLabel = source.time
    ? formatDisplayTime(source.time)
    : 'the reported time'
  const dateLabel = source.date
    ? formatDisplayDate(source.date)
    : '{date}'
  const address = source.address.trim() || '{address}'
  const alarm = source.alarm.trim() || 'medical emergency'

  const regarding: Record<string, string> = {
    'Trauma Response':
      'a trauma emergency requiring immediate medical assistance',
    'Vehicular Accident':
      'a vehicular accident requiring emergency medical response',
    'Road Traffic Accident':
      'a road traffic accident with possible injuries',
    'Medical Emergency': 'a medical emergency',
    'Patient Conduction':
      'a patient conduction request for safe transport and care',
  }

  const phrase =
    regarding[alarm] ||
    `a ${alarm.toLowerCase()} incident requiring emergency response`

  const openers = [
    `At around ${timeLabel} on ${dateLabel}, our team received a call regarding ${phrase} at ${address}.`,
    `On ${dateLabel} at around ${timeLabel}, Brigada Onse SVFAR was alerted to ${phrase} at ${address}.`,
    `Our responders were notified at around ${timeLabel} on ${dateLabel} about ${phrase} in the vicinity of ${address}.`,
  ]

  // Stable pick from fields so the same inputs produce the same sentence
  const seed =
    (source.date + source.time + source.address + source.alarm)
      .split('')
      .reduce((n, c) => n + c.charCodeAt(0), 0) % openers.length

  return openers[seed]
}

function buildMedicalCaption(source: CaptionSource): string {
  const alarm = source.alarm.trim() || 'TRAUMA RESPONSE'
  const dateUpper = source.date
    ? formatDisplayDate(source.date).toUpperCase()
    : '{DATE}'
  const headline = `${alarm.toUpperCase()} | ${dateUpper}`
  const narrative = generateMedicalNarrative(source)
  const units = parseMultiValue(source.unit)
  const callsigns = parseMultiValue(source.callsign)

  const unitLines = units.length
    ? units.map((u) => `🚨 ${u} unit was immediately dispatched to the scene to provide assistance and emergency care.`)
    : [
        '🚨 {unit} unit was immediately dispatched to the scene to provide assistance and emergency care.',
      ]

  const manpowerLines = callsigns.length
    ? callsigns.map((c) => `🩺 ${c}`)
    : ['🩺 {callsign}']

  return [
    headline,
    '',
    narrative,
    '',
    ...unitLines,
    '',
    '𝗠𝗔𝗡𝗣𝗢𝗪𝗘𝗥:',
    ...manpowerLines,
    '',
    'We remain committed to providing fast, reliable, and compassionate emergency response to our community.',
    '',
    '🫡 𝘚𝘢𝘭𝘶𝘵𝘦 𝘵𝘰 𝘰𝘶𝘳 𝘳𝘦𝘴𝘱𝘰𝘯𝘥𝘦𝘳𝘴. 𝘚𝘵𝘢𝘺 𝘴𝘢𝘧𝘦 𝘢𝘭𝘸𝘢𝘺𝘴.',
    '',
    '#BrigadaOnse #ParañaquesFinest #VolunteerismAtItsFinest',
  ].join('\n')
}

function buildFireCaption(source: CaptionSource): string {
  const date = source.date ? formatDisplayDate(source.date) : '{date}'
  const address = source.address.trim() || '{address}'
  const alarm = source.alarm.trim() || '{alarm}'
  const unitLines = formatUnitBlock(source.unit)
  const callsignLines = formatCallsignBlock(source.callsign)
  const unitNarrative = formatUnitNarrative(source.unit)

  return [
    '🔥 𝗙𝗜𝗥𝗘 𝗥𝗘𝗦𝗣𝗢𝗡𝗦𝗘 𝗢𝗣𝗘𝗥𝗔𝗧𝗜𝗢𝗡',
    ' ',
    '📋 𝗜𝗡𝗖𝗜𝗗𝗘𝗡𝗧 𝗗𝗘𝗧𝗔𝗜𝗟𝗦',
    `Date: ${date}`,
    `Location: ${address}`,
    `Incident Type: ${alarm}`,
    ' ',
    '🚒𝗥𝗘𝗦𝗣𝗢𝗡𝗗𝗜𝗡𝗚 𝗨𝗡𝗜𝗧',
    ...unitLines,
    '',
    `${FF}𝗥𝗘𝗦𝗣𝗢𝗡𝗗𝗜𝗡𝗚 𝗣𝗘𝗥𝗦𝗢𝗡𝗡𝗘𝗟`,
    ...callsignLines,
    '',
    '',
    `The ${unitNarrative} of Brigada Onse Sun Valley Fire and Rescue Volunteer Group, Inc. responded to a reported incident under ${alarm} at ${address}.`,
    '',
    'Responding personnel were deployed to provide the appropriate fire and rescue support and to assist in maintaining the safety of the affected area and surrounding community.',
    '',
    'Brigada Onse Sun Valley remains committed to the protection of life and property, timely emergency response, and continued service to the community. 🤝',
    '',
    '🧯 𝗙𝗜𝗥𝗘 𝗦𝗔𝗙𝗘𝗧𝗬 𝗔𝗗𝗩𝗜𝗦𝗢𝗥𝗬',
    'In the event of a fire:',
    '• Remain calm and immediately alert everyone in the area.',
    '• Evacuate through the nearest safe exit.',
    '• Do not return inside a burning structure for personal belongings.',
    '• Call emergency responders as soon as possible.',
    '• Keep access roads clear for fire trucks, ambulances, and rescue vehicles.',
    'When you hear an emergency siren, please yield safely and give way. A clear road allows responders to reach the scene faster—every second matters. ⏱️',
    '',
    '“God is our refuge and strength, a very present help in trouble.”',
    '— Psalm 46:1',
    '',
    '📞 𝗘𝗠𝗘𝗥𝗚𝗘𝗡𝗖𝗬 𝗖𝗢𝗡𝗧𝗔𝗖𝗧𝗦',
    '𝗕𝗿𝗶𝗴𝗮𝗱𝗮 𝗢𝗻𝘀𝗲 𝗦𝘂𝗻 𝗩𝗮𝗹𝗹𝗲𝘆 𝗙𝗶𝗿𝗲 𝗮𝗻𝗱 𝗥𝗲𝘀𝗰𝘂𝗲',
    'Smart: 0961-743-1376',
    'Landline: 8824-7493',
    '𝗡𝗮𝘁𝗶𝗼𝗻𝗮𝗹 𝗘𝗺𝗲𝗿𝗴𝗲𝗻𝗰𝘆 𝗛𝗼𝘁𝗹𝗶𝗻𝗲',
    '911',
    '𝗕𝘂𝗿𝗲𝗮𝘂 𝗼𝗳 𝗙𝗶𝗿𝗲 𝗣𝗿𝗼𝘁𝗲𝗰𝘁𝗶𝗼𝗻',
    '(02) 8426-0219 | (02) 8426-0246',
    '𝗣𝗮𝗿𝗮ñ𝗮𝗾𝘂𝗲 𝗘𝗺𝗲𝗿𝗴𝗲𝗻𝗰𝘆 𝗟𝗼𝗰𝗮𝗹 𝗢𝗽𝗲𝗿𝗮𝘁𝗶𝗼𝗻𝘀 𝗖𝗲𝗻𝘁𝗲𝗿',
    '8820-(PQUE) 7783',
    '𝘚𝘵𝘢𝘺 𝘴𝘢𝘧𝘦. 𝘚𝘵𝘢𝘺 𝘢𝘭𝘦𝘳𝘵. 𝘈𝘭𝘸𝘢𝘺𝘴 𝘣𝘦 𝘱𝘳𝘦𝘱𝘢𝘳𝘦𝘥.',
    '',
    '📸 Brigada Onse Camera App',
    'The date, time, location, and GPS coordinates displayed in captured photos are based on device settings, app permissions, and GPS signal available at the time of capture. Accuracy may vary.',
    '',
    '#brigadaonsesvfar',
    '#sunvalleyfireandrescue',
    '#paranaquesfinest',
  ].join('\n')
}

/**
 * Builds the Facebook caption. Medical/trauma alarms use the medical template
 * with a free on-device narrative; fire/10-70 alarms use the fire template.
 */
export function buildFacebookCaption(source: CaptionSource): string {
  if (isMedicalIncident(source.alarm)) {
    return buildMedicalCaption(source)
  }
  return buildFireCaption(source)
}
