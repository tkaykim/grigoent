import { createClient } from '@supabase/supabase-js'

import type { PaymentOperationExecutionMode } from '@/lib/payment-operation-actors'
import { calculateRefundQuote, currencyPrecision, extractPayPalCapture, extractTossCharge, matchTossCancel } from '@/lib/refund-calculation'
import { tossSecretKey } from '@/lib/toss-keys'
import { notifyVisaCasePayment } from '@/lib/visa-payment-ref'

type Provider = 'toss' | 'paypal'
type RefundExecutionStatus = 'completed' | 'provider_pending' | 'reconciliation_required'

export type RefundResult =
  | {
      ok: true
      status: RefundExecutionStatus
      refundedAmount: number
      providerAmount: number
      providerCurrency: string
      remainingPaidAmount: number
      partial: boolean
      providerRefundId: string | null
      providerStatus: string | null
      idempotent?: boolean
    }
  | { ok: false; status: number; error: string; code?: string }

export type CancellationResult =
  | { ok: true; status: 'completed'; idempotent?: boolean }
  | { ok: false; status: number; error: string; code?: string }

type PaymentRow = {
  id: string
  order_id: string
  sequence: number
  amount: number
  currency: string | null
  status: string
  pg_provider: string | null
  payment_key: string | null
  pg_order_id: string | null
  provider_order_id: string | null
  raw: unknown
}

type RefundLedgerRow = {
  operation_id: string
  payment_id: string
  order_id: string
  ledger_amount_krw: number
  provider_amount: number
  provider_currency: string
  status: string
  provider_refund_id: string | null
  provider_status: string | null
}

function getServiceRole() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const PAYPAL_API_URL =
  process.env.NEXT_PUBLIC_PAYPAL_SANDBOX === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'

async function paypalAccessToken(): Promise<string> {
  const id = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('PayPal 키가 설정되지 않았습니다.')
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error_description || 'PayPal 인증 실패')
  return data.access_token as string
}

function tossHeaders(idempotencyKey?: string): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(`${tossSecretKey()}:`).toString('base64')}`,
    'Content-Type': 'application/json',
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  }
}

function providerCharge(payment: PaymentRow): { amount: number; currency: string; captureId: string | null } {
  if (payment.pg_provider === 'toss') {
    const toss = extractTossCharge(payment.raw)
    return { amount: toss.amount ?? payment.amount, currency: toss.currency, captureId: payment.payment_key }
  }
  if (payment.pg_provider === 'paypal') {
    const capture = extractPayPalCapture(payment.raw)
    if (!capture.amount || !capture.currency) {
      throw new Error('PayPal 승인 통화와 금액을 원결제에서 찾을 수 없습니다.')
    }
    return {
      amount: capture.amount,
      currency: capture.currency,
      captureId: payment.payment_key ?? capture.id,
    }
  }
  throw new Error(`자동 환불을 지원하지 않는 결제수단입니다: ${payment.pg_provider ?? '미상'}`)
}

function existingRefundResult(row: RefundLedgerRow, remainingPaidAmount = 0): RefundResult {
  if (row.status === 'failed') {
    return { ok: false, status: 409, error: '이 환불 요청은 이미 실패로 종료되었습니다. 새 요청을 만들어 주세요.' }
  }
  if (row.status === 'processing') {
    return { ok: false, status: 409, error: '같은 환불 요청이 처리 중입니다. 잠시 후 다시 확인해 주세요.' }
  }
  const status: RefundExecutionStatus =
    row.status === 'completed'
      ? 'completed'
      : row.status === 'pending'
        ? 'provider_pending'
        : 'reconciliation_required'
  return {
    ok: true,
    status,
    refundedAmount: Number(row.ledger_amount_krw),
    providerAmount: Number(row.provider_amount),
    providerCurrency: row.provider_currency,
    remainingPaidAmount,
    partial: remainingPaidAmount > 0,
    providerRefundId: row.provider_refund_id,
    providerStatus: row.provider_status,
    idempotent: true,
  }
}

async function netPaidAmount(orderId: string): Promise<number> {
  const svc = getServiceRole()
  const [{ data: payments, error: paymentError }, { data: refunds, error: refundError }] = await Promise.all([
    svc
      .from('training_order_payments')
      .select('amount, status')
      .eq('order_id', orderId)
      .in('status', ['paid', 'refunded']),
    svc
      .from('training_payment_refunds')
      .select('ledger_amount_krw')
      .eq('order_id', orderId)
      .eq('status', 'completed'),
  ])
  if (paymentError || refundError) {
    throw new Error(paymentError?.message ?? refundError?.message ?? '주문 잔액을 계산하지 못했습니다.')
  }
  const captured = (payments ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
  const refunded = (refunds ?? []).reduce((sum, row) => sum + Number(row.ledger_amount_krw ?? 0), 0)
  return Math.max(0, captured - refunded)
}

async function finalizeCompletedRefund(params: {
  payment: PaymentRow
  ledgerId: string
  fullPaymentRefund: boolean
  reason: string
  provider: Provider
  providerRefundId: string | null
  providerStatus: string | null
  responsePayload: unknown
  refundedLedgerAmount: number
}): Promise<{ remainingPaidAmount: number; reconciliationRequired: boolean }> {
  const svc = getServiceRole()
  const completedAt = new Date().toISOString()
  const { error: ledgerError } = await svc
    .from('training_payment_refunds')
    .update({
      status: 'completed',
      provider_refund_id: params.providerRefundId,
      provider_status: params.providerStatus,
      response_payload: params.responsePayload,
      processed_at: completedAt,
      completed_at: completedAt,
      updated_at: completedAt,
      error_code: null,
      error_message: null,
    })
    .eq('id', params.ledgerId)
  if (ledgerError) {
    console.error('[payment/refund] ledger update failed after provider completion:', ledgerError)
    return { remainingPaidAmount: 0, reconciliationRequired: true }
  }

  const markProjectionFailure = async (message: string) => {
    await svc
      .from('training_payment_refunds')
      .update({
        status: 'reconciliation_required',
        error_code: 'SOURCE_PROJECTION_FAILED',
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.ledgerId)
  }

  const paymentPatch: Record<string, unknown> = {
    status: params.fullPaymentRefund ? 'refunded' : 'paid',
    updated_at: completedAt,
    refund_lock_at: null,
  }
  if (params.fullPaymentRefund) paymentPatch.refunded_at = completedAt
  const { error: paymentError } = await svc
    .from('training_order_payments')
    .update(paymentPatch)
    .eq('id', params.payment.id)

  let remainingPaidAmount = 0
  try {
    remainingPaidAmount = await netPaidAmount(params.payment.order_id)
  } catch (error) {
    console.error('[payment/refund] order balance calculation failed after provider completion:', error)
    await markProjectionFailure(error instanceof Error ? error.message : '주문 잔액 계산에 실패했습니다.')
    return { remainingPaidAmount, reconciliationRequired: true }
  }

  const { data: order, error: orderReadError } = await svc
    .from('training_orders')
    .select('id, order_no, total_amount, visa_application_id')
    .eq('id', params.payment.order_id)
    .maybeSingle()
  const { error: orderUpdateError } = await svc
    .from('training_orders')
    .update({
      paid_amount: remainingPaidAmount,
      status:
        remainingPaidAmount <= 0
          ? 'refunded'
          : remainingPaidAmount >= Number(order?.total_amount ?? 0)
            ? 'completed'
            : 'active',
      updated_at: completedAt,
    })
    .eq('id', params.payment.order_id)

  const reconciliationRequired = Boolean(paymentError || orderReadError || orderUpdateError)
  if (reconciliationRequired) {
    console.error('[payment/refund] source row update failed after provider completion:', {
      paymentError,
      orderReadError,
      orderUpdateError,
    })
    await markProjectionFailure(
      paymentError?.message ?? orderReadError?.message ?? orderUpdateError?.message ?? '원결제 상태 반영에 실패했습니다.',
    )
  }

  if (!reconciliationRequired && order?.visa_application_id && order.order_no && remainingPaidAmount <= 0) {
    await notifyVisaCasePayment({
      applicationId: order.visa_application_id as string,
      event: 'refunded',
      orderNo: order.order_no as string,
      provider: params.provider,
      amountKrw: params.refundedLedgerAmount,
      occurredAt: completedAt,
      meta: { reason: params.reason, sequence: params.payment.sequence, refundId: params.providerRefundId },
    })
  }

  return { remainingPaidAmount, reconciliationRequired }
}

export async function refundPayment(params: {
  operationId: string
  paymentId: string
  reason: string
  amount?: number
  requestedBy?: string | null
  approvedBy?: string | null
  executionMode?: PaymentOperationExecutionMode
}): Promise<RefundResult> {
  const svc = getServiceRole()
  const reason = params.reason.trim().slice(0, 500)
  if (!reason) return { ok: false, status: 400, error: '환불 사유를 입력해 주세요.' }

  const { data: existing } = await svc
    .from('training_payment_refunds')
    .select('*')
    .eq('operation_id', params.operationId)
    .maybeSingle()
  if (existing) return existingRefundResult(existing as RefundLedgerRow)

  const { data, error: paymentError } = await svc
    .from('training_order_payments')
    .select('id, order_id, sequence, amount, currency, status, pg_provider, payment_key, pg_order_id, provider_order_id, raw')
    .eq('id', params.paymentId)
    .maybeSingle()
  const payment = data as PaymentRow | null
  if (paymentError || !payment) return { ok: false, status: 404, error: '결제 건을 찾을 수 없습니다.' }
  if (payment.status !== 'paid') {
    return { ok: false, status: 400, error: '환불 가능한 결제 완료 상태가 아닙니다.' }
  }
  if (!['toss', 'paypal'].includes(payment.pg_provider ?? '')) {
    return { ok: false, status: 400, error: 'Toss 또는 PayPal 결제만 자동 환불할 수 있습니다.' }
  }

  const { data: completedRefunds, error: refundsError } = await svc
    .from('training_payment_refunds')
    .select('ledger_amount_krw, provider_amount')
    .eq('payment_id', payment.id)
    .eq('status', 'completed')
  if (refundsError) return { ok: false, status: 500, error: '기존 환불 이력을 읽지 못했습니다.' }

  let charge: ReturnType<typeof providerCharge>
  try {
    charge = providerCharge(payment)
  } catch (error) {
    return { ok: false, status: 400, error: error instanceof Error ? error.message : 'PG 승인 정보를 확인하지 못했습니다.' }
  }
  const refundedLedgerAmount = (completedRefunds ?? []).reduce(
    (sum, row) => sum + Number(row.ledger_amount_krw ?? 0),
    0,
  )
  const refundedProviderAmount = (completedRefunds ?? []).reduce(
    (sum, row) => sum + Number(row.provider_amount ?? 0),
    0,
  )
  let quote
  try {
    quote = calculateRefundQuote({
      originalLedgerAmount: Number(payment.amount),
      originalProviderAmount: charge.amount,
      ledgerCurrency: 'KRW',
      providerCurrency: charge.currency,
      refundedLedgerAmount,
      refundedProviderAmount,
      requestedLedgerAmount: params.amount ?? Number(payment.amount) - refundedLedgerAmount,
    })
  } catch (error) {
    return { ok: false, status: 400, error: error instanceof Error ? error.message : '환불 금액을 확인해 주세요.' }
  }

  const insertedAt = new Date().toISOString()
  const { data: ledger, error: insertError } = await svc
    .from('training_payment_refunds')
    .insert({
      operation_id: params.operationId,
      payment_id: payment.id,
      order_id: payment.order_id,
      provider: payment.pg_provider,
      ledger_amount_krw: quote.ledgerAmount,
      provider_amount: quote.providerAmount,
      provider_currency: quote.providerCurrency,
      idempotency_key: params.operationId,
      status: 'processing',
      reason,
      requested_by: params.requestedBy ?? null,
      approved_by: params.approvedBy ?? null,
      execution_mode: params.executionMode ?? 'two_person',
      request_payload: {
        ledgerAmountKrw: quote.ledgerAmount,
        providerAmount: quote.providerAmount,
        providerCurrency: quote.providerCurrency,
        full: quote.full,
      },
      requested_at: insertedAt,
      updated_at: insertedAt,
    })
    .select('id')
    .single()
  if (insertError || !ledger) {
    const { data: raced } = await svc
      .from('training_payment_refunds')
      .select('*')
      .eq('operation_id', params.operationId)
      .maybeSingle()
    if (raced) return existingRefundResult(raced as RefundLedgerRow)
    const conflict = insertError?.code === '23505'
    return {
      ok: false,
      status: conflict ? 409 : 500,
      error: conflict ? '이 결제 건에는 이미 진행 중인 환불이 있습니다.' : '환불 원장을 만들지 못했습니다.',
    }
  }

  const { data: claimed, error: claimError } = await svc
    .from('training_order_payments')
    .update({ refund_lock_at: insertedAt })
    .eq('id', payment.id)
    .eq('status', 'paid')
    .is('refund_lock_at', null)
    .select('id')
    .maybeSingle()
  if (claimError || !claimed) {
    await svc
      .from('training_payment_refunds')
      .update({ status: 'failed', error_code: 'REFUND_LOCKED', error_message: '다른 환불이 처리 중입니다.', updated_at: new Date().toISOString() })
      .eq('id', ledger.id)
    return { ok: false, status: 409, error: '다른 환불이 처리 중입니다. 잠시 후 다시 확인해 주세요.' }
  }

  try {
    let response: Response
    let providerBody: Record<string, unknown>
    let providerRefundId: string | null = null
    let providerStatus: string | null = null

    try {
      if (payment.pg_provider === 'toss') {
        if (!payment.payment_key) throw new Error('토스 결제키가 없어 취소할 수 없습니다.')
        const lookup = await fetch(`https://api.tosspayments.com/v1/payments/${payment.payment_key}`, {
          headers: tossHeaders(),
          cache: 'no-store',
        })
        const lookupBody = (await lookup.json()) as Record<string, unknown>
        if (!lookup.ok) {
          await svc.from('training_payment_refunds').update({ status: 'failed', response_payload: lookupBody, error_code: 'TOSS_LOOKUP_FAILED', error_message: String(lookupBody.message ?? '토스 결제를 확인하지 못했습니다.'), updated_at: new Date().toISOString() }).eq('id', ledger.id)
          return { ok: false, status: 502, error: String(lookupBody.message ?? '토스 결제를 확인하지 못했습니다.') }
        }
        const balanceAmount = Number(lookupBody.balanceAmount)
        if (!Number.isFinite(balanceAmount) || balanceAmount < quote.providerAmount) {
          await svc.from('training_payment_refunds').update({ status: 'reconciliation_required', response_payload: lookupBody, error_code: 'TOSS_BALANCE_MISMATCH', error_message: '토스 잔액과 내부 환불 잔액이 일치하지 않습니다.', updated_at: new Date().toISOString() }).eq('id', ledger.id)
          return {
            ok: true,
            status: 'reconciliation_required',
            refundedAmount: quote.ledgerAmount,
            providerAmount: quote.providerAmount,
            providerCurrency: quote.providerCurrency,
            remainingPaidAmount: quote.remainingLedgerBefore,
            partial: !quote.full,
            providerRefundId: null,
            providerStatus: String(lookupBody.status ?? ''),
          }
        }
        response = await fetch(`https://api.tosspayments.com/v1/payments/${payment.payment_key}/cancel`, {
          method: 'POST',
          headers: tossHeaders(params.operationId),
          body: JSON.stringify({ cancelReason: reason, ...(!quote.full ? { cancelAmount: quote.providerAmount } : {}) }),
        })
        providerBody = (await response.json()) as Record<string, unknown>
        const cancel = matchTossCancel(providerBody, {
          amount: quote.providerAmount,
          reason,
          useLastTransactionKey: true,
        }).match
        providerRefundId = cancel?.transactionKey ?? null
        providerStatus = cancel?.status ?? null
      } else {
        if (!charge.captureId) throw new Error('PayPal 캡처 ID를 찾을 수 없습니다.')
        const token = await paypalAccessToken()
        const lookup = await fetch(`${PAYPAL_API_URL}/v2/payments/captures/${charge.captureId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const lookupBody = (await lookup.json()) as Record<string, unknown>
        if (!lookup.ok) {
          await svc.from('training_payment_refunds').update({ status: 'failed', response_payload: lookupBody, error_code: 'PAYPAL_LOOKUP_FAILED', error_message: String(lookupBody.message ?? 'PayPal 결제를 확인하지 못했습니다.'), updated_at: new Date().toISOString() }).eq('id', ledger.id)
          return { ok: false, status: 502, error: String(lookupBody.message ?? 'PayPal 결제를 확인하지 못했습니다.') }
        }
        response = await fetch(`${PAYPAL_API_URL}/v2/payments/captures/${charge.captureId}/refund`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': params.operationId,
          },
          body: JSON.stringify({
            amount: {
              value: quote.providerAmount.toFixed(currencyPrecision(quote.providerCurrency)),
              currency_code: quote.providerCurrency,
            },
            note_to_payer: reason.slice(0, 255),
          }),
        })
        providerBody = (await response.json()) as Record<string, unknown>
        providerRefundId = typeof providerBody.id === 'string' ? providerBody.id : null
        providerStatus = typeof providerBody.status === 'string' ? providerBody.status : null
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PG 응답을 확인하지 못했습니다.'
      console.error('[payment/refund] provider outcome unknown:', error)
      await svc
        .from('training_payment_refunds')
        .update({ status: 'reconciliation_required', error_code: 'PROVIDER_OUTCOME_UNKNOWN', error_message: message, updated_at: new Date().toISOString() })
        .eq('id', ledger.id)
      return {
        ok: true,
        status: 'reconciliation_required',
        refundedAmount: quote.ledgerAmount,
        providerAmount: quote.providerAmount,
        providerCurrency: quote.providerCurrency,
        remainingPaidAmount: quote.remainingLedgerBefore,
        partial: !quote.full,
        providerRefundId: null,
        providerStatus: null,
      }
    }

    if (!response.ok) {
      const message = String(providerBody.message ?? 'PG 환불 요청에 실패했습니다.')
      const uncertain = response.status >= 500 || response.status === 409
      await svc
        .from('training_payment_refunds')
        .update({
          status: uncertain ? 'reconciliation_required' : 'failed',
          response_payload: providerBody,
          provider_refund_id: providerRefundId,
          provider_status: providerStatus,
          error_code: String(providerBody.code ?? providerBody.name ?? `HTTP_${response.status}`),
          error_message: message,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ledger.id)
      if (uncertain) {
        return {
          ok: true,
          status: 'reconciliation_required',
          refundedAmount: quote.ledgerAmount,
          providerAmount: quote.providerAmount,
          providerCurrency: quote.providerCurrency,
          remainingPaidAmount: quote.remainingLedgerBefore,
          partial: !quote.full,
          providerRefundId,
          providerStatus,
        }
      }
      return { ok: false, status: 502, error: message }
    }

    const providerCompleted = payment.pg_provider === 'toss'
      ? providerStatus === 'DONE'
      : providerStatus === 'COMPLETED'
    if (!providerCompleted) {
      await svc
        .from('training_payment_refunds')
        .update({
          status: 'pending',
          provider_refund_id: providerRefundId,
          provider_status: providerStatus,
          response_payload: providerBody,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ledger.id)
      return {
        ok: true,
        status: 'provider_pending',
        refundedAmount: quote.ledgerAmount,
        providerAmount: quote.providerAmount,
        providerCurrency: quote.providerCurrency,
        remainingPaidAmount: quote.remainingLedgerBefore,
        partial: !quote.full,
        providerRefundId,
        providerStatus,
      }
    }

    const finalized = await finalizeCompletedRefund({
      payment,
      ledgerId: ledger.id as string,
      fullPaymentRefund: quote.full,
      reason,
      provider: payment.pg_provider as Provider,
      providerRefundId,
      providerStatus,
      responsePayload: providerBody,
      refundedLedgerAmount: quote.ledgerAmount,
    })
    return {
      ok: true,
      status: finalized.reconciliationRequired ? 'reconciliation_required' : 'completed',
      refundedAmount: quote.ledgerAmount,
      providerAmount: quote.providerAmount,
      providerCurrency: quote.providerCurrency,
      remainingPaidAmount: finalized.remainingPaidAmount,
      partial: !quote.full,
      providerRefundId,
      providerStatus,
    }
  } finally {
    await svc.from('training_order_payments').update({ refund_lock_at: null }).eq('id', payment.id)
  }
}

export async function cancelPendingPayment(params: {
  operationId: string
  paymentId: string
  reason: string
}): Promise<CancellationResult> {
  const svc = getServiceRole()
  const { data, error } = await svc
    .from('training_order_payments')
    .select('id, order_id, sequence, amount, currency, status, pg_provider, payment_key, pg_order_id, provider_order_id, raw')
    .eq('id', params.paymentId)
    .maybeSingle()
  const payment = data as PaymentRow | null
  if (error || !payment) return { ok: false, status: 404, error: '결제 건을 찾을 수 없습니다.' }
  if (payment.status === 'cancelled') return { ok: true, status: 'completed', idempotent: true }
  if (!['pending', 'failed'].includes(payment.status)) {
    return { ok: false, status: 400, error: '결제 전 대기·실패 건만 취소할 수 있습니다.' }
  }
  if (payment.payment_key) {
    return { ok: false, status: 409, error: '이미 PG 승인키가 있는 결제입니다. 취소가 아니라 환불로 처리해 주세요.' }
  }

  try {
    if (payment.pg_provider === 'toss' && payment.pg_order_id) {
      const response = await fetch(`https://api.tosspayments.com/v1/payments/orders/${payment.pg_order_id}`, {
        headers: tossHeaders(),
        cache: 'no-store',
      })
      const body = (await response.json()) as Record<string, unknown>
      if (response.ok) {
        const status = String(body.status ?? '')
        if (['DONE', 'PARTIAL_CANCELED'].includes(status)) {
          return { ok: false, status: 409, error: '토스에서 승인된 결제로 확인되었습니다. 환불로 처리해 주세요.' }
        }
      } else if (response.status >= 500) {
        return { ok: false, status: 502, error: '토스 결제 상태를 확인하지 못해 취소하지 않았습니다.' }
      }
    }
    if (payment.pg_provider === 'paypal' && payment.provider_order_id) {
      const token = await paypalAccessToken()
      const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${payment.provider_order_id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const body = (await response.json()) as Record<string, unknown>
      if (!response.ok) {
        return { ok: false, status: 502, error: 'PayPal 주문 상태를 확인하지 못해 취소하지 않았습니다.' }
      }
      if (String(body.status ?? '') === 'COMPLETED') {
        return { ok: false, status: 409, error: 'PayPal에서 승인된 결제로 확인되었습니다. 환불로 처리해 주세요.' }
      }
    }
  } catch (error) {
    console.error('[payment/cancel] provider lookup failed:', error)
    return { ok: false, status: 502, error: 'PG 상태를 확인하지 못해 취소하지 않았습니다.' }
  }

  const now = new Date().toISOString()
  const { data: cancelled, error: updateError } = await svc
    .from('training_order_payments')
    .update({ status: 'cancelled', failure_reason: params.reason.slice(0, 500), updated_at: now })
    .eq('id', payment.id)
    .in('status', ['pending', 'failed'])
    .select('id')
    .maybeSingle()
  if (updateError || !cancelled) {
    return { ok: false, status: 409, error: '결제 상태가 변경되어 취소하지 않았습니다. 최신 상태를 다시 확인해 주세요.' }
  }

  const { data: activePayments } = await svc
    .from('training_order_payments')
    .select('id')
    .eq('order_id', payment.order_id)
    .in('status', ['pending', 'failed', 'paid'])
    .limit(1)
  if (!activePayments?.length) {
    await svc.from('training_orders').update({ status: 'cancelled', updated_at: now }).eq('id', payment.order_id)
  }
  return { ok: true, status: 'completed' }
}

export async function reconcileRefundPayment(operationId: string): Promise<RefundResult> {
  const svc = getServiceRole()
  const { data: ledgerData, error: ledgerError } = await svc
    .from('training_payment_refunds')
    .select('*')
    .eq('operation_id', operationId)
    .maybeSingle()
  if (ledgerError || !ledgerData) return { ok: false, status: 404, error: '환불 원장을 찾을 수 없습니다.' }
  const ledger = ledgerData as RefundLedgerRow & {
    id: string
    reason: string
    response_payload: unknown
  }
  if (ledger.status === 'completed') return existingRefundResult(ledger)
  if (ledger.status === 'failed') return existingRefundResult(ledger)

  const { data, error: paymentError } = await svc
    .from('training_order_payments')
    .select('id, order_id, sequence, amount, currency, status, pg_provider, payment_key, pg_order_id, provider_order_id, raw')
    .eq('id', ledger.payment_id)
    .maybeSingle()
  const payment = data as PaymentRow | null
  if (paymentError || !payment) return { ok: false, status: 404, error: '원결제 건을 찾을 수 없습니다.' }
  const provider = payment.pg_provider as Provider | null
  if (!provider || !payment.payment_key) return { ok: false, status: 400, error: 'PG 거래 정보를 찾을 수 없습니다.' }

  let body: Record<string, unknown>
  let providerRefundId = ledger.provider_refund_id
  let providerStatus: string | null = null
  try {
    if (provider === 'toss') {
      const response = await fetch(`https://api.tosspayments.com/v1/payments/${payment.payment_key}`, {
        headers: tossHeaders(),
        cache: 'no-store',
      })
      body = (await response.json()) as Record<string, unknown>
      if (!response.ok) return { ok: false, status: 502, error: String(body.message ?? '토스 환불 상태를 확인하지 못했습니다.') }
      const resolved = matchTossCancel(body, {
        transactionKey: providerRefundId,
        amount: Number(ledger.provider_amount),
        reason: ledger.reason,
      })
      if (!resolved.match) {
        const message = resolved.ambiguous
          ? '같은 금액과 사유의 토스 환불이 여러 건이라 자동으로 거래를 특정할 수 없습니다.'
          : '토스 응답에서 해당 환불 거래를 찾지 못했습니다.'
        await svc.from('training_payment_refunds').update({ status: 'reconciliation_required', response_payload: body, error_code: resolved.ambiguous ? 'TOSS_REFUND_AMBIGUOUS' : 'TOSS_REFUND_NOT_FOUND', error_message: message, updated_at: new Date().toISOString() }).eq('id', ledger.id)
        return {
          ok: true,
          status: 'reconciliation_required',
          refundedAmount: Number(ledger.ledger_amount_krw),
          providerAmount: Number(ledger.provider_amount),
          providerCurrency: ledger.provider_currency,
          remainingPaidAmount: await netPaidAmount(payment.order_id),
          partial: true,
          providerRefundId,
          providerStatus: null,
        }
      }
      providerRefundId = resolved.match.transactionKey ?? providerRefundId
      providerStatus = resolved.match.status
    } else {
      if (!providerRefundId) {
        return {
          ok: true,
          status: 'reconciliation_required',
          refundedAmount: Number(ledger.ledger_amount_krw),
          providerAmount: Number(ledger.provider_amount),
          providerCurrency: ledger.provider_currency,
          remainingPaidAmount: await netPaidAmount(payment.order_id),
          partial: true,
          providerRefundId: null,
          providerStatus: null,
        }
      }
      const token = await paypalAccessToken()
      const response = await fetch(`${PAYPAL_API_URL}/v2/payments/refunds/${providerRefundId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      body = (await response.json()) as Record<string, unknown>
      if (!response.ok) return { ok: false, status: 502, error: String(body.message ?? 'PayPal 환불 상태를 확인하지 못했습니다.') }
      providerStatus = typeof body.status === 'string' ? body.status : null
    }
  } catch (error) {
    return { ok: false, status: 502, error: error instanceof Error ? error.message : 'PG 환불 상태를 확인하지 못했습니다.' }
  }

  const completed = provider === 'toss' ? providerStatus === 'DONE' : providerStatus === 'COMPLETED'
  const failed = provider === 'paypal' && providerStatus === 'FAILED'
  if (failed) {
    await svc.from('training_payment_refunds').update({ status: 'failed', provider_refund_id: providerRefundId, provider_status: providerStatus, response_payload: body, error_code: 'PROVIDER_REFUND_FAILED', error_message: 'PG에서 환불 실패로 확인되었습니다.', processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', ledger.id)
    return { ok: false, status: 409, error: 'PG에서 환불 실패로 확인되었습니다.' }
  }
  if (!completed) {
    await svc.from('training_payment_refunds').update({ status: 'pending', provider_refund_id: providerRefundId, provider_status: providerStatus, response_payload: body, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', ledger.id)
    return {
      ok: true,
      status: 'provider_pending',
      refundedAmount: Number(ledger.ledger_amount_krw),
      providerAmount: Number(ledger.provider_amount),
      providerCurrency: ledger.provider_currency,
      remainingPaidAmount: await netPaidAmount(payment.order_id),
      partial: true,
      providerRefundId,
      providerStatus,
    }
  }

  const { data: completedRefunds } = await svc
    .from('training_payment_refunds')
    .select('ledger_amount_krw')
    .eq('payment_id', payment.id)
    .eq('status', 'completed')
  const previouslyRefunded = (completedRefunds ?? []).reduce((sum, row) => sum + Number(row.ledger_amount_krw ?? 0), 0)
  const full = previouslyRefunded + Number(ledger.ledger_amount_krw) >= Number(payment.amount)
  const finalized = await finalizeCompletedRefund({
    payment,
    ledgerId: ledger.id,
    fullPaymentRefund: full,
    reason: ledger.reason,
    provider,
    providerRefundId,
    providerStatus,
    responsePayload: body,
    refundedLedgerAmount: Number(ledger.ledger_amount_krw),
  })
  return {
    ok: true,
    status: finalized.reconciliationRequired ? 'reconciliation_required' : 'completed',
    refundedAmount: Number(ledger.ledger_amount_krw),
    providerAmount: Number(ledger.provider_amount),
    providerCurrency: ledger.provider_currency,
    remainingPaidAmount: finalized.remainingPaidAmount,
    partial: !full,
    providerRefundId,
    providerStatus,
  }
}
