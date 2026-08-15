import { createHmac, timingSafeEqual } from 'node:crypto'

// deetz 비자 케이스 ↔ 이 결제 시스템을 잇는 서명 토큰.
//
// deetz 어드민이 결제 링크(?ref=…)를 발급하고, 여기서 검증해 주문에
// visa_application_id 를 기록한다. 결제가 승인되면 deetz 로 결과를 돌려준다.
// 원본 구현은 deetz 레포 src/lib/visa/payment-link.ts — 두 파일의 포맷은 항상 같이 바꾼다.
//
// 공유 비밀 VISA_PAYMENT_LINK_SECRET 은 양쪽 Vercel 에 동일 값으로 넣는다.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SLUG_RE = /^[a-z0-9-]{2,64}$/

export type VisaPaymentRef = {
  applicationId: string
  productSlug: string
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function verifyVisaPaymentRef(token: string | null | undefined): VisaPaymentRef | null {
  try {
    if (!token) return null
    const key = process.env.VISA_PAYMENT_LINK_SECRET
    if (!key) return null
    const dot = token.lastIndexOf('.')
    if (dot < 1) return null
    const payload = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8')
    if (!safeEqual(token.slice(dot + 1), sign(payload, key))) return null

    const [prefix, applicationId, productSlug, expiresRaw] = payload.split(':')
    if (prefix !== 'vp') return null
    if (!UUID_RE.test(applicationId ?? '')) return null
    if (!SLUG_RE.test(productSlug ?? '')) return null

    const expiresAt = Number(expiresRaw)
    if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null

    return { applicationId, productSlug }
  } catch {
    return null
  }
}

type CallbackEvent = 'paid' | 'refunded'

// 결제 결과를 deetz 케이스로 미러링한다.
//
// 실패해도 결제 자체는 이미 성공한 상태이므로 절대 throw 하지 않는다.
// (돈은 받았는데 사용자에게 실패 화면을 보여주는 상황을 만들지 않는다.)
// 누락분은 주문번호로 수기 대사가 가능하도록 실패를 로그에 남긴다.
export async function notifyVisaCasePayment(input: {
  applicationId: string
  event: CallbackEvent
  orderNo: string
  provider: 'toss' | 'paypal'
  amountKrw: number
  occurredAt?: string
  meta?: Record<string, unknown>
}): Promise<boolean> {
  const secret = process.env.VISA_PAYMENT_LINK_SECRET
  if (!secret) {
    console.error('[visa-payment-ref] VISA_PAYMENT_LINK_SECRET 미설정 — 콜백 생략', input.orderNo)
    return false
  }
  const base = (process.env.DEETZ_SITE_URL || 'https://deetz.kr').replace(/\/$/, '')
  const body = JSON.stringify({
    applicationId: input.applicationId,
    event: input.event,
    orderNo: input.orderNo,
    provider: input.provider,
    amountKrw: input.amountKrw,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    meta: input.meta ?? {},
  })

  try {
    const response = await fetch(`${base}/api/visa/payment-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-visa-signature': sign(body, secret),
      },
      body,
      // 결제 응답을 오래 붙잡지 않는다.
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      console.error('[visa-payment-ref] 콜백 실패', input.orderNo, response.status, await response.text())
      return false
    }
    return true
  } catch (error) {
    console.error('[visa-payment-ref] 콜백 오류', input.orderNo, error)
    return false
  }
}
