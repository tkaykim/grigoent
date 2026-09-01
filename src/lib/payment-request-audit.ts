import { createHmac } from 'node:crypto'

type HeaderReader = Pick<Headers, 'get'>

export type PaymentRequestAudit = {
  version: 1
  captured_at: string
  ip_hash: string | null
  request_fingerprint: string | null
  user_agent: string | null
  browser_hint: string | null
  platform_hint: string | null
  accept_language: string | null
  referrer_path: string | null
}

function cleanHeader(value: string | null, maxLength: number): string | null {
  const cleaned = value?.replace(/[\r\n\0]/g, ' ').trim()
  return cleaned ? cleaned.slice(0, maxLength) : null
}

function requestIp(headers: HeaderReader): string | null {
  const forwarded = headers.get('x-forwarded-for') ?? headers.get('x-vercel-forwarded-for')
  return cleanHeader(forwarded?.split(',')[0] ?? headers.get('x-real-ip'), 64)
}

function referrerPath(value: string | null): string | null {
  const cleaned = cleanHeader(value, 2048)
  if (!cleaned) return null

  try {
    const parsed = new URL(cleaned)
    return `${parsed.origin}${parsed.pathname}`.slice(0, 512)
  } catch {
    return null
  }
}

function auditSecret(): string | null {
  return (
    process.env.PAYMENT_AUDIT_SECRET ||
    process.env.VISA_PAYMENT_LINK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  )
}

function hmac(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex')
}

export function buildPaymentRequestAudit(
  headers: HeaderReader,
  capturedAt = new Date(),
  secret = auditSecret(),
): PaymentRequestAudit {
  const ip = requestIp(headers)
  const userAgent = cleanHeader(headers.get('user-agent'), 512)

  return {
    version: 1,
    captured_at: capturedAt.toISOString(),
    ip_hash: ip && secret ? hmac(`ip:${ip}`, secret) : null,
    request_fingerprint:
      secret && (ip || userAgent) ? hmac(`request:${ip ?? ''}\n${userAgent ?? ''}`, secret) : null,
    user_agent: userAgent,
    browser_hint: cleanHeader(headers.get('sec-ch-ua'), 256),
    platform_hint: cleanHeader(headers.get('sec-ch-ua-platform'), 80),
    accept_language: cleanHeader(headers.get('accept-language'), 160),
    referrer_path: referrerPath(headers.get('referer')),
  }
}
