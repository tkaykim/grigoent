import { createHmac, timingSafeEqual } from 'crypto'

// 분납 회차별 결제 링크 토큰.
// 회차 레코드 id 를 서버 키로 서명해 링크 하나가 한 회차만 결제하도록 묶는다.
// (주문번호를 그대로 노출하면 다른 회차·다른 주문을 유추할 수 있어 서명 토큰을 쓴다.)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function secret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
  return key
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

export function makeInstallmentToken(paymentId: string): string {
  const payload = `tip:${paymentId}`
  return `${Buffer.from(payload, 'utf8').toString('base64url')}.${sign(payload, secret())}`
}

export function verifyInstallmentToken(token: string | null | undefined): string | null {
  try {
    if (!token) return null
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return null
    const dot = token.lastIndexOf('.')
    if (dot < 1) return null
    const payload = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8')
    const a = Buffer.from(token.slice(dot + 1))
    const b = Buffer.from(sign(payload, key))
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const [prefix, paymentId] = payload.split(':')
    if (prefix !== 'tip' || !UUID_RE.test(paymentId ?? '')) return null
    return paymentId
  } catch {
    return null
  }
}

export function installmentPayUrl(paymentId: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, '')}/training/pay/${makeInstallmentToken(paymentId)}`
}
