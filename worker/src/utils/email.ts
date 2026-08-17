import type { Env } from '../types'

export interface EmailInput {
  to: string
  subject: string
  body: string
}

/**
 * Send an email via Gmail SMTP using Cloudflare's fetch-based SMTP relay.
 *
 * Cloudflare Workers cannot open raw TCP sockets, so we use Gmail's
 * OAuth2-less SMTP-over-HTTPS approach via the gmail.googleapis.com
 * REST endpoint — BUT that requires OAuth2.
 *
 * Instead we use the reliable approach: Gmail SMTP through
 * the Cloudflare Email Workers (send via MailChannels, which is
 * natively integrated into Cloudflare Workers for free on Pages/Workers).
 *
 * MailChannels is Cloudflare's built-in transactional email partner —
 * no API key needed, just allowlist your domain in DNS (SPF record).
 *
 * The GMAIL_USER and GMAIL_APP_PASSWORD secrets are kept for the
 * "from" address and display name, but delivery goes through MailChannels.
 */
export async function sendEmail(env: Env, input: EmailInput): Promise<boolean> {
  const from = env.GMAIL_USER?.trim()
  if (!from) return false

  try {
    const payload = {
      personalizations: [
        {
          to: [{ email: input.to }],
        },
      ],
      from: {
        email: from,
        name: 'Brigada Onse SVFAR Studio',
      },
      subject: input.subject,
      content: [
        {
          type: 'text/plain',
          value: input.body,
        },
      ],
    }

    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    // MailChannels returns 202 on success
    return res.status === 202 || res.ok
  } catch {
    return false
  }
}

// ── Pre-built email templates ─────────────────────────────────

export function buildAccessRequestEmail(
  frontendUrl: string,
  req: { username: string; email: string; callsign: string; isBrigadaMember: boolean },
): EmailInput & { to: string } {
  return {
    to: '', // filled by caller with adminNotificationEmail
    subject: `[SVFAR Studio] New access request — ${req.username}`,
    body: [
      'A new access request was submitted to Brigada Onse SVFAR Studio.',
      '',
      `Brigada Onse member: ${req.isBrigadaMember ? 'Yes' : 'No'}`,
      `Username: ${req.username}`,
      `Email: ${req.email}`,
      `Callsign: ${req.callsign}`,
      '',
      `Sign in to Studio Settings to review: ${frontendUrl}`,
    ].join('\n'),
  }
}

export function buildApprovalEmail(
  frontendUrl: string,
  username: string,
  tempPassword: string,
): EmailInput {
  return {
    to: '',
    subject: 'Brigada Onse SVFAR Studio — Your access has been approved',
    body: [
      'Your access to Brigada Onse SVFAR Studio has been approved.',
      '',
      `Sign in at: ${frontendUrl}`,
      `Username: ${username}`,
      `Temporary password: ${tempPassword}`,
      '',
      'Please sign in and change your password from Settings after your first login.',
      '',
      'Brigada Onse SVFAR Studio',
    ].join('\n'),
  }
}

export function buildRejectionEmail(reason?: string): EmailInput {
  return {
    to: '',
    subject: 'Brigada Onse SVFAR Studio — Access request update',
    body: [
      'Thank you for your interest in Brigada Onse SVFAR Studio.',
      '',
      'Your access request was not approved at this time.',
      reason?.trim() ? `\nReason: ${reason.trim()}` : '',
      '',
      'If you believe this was a mistake, contact your administrator.',
    ]
      .filter((l) => l !== undefined)
      .join('\n'),
  }
}
