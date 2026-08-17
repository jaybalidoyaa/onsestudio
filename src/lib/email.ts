import type { EmailSettings } from '../types/auth'

export interface SendEmailInput {
  to: string
  subject: string
  body: string
}

export async function sendEmail(
  settings: EmailSettings,
  input: SendEmailInput,
): Promise<boolean> {
  if (!settings.enabled || !settings.web3formsAccessKey.trim()) {
    return false
  }

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: settings.web3formsAccessKey.trim(),
      subject: input.subject,
      from_name: 'Brigada Onse SVFAR Studio',
      email: input.to,
      message: input.body,
    }),
  })

  if (!res.ok) return false
  const data = (await res.json()) as { success?: boolean }
  return data.success === true
}

export function buildMailtoLink(input: SendEmailInput): string {
  const params = new URLSearchParams({
    subject: input.subject,
    body: input.body,
  })
  return `mailto:${encodeURIComponent(input.to)}?${params.toString()}`
}

export function generateTempPassword(length = 12): string {
  const chars =
    'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
