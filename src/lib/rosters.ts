/** Official SVFAR incident type / alarm options for Event Information */
export const ALARM_TYPES = [
  'Trauma Response',
  'Vehicular Accident',
  'Road Traffic Accident',
  'Medical Emergency',
  'Patient Conduction',
  '10-70 Positive Alarm',
  '10-70 Fire Out Upon Arrival',
  '10-70 Rubbish Fire',
  '10-70 Grass Fire',
  '10-70 Vehicular Fire',
  '10-70 Electrical Fire',
  '10-70 Post Fire',
  '10-70 1st Alarm',
  '10-70 2nd Alarm',
  '10-70 3rd Alarm',
  '10-70 4th Alarm',
  '10-70 5th Alarm',
  '10-70 Task Force Alpha',
  '10-70 Task Force Bravo',
  '10-70 Task Force Charlie',
  '10-70 Task Force Delta',
  '10-70 Task Force Echo',
  '10-70 General Alarm',
] as const

/** Responding unit options (multi-select) */
export const RESPONDING_UNITS = [
  'Sun Valley Engine',
  'Sun Valley Pumper',
  'Sun Valley Rescue 02',
  'Sun Valley Rescue 04',
  'Sun Valley Rescue 05',
  'Finest Mini Tanker',
] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Build the full callsign roster for multi-select */
export function buildCallsignRoster(): string[] {
  const list: string[] = ['Sun Valley Alpha', 'Sun Valley Bravo']
  for (let i = 1; i <= 99; i++) {
    list.push(`Sun Valley ${pad2(i)}`)
  }
  for (let i = 1; i <= 13; i++) {
    list.push(`Finest ${pad2(i)}`)
  }
  return list
}

export const CALLSIGN_ROSTER = buildCallsignRoster()

/** Parse a stored multi-value field (comma / newline separated). */
export function parseMultiValue(value: string): string[] {
  if (!value?.trim()) return []
  return value
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Join selected values for storage / caption. */
export function joinMultiValue(values: string[]): string {
  return values.filter(Boolean).join(', ')
}
