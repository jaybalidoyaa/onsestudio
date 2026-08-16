import type { Album, IncidentMetadata } from '../types'
import { normalizeMetadata } from '../types'
import { parseMultiValue } from './rosters'
import { formatDisplayDate } from './utils'

export type CaptionSource = {
  date: string
  address: string
  alarm: string
  unit: string
  callsign: string
}

export function captionSourceFromMetadata(
  metadata: IncidentMetadata,
): CaptionSource {
  const m = normalizeMetadata(metadata)
  return {
    date: m.date,
    address: m.address,
    alarm: m.alarm,
    unit: m.unit,
    callsign: m.callsign,
  }
}

export function captionSourceFromAlbum(album: Album): CaptionSource {
  return {
    date: album.date || '',
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
 * Official Brigada Onse SVFAR Facebook incident caption template.
 * Supports multiple units and callsigns from Event Information.
 */
export function buildFacebookCaption(source: CaptionSource): string {
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
