import type { EmailSettings } from '../types/auth'

export interface SendEmailInput {
  to: string
  subject: string
  body: string
}

/**
 * Opens a Gmail compose window pre-filled with the message.
 * Uses the Gmail web compose URL — no third-party API or key required.
 * Returns true if the window was opened, false if email is not enabled
 * or the admin Gmail address is not set.
 */
export function sendEmail(
  settings: EmailSettings,
  input: SendEmailInput,
): boolean {
  if (!settings.enabled || !settings.gmailAddress.trim()) {
    return false
  }

  const params = new URLSearchParams({
    view: 'cm',
    to: input.to,
    su: input.subject,
    body: input.body,
  })

  const url = `https://mail.google.com/mail/?${params.toString()}`
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

/**
 * Builds a standard mailto: link as a fallback when Gmail is not configured.
 */
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
