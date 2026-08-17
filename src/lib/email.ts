/**
 * Email is now handled server-side by the Cloudflare Worker via MailChannels.
 * The frontend no longer sends emails directly — it just triggers API calls
 * (submitAccessRequest, approveAccessRequest, rejectAccessRequest) and the
 * Worker sends the email automatically when email is enabled in settings.
 *
 * This file keeps the mailto fallback helper used in AccessRequestsPanel
 * when the admin wants to manually send credentials if email is disabled.
 */

export interface SendEmailInput {
  to: string
  subject: string
  body: string
}

/**
 * Builds a standard mailto: link as a fallback when server email is disabled.
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
