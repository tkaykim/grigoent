import { createHmac, timingSafeEqual } from 'node:crypto'

// deetz 비자 케이스 ↔ 이 결제 시스템을 잇는 서명 토큰.
//
// deetz 어드민이 결제 링크(?ref=…)를 발급하고, 여기서 검증해 주문에
// visa_application_id 를 기록한다. 결제가 승인되면 deetz 로 결과를 돌려준다.
// 원본 구현은 deetz 레포 src/lib/visa/payment-link.ts — 두 파일의 포맷은 항상 같이 바꾼다.
//
// 공유 비밀 VISA_PAYMENT_LINK_SECRET 은 양쪽 Vercel 에 동일 값으로 넣는다.
//
// **링크에는 유효기간이 없다** (대표 결정 2026-09-04). 결제하려는 사람이 링크 만료로
// 막히는 상황을 만들지 않는다. 대신 링크만으로는 개인정보를 볼 수 없게 분리했다 —
// 화면 표시용(display)은 가려진 이름·이메일만 받고, 실제 개인정보(full)는
// 공유 시크릿으로 서명한 서버 대 서버 요청에서만 받는다.
// payload 네 번째 칸(과거 만료 시각)은 하위호환을 위해 읽지 않는다.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SLUG_RE = /^[a-z0-9-]{2,64}$/

export type VisaPaymentRef = {
  applicationId: string
  productSlug: string
}

export type VisaPaymentContext = {
  applicationId: string
  productSlug: string
  customer: {
    name: string
    email: string
    phone: string
    nationality: string
    preferredLang: 'ko' | 'en' | 'ja'
  }
}

export type VisaPaymentContextResult =
  | { ok: true; context: VisaPaymentContext }
  | { ok: false; reason: 'invalid_or_expired' | 'already_paid' | 'unavailable' }

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

function callbackTimestamp(value?: string): string {
  const parsed = value ? new Date(value) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
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

    const [prefix, applicationId, productSlug] = payload.split(':')
    if (prefix !== 'vp') return null
    if (!UUID_RE.test(applicationId ?? '')) return null
    if (!SLUG_RE.test(productSlug ?? '')) return null

    // 만료 판정 없음 — 옛 토큰(만료 시각 포함)도 그대로 통과시킨다.
    return { applicationId, productSlug }
  } catch {
    return null
  }
}

// 개인 링크의 서명을 먼저 확인한 뒤 deetz 서버에서 신청 정보를 조회한다.
// 이메일은 토큰 payload에 넣지 않고 양쪽 서버에서 application ID와 상품을 다시 대조한다.
//
// 두 가지 모드가 있다.
//  - 'display': 결제 화면 "본인 확인"용 **가려진** 이름·이메일. 링크만 있으면 누구나
//               받을 수 있으므로 실제 개인정보를 담지 않는다.
//  - 'full'   : 주문에 기록할 실제 이름·이메일·전화·국적. 공유 시크릿으로 ref 를 서명해야
//               응답한다(서버 대 서버 전용). 브라우저로는 내려보내지 않는다.
export type VisaPaymentContextMode = 'display' | 'full'

export async function resolveVisaPaymentContext(
  token: string | null | undefined,
  mode: VisaPaymentContextMode = 'full',
): Promise<VisaPaymentContextResult> {
  const verified = verifyVisaPaymentRef(token)
  if (!verified || !token) return { ok: false, reason: 'invalid_or_expired' }

  const base = (process.env.DEETZ_SITE_URL || 'https://deetz.kr').replace(/\/$/, '')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (mode === 'full') {
    const secret = process.env.VISA_PAYMENT_LINK_SECRET
    if (!secret) return { ok: false, reason: 'unavailable' }
    // 실제 개인정보를 요구하는 요청임을 증명한다(ref 자체를 서명).
    headers['x-visa-signature'] = sign(token, secret)
  }

  try {
    const response = await fetch(`${base}/api/visa/payment-context?ref=${encodeURIComponent(token)}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      reason?: string
      masked?: boolean
      applicationId?: string
      productSlug?: string
      customer?: {
        name?: string
        email?: string
        phone?: string
        nationality?: string
        preferredLang?: string
      }
    } | null

    if (!response.ok || !data?.success) {
      return {
        ok: false,
        reason: response.status === 409 || data?.reason === 'already_paid' ? 'already_paid' : 'unavailable',
      }
    }

    const email = String(data.customer?.email ?? '').trim().toLowerCase()
    const preferredLang = data.customer?.preferredLang
    const langOk = preferredLang === 'ko' || preferredLang === 'en' || preferredLang === 'ja'
    // full 에서만 진짜 이메일을 요구한다. display 응답의 이메일은 가려져 있어 형식 검사를 하지 않는다.
    const emailOk = mode === 'full' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : email.length > 0
    if (
      data.applicationId !== verified.applicationId ||
      data.productSlug !== verified.productSlug ||
      !emailOk ||
      !langOk
    ) {
      console.error('[visa-payment-ref] payment context mismatch', verified.applicationId, mode)
      return { ok: false, reason: 'unavailable' }
    }

    // full 을 요청했는데 deetz 가 가려진 값을 돌려주면(서명 거부) 주문에 쓰지 않는다.
    if (mode === 'full' && data.masked) {
      console.error('[visa-payment-ref] full context refused by deetz', verified.applicationId)
      return { ok: false, reason: 'unavailable' }
    }

    return {
      ok: true,
      context: {
        applicationId: verified.applicationId,
        productSlug: verified.productSlug,
        customer: {
          name: String(data.customer?.name ?? '').trim() || email.split('@')[0] || email,
          email,
          phone: String(data.customer?.phone ?? '').trim(),
          nationality: String(data.customer?.nationality ?? '').trim(),
          preferredLang,
        },
      },
    }
  } catch (error) {
    console.error('[visa-payment-ref] payment context lookup failed', verified.applicationId, error)
    return { ok: false, reason: 'unavailable' }
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
    occurredAt: callbackTimestamp(input.occurredAt),
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

export async function notifyVisaProgramEnrollment(input: {
  externalTrainingOrderId: string
  orderNo: string
  provider: 'toss' | 'paypal'
  amountKrw: number
  occurredAt: string
  productSlug: 'training-and-placement' | 'monthly-training' | 'monthly-training-100'
  customer: {
    name: string
    email: string
    phone?: string | null
    nationality?: string | null
    preferredLang: 'ko' | 'en' | 'ja'
  }
  meta?: Record<string, unknown>
}): Promise<string | null> {
  const secret = process.env.VISA_PAYMENT_LINK_SECRET
  if (!secret) {
    console.error('[visa-payment-ref] VISA_PAYMENT_LINK_SECRET 미설정 — 프로그램 연결 생략', input.orderNo)
    return null
  }
  const base = (process.env.DEETZ_SITE_URL || 'https://deetz.kr').replace(/\/$/, '')
  const body = JSON.stringify({
    kind: 'program_enrollment',
    event: 'paid',
    ...input,
    occurredAt: callbackTimestamp(input.occurredAt),
  })
  try {
    const response = await fetch(`${base}/api/visa/payment-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-visa-signature': sign(body, secret) },
      body,
      signal: AbortSignal.timeout(8000),
    })
    const result = (await response.json().catch(() => null)) as { visaApplicationId?: string; error?: string } | null
    if (!response.ok || !result?.visaApplicationId) {
      console.error('[visa-payment-ref] 프로그램 연결 실패', input.orderNo, response.status, result?.error ?? 'invalid response')
      return null
    }
    return result.visaApplicationId
  } catch (error) {
    console.error('[visa-payment-ref] 프로그램 연결 오류', input.orderNo, error)
    return null
  }
}
