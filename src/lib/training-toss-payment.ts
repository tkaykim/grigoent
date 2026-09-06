import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendTrainingPaymentFailureEmail } from '@/lib/email'
import { createVisaPaymentRef, notifyVisaCasePayment } from '@/lib/visa-payment-ref'
import { trainingRetryPath } from '@/lib/training-checkout-client'
import { loadVisaDocumentProductSlug, syncPaidProgramOrderToDeetz } from '@/lib/visa-program-sync'
import { sendPaymentReceipt } from '@/lib/payment-receipt'
import { TOSS_USE_LIVE, tossSecretKey } from '@/lib/toss-keys'
import { missingPaymentExpired, tossRecoveryAction } from '@/lib/training-toss-state'

type TossPayment = {
  paymentKey?: string
  orderId?: string
  status?: string
  method?: string | null
  requestedAt?: string | null
  approvedAt?: string | null
  totalAmount?: number
  balanceAmount?: number
  receipt?: { url?: string | null } | null
  code?: string
  message?: string
  [key: string]: unknown
}

type PaymentRow = {
  id: string
  order_id: string
  sequence: number
  amount: number
  status: string
  payment_key: string | null
  pg_order_id: string
  created_at?: string | null
}

type OrderRow = {
  id: string
  product_id: string
  order_no: string
  total_amount: number
  paid_amount?: number | null
  installment_months: number
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_nationality: string | null
  preferred_lang?: string | null
  visa_application_id: string | null
  discount_code: string | null
  billing_customer_key?: string | null
}

export type TrainingTossResult = {
  status: number
  body: {
    success: boolean
    state: 'paid' | 'waiting' | 'failed' | 'abandoned'
    orderNo?: string | null
    sequence?: number
    installmentMonths?: number
    paidAmount?: number
    totalAmount?: number
    receiptUrl?: string | null
    documentIntakeReady?: boolean
    idempotent?: boolean
    charged?: boolean
    error?: string
    code?: string
    pgStatus?: string | null
  }
}

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function tossAuthorization(): string | null {
  const secretKey = tossSecretKey()
  return secretKey ? `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}` : null
}

function logPostPaymentFailure(step: string, orderNo: string | null, error: unknown) {
  if (!error) return
  console.error('[POST-PAYMENT-DB-FAILURE]', JSON.stringify({ step, orderNo, error }))
}

async function getPaymentRow(supabase: SupabaseClient, orderId: string): Promise<PaymentRow | null> {
  const { data, error } = await supabase
    .from('training_order_payments')
    .select('id, order_id, sequence, amount, status, payment_key, pg_order_id, created_at')
    .eq('pg_order_id', orderId)
    .maybeSingle()

  if (error) throw error
  return data as PaymentRow | null
}

async function getOrderRow(supabase: SupabaseClient, orderId: string): Promise<OrderRow | null> {
  const { data, error } = await supabase
    .from('training_orders')
    .select(
      'id, product_id, order_no, total_amount, paid_amount, installment_months, customer_name, customer_email, customer_phone, customer_nationality, preferred_lang, visa_application_id, discount_code, billing_customer_key',
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw error
  return data as OrderRow | null
}

async function getPaidAmount(supabase: SupabaseClient, orderId: string): Promise<number> {
  const { data, error } = await supabase
    .from('training_order_payments')
    .select('amount')
    .eq('order_id', orderId)
    .eq('status', 'paid')

  if (error) throw error
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
}

async function paidResult(
  supabase: SupabaseClient,
  payment: PaymentRow,
  order: OrderRow,
  receiptUrl?: string | null,
  idempotent = false,
): Promise<TrainingTossResult> {
  const paidAmount = await getPaidAmount(supabase, order.id)
  const isComplete = paidAmount >= order.total_amount
  const productSlug = isComplete
    ? await loadVisaDocumentProductSlug(supabase, order.product_id)
    : null
  let documentIntakeReady = false
  if (order.visa_application_id && isComplete) {
    const callbackSynced = await notifyVisaCasePayment({
      applicationId: order.visa_application_id,
      event: 'paid',
      orderNo: order.order_no,
      provider: 'toss',
      amountKrw: paidAmount,
      occurredAt: new Date().toISOString(),
      meta: { sequence: payment.sequence, reconciled: true, customerEmail: order.customer_email },
    })
    documentIntakeReady = Boolean(productSlug && callbackSynced)
  } else if (productSlug) {
    documentIntakeReady = Boolean(await syncPaidProgramOrderToDeetz(supabase, {
      id: order.id,
      orderNo: order.order_no,
      productId: order.product_id,
      visaApplicationId: null,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      customerNationality: order.customer_nationality,
      preferredLang: order.preferred_lang ?? null,
      provider: 'toss',
      amountKrw: paidAmount,
      occurredAt: new Date().toISOString(),
      meta: { reconciled: true },
    }))
  }
  return {
    status: 200,
    body: {
      success: true,
      state: 'paid',
      orderNo: order.order_no,
      sequence: payment.sequence,
      installmentMonths: order.installment_months,
      paidAmount,
      totalAmount: order.total_amount,
      receiptUrl: receiptUrl ?? null,
      documentIntakeReady,
      idempotent,
      charged: true,
      pgStatus: 'DONE',
    },
  }
}

async function finalizeApprovedPayment(
  supabase: SupabaseClient,
  payment: PaymentRow,
  tossData: TossPayment,
): Promise<TrainingTossResult> {
  const paidAt = tossData.approvedAt ? new Date(tossData.approvedAt).toISOString() : new Date().toISOString()
  const receiptUrl = tossData.receipt?.url ?? null

  const { error: paidUpdateError } = await supabase
    .from('training_order_payments')
    .update({
      status: 'paid',
      pg_provider: 'toss',
      payment_key: tossData.paymentKey ?? payment.payment_key,
      paid_at: paidAt,
      receipt_url: receiptUrl,
      failure_reason: null,
      raw: tossData,
      updated_at: paidAt,
    })
    .eq('id', payment.id)
    .in('status', ['pending', 'failed', 'abandoned', 'paid'])
  logPostPaymentFailure('payment_row_paid', payment.pg_order_id, paidUpdateError)

  const order = await getOrderRow(supabase, payment.order_id)
  if (!order) {
    return {
      status: 200,
      body: {
        success: true,
        state: 'paid',
        charged: true,
        orderNo: null,
        paidAmount: payment.amount,
        totalAmount: payment.amount,
        receiptUrl,
        pgStatus: tossData.status ?? 'DONE',
      },
    }
  }

  const paidAmount = await getPaidAmount(supabase, order.id)
  const isComplete = paidAmount >= order.total_amount
  const { error: orderUpdateError } = await supabase
    .from('training_orders')
    .update({
      paid_amount: paidAmount,
      status: isComplete ? 'completed' : 'active',
      updated_at: paidAt,
    })
    .eq('id', order.id)
  logPostPaymentFailure('order_totals', order.order_no, orderUpdateError)

  if (order.discount_code) {
    await supabase
      .from('training_discount_redemptions')
      .update({ confirmed_at: paidAt, updated_at: paidAt })
      .eq('order_id', order.id)
  }

  const productSlug = isComplete
    ? await loadVisaDocumentProductSlug(supabase, order.product_id)
    : null
  let documentIntakeReady = false
  if (order.visa_application_id && isComplete) {
    const callbackSynced = await notifyVisaCasePayment({
      applicationId: order.visa_application_id,
      event: 'paid',
      orderNo: order.order_no,
      provider: 'toss',
      amountKrw: paidAmount,
      occurredAt: paidAt,
      meta: {
        paymentKey: tossData.paymentKey ?? payment.payment_key,
        sequence: payment.sequence,
        receiptUrl,
        customerEmail: order.customer_email,
        recovered: true,
      },
    })
    documentIntakeReady = Boolean(productSlug && callbackSynced)
  } else if (productSlug) {
    documentIntakeReady = Boolean(await syncPaidProgramOrderToDeetz(supabase, {
      id: order.id,
      orderNo: order.order_no,
      productId: order.product_id,
      visaApplicationId: null,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      customerNationality: order.customer_nationality,
      preferredLang: order.preferred_lang ?? null,
      provider: 'toss',
      amountKrw: paidAmount,
      occurredAt: paidAt,
      meta: { paymentKey: tossData.paymentKey ?? payment.payment_key, sequence: payment.sequence, receiptUrl },
    }))
  }

  await sendPaymentReceipt(supabase, {
    paymentId: payment.id,
    orderId: order.id,
    provider: 'toss',
    paidAmount,
    paidAt,
    receiptUrl,
  })

  return {
    status: 200,
    body: {
      success: true,
      state: 'paid',
      orderNo: order.order_no,
      sequence: payment.sequence,
      installmentMonths: order.installment_months,
      paidAmount,
      totalAmount: order.total_amount,
      receiptUrl,
      documentIntakeReady,
      charged: true,
      pgStatus: tossData.status ?? 'DONE',
    },
  }
}

// 같은 이메일·같은 상품으로 결제 완료(paid)된 다른 주문이 있는지 확인한다.
async function hasPaidSiblingOrder(supabase: SupabaseClient, order: OrderRow): Promise<boolean> {
  const email = (order.customer_email ?? '').trim().toLowerCase()
  if (!email) return false
  const { data, error } = await supabase
    .from('training_orders')
    .select('id, training_order_payments!inner(status)')
    .eq('product_id', order.product_id)
    .neq('id', order.id)
    .ilike('customer_email', email)
    .eq('training_order_payments.status', 'paid')
    .limit(1)
  if (error) {
    console.error('[training/payment-recovery] sibling paid lookup failed', order.order_no, error)
    return false
  }
  return (data ?? []).length > 0
}

async function markPaymentFailed(
  supabase: SupabaseClient,
  payment: PaymentRow,
  tossData: TossPayment,
  reason: string,
  code?: string,
): Promise<TrainingTossResult> {
  const failedAt = new Date().toISOString()
  const { data: claimed, error } = await supabase
    .from('training_order_payments')
    .update({
      status: 'failed',
      failure_reason: reason,
      raw: tossData,
      updated_at: failedAt,
    })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) throw error

  const order = await getOrderRow(supabase, payment.order_id)
  if (order) {
    // 같은 사람이 같은 상품을 이미 결제 완료했으면 실패 메일을 보내지 않는다.
    // (첫 결제창을 닫고 바로 다시 결제해 성공한 경우, 30분 뒤 옛 시도가 만료 처리되며
    //  "결제 실패" 메일이 성공 메일 뒤에 도착해 고객을 혼란시킨 사고 — 2026-09-04 hwanhee 건)
    const alreadyPaidElsewhere = claimed && order.customer_email
      ? await hasPaidSiblingOrder(supabase, order)
      : false
    if (alreadyPaidElsewhere) {
      console.info('[training/payment-recovery] failure email skipped — sibling order already paid', order.order_no)
    }
    if (claimed && order.customer_email && !alreadyPaidElsewhere) {
      try {
        const { data: product, error: productError } = await supabase
          .from('training_products').select('slug').eq('id', order.product_id).single()
        if (productError || !product) throw productError ?? new Error('Retry product not found')
        const ref = order.visa_application_id
          ? createVisaPaymentRef(order.visa_application_id, product.slug)
          : undefined
        await sendTrainingPaymentFailureEmail({
          to: order.customer_email,
          name: order.customer_name ?? order.customer_email,
          lang: order.preferred_lang,
          orderNo: order.order_no,
          amount: payment.amount,
          retryPath: trainingRetryPath(product.slug, ref, order.preferred_lang),
        })
      } catch (mailError) {
        console.error('[training/payment-recovery] failure email failed', order.order_no, mailError)
      }
    }
  }

  return {
    status: 409,
    body: {
      success: false,
      state: 'failed',
      orderNo: order?.order_no ?? null,
      charged: false,
      error: reason,
      code,
      pgStatus: tossData.status ?? null,
    },
  }
}

async function markPaymentAbandoned(
  supabase: SupabaseClient,
  payment: PaymentRow,
  tossData: TossPayment,
  reason: string,
  code?: string,
): Promise<TrainingTossResult> {
  const abandonedAt = new Date().toISOString()
  const { error } = await supabase
    .from('training_order_payments')
    .update({
      status: 'abandoned',
      failure_reason: reason,
      raw: tossData,
      updated_at: abandonedAt,
    })
    .eq('id', payment.id)
    .eq('status', 'pending')

  if (error) throw error

  const order = await getOrderRow(supabase, payment.order_id)
  return {
    status: 409,
    body: {
      success: false,
      state: 'abandoned',
      orderNo: order?.order_no ?? null,
      charged: false,
      error: reason,
      code,
      pgStatus: tossData.status ?? null,
    },
  }
}

export async function lookupTossPayment(orderId: string): Promise<{
  ok: boolean
  status: number
  data: TossPayment
}> {
  const authorization = tossAuthorization()
  if (!authorization) {
    return { ok: false, status: 500, data: { code: 'PAYMENT_NOT_CONFIGURED', message: '결제 설정이 완료되지 않았습니다.' } }
  }

  const response = await fetch(
    `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`,
    { headers: { Authorization: authorization }, cache: 'no-store' },
  )
  return { ok: response.ok, status: response.status, data: (await response.json()) as TossPayment }
}

export async function confirmTrainingTossPayment(input: {
  paymentKey: string
  orderId: string
  amount: number
}): Promise<TrainingTossResult> {
  const supabase = getSupabase()
  const payment = await getPaymentRow(supabase, input.orderId)
  if (!payment) {
    return { status: 404, body: { success: false, state: 'failed', charged: false, error: '주문을 찾을 수 없습니다.' } }
  }

  const order = await getOrderRow(supabase, payment.order_id)
  if (payment.status === 'paid' && order) return paidResult(supabase, payment, order, undefined, true)
  if (['cancelled', 'refunded'].includes(payment.status)) {
    return {
      status: 409,
      body: {
        success: false,
        state: 'failed',
        charged: false,
        error: '취소 또는 환불된 결제 요청입니다. 새 주문으로 진행해 주세요.',
      },
    }
  }

  if (payment.amount !== input.amount) {
    console.error('[training/confirm] amount mismatch', { expected: payment.amount, received: input.amount })
    return {
      status: 400,
      body: { success: false, state: 'failed', charged: false, error: '결제 금액이 일치하지 않습니다.' },
    }
  }

  const authorization = tossAuthorization()
  if (!authorization) {
    return {
      status: 500,
      body: { success: false, state: 'waiting', error: '결제 설정이 완료되지 않았습니다.' },
    }
  }

  if (
    process.env.VERCEL_ENV === 'production' &&
    !TOSS_USE_LIVE &&
    process.env.TOSS_ALLOW_TEST_IN_PROD !== 'true'
  ) {
    console.error('[training/confirm] BLOCKED: test-key confirm attempted in production', { orderId: input.orderId })
    return {
      status: 503,
      body: {
        success: false,
        state: 'failed',
        charged: false,
        error: '결제 환경 설정 오류로 결제를 완료할 수 없습니다. 카드에는 청구되지 않았습니다.',
      },
    }
  }

  const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const tossData = (await tossResponse.json()) as TossPayment

  if (!tossResponse.ok) {
    console.error('[training/confirm] toss confirm failed:', tossData)

    // 응답 유실·동시 승인으로 PG만 DONE인 경우 실패로 덮지 않고 DB를 복구한다.
    const lookup = await lookupTossPayment(input.orderId).catch(() => null)
    if (lookup?.ok && lookup.data.status === 'DONE') {
      return finalizeApprovedPayment(supabase, payment, lookup.data)
    }

    return markPaymentFailed(
      supabase,
      payment,
      lookup?.data ?? tossData,
      tossData.message ?? '결제 승인에 실패했습니다.',
      tossData.code,
    )
  }

  return finalizeApprovedPayment(supabase, payment, tossData)
}

export async function recoverTrainingTossPayment(input: {
  orderId: string
  customerKey?: string
}): Promise<TrainingTossResult> {
  const supabase = getSupabase()
  const payment = await getPaymentRow(supabase, input.orderId)
  if (!payment) {
    return { status: 404, body: { success: false, state: 'failed', charged: false, error: '주문을 찾을 수 없습니다.' } }
  }

  const order = await getOrderRow(supabase, payment.order_id)
  if (!order) {
    return { status: 404, body: { success: false, state: 'failed', charged: false, error: '주문을 찾을 수 없습니다.' } }
  }

  if (input.customerKey !== undefined && order.billing_customer_key !== input.customerKey) {
    return { status: 404, body: { success: false, state: 'failed', charged: false, error: '주문을 찾을 수 없습니다.' } }
  }

  if (payment.status === 'paid') return paidResult(supabase, payment, order, undefined, true)
  if (payment.status === 'abandoned') {
    return {
      status: 409,
      body: {
        success: false,
        state: 'abandoned',
        orderNo: order.order_no,
        charged: false,
        error: '결제창 인증이 완료되지 않아 결제가 종료되었습니다. 카드에는 청구되지 않았습니다.',
        code: 'NOT_FOUND_PAYMENT',
        pgStatus: 'ABORTED',
      },
    }
  }
  if (['cancelled', 'refunded'].includes(payment.status)) {
    return {
      status: 409,
      body: {
        success: false,
        state: 'failed',
        charged: false,
        error: '취소 또는 환불된 결제 요청입니다. 새 주문으로 진행해 주세요.',
      },
    }
  }

  const lookup = await lookupTossPayment(input.orderId)
  if (!lookup.ok) {
    if (lookup.status === 404) {
      if (missingPaymentExpired(payment.created_at)) {
        return markPaymentAbandoned(
          supabase,
          payment,
          { status: 'ABORTED', code: 'NOT_FOUND_PAYMENT' },
          '결제창에서 카드 또는 계좌 인증이 완료되지 않았습니다. 카드에는 청구되지 않았습니다.',
          'NOT_FOUND_PAYMENT',
        )
      }
      return {
        status: 202,
        body: {
          success: false,
          state: 'waiting',
          orderNo: order.order_no,
          charged: false,
          error: '결제창에서 카드 또는 계좌 인증을 기다리고 있습니다.',
          pgStatus: null,
        },
      }
    }
    return {
      status: 502,
      body: {
        success: false,
        state: 'waiting',
        orderNo: order.order_no,
        error: '결제 결과를 다시 확인하고 있습니다.',
        pgStatus: lookup.data.status ?? null,
      },
    }
  }

  const pgStatus = lookup.data.status
  const action = tossRecoveryAction(pgStatus)
  if (action === 'finalize') return finalizeApprovedPayment(supabase, payment, lookup.data)
  if (action === 'confirm' && lookup.data.paymentKey && typeof lookup.data.totalAmount === 'number') {
    return confirmTrainingTossPayment({
      paymentKey: lookup.data.paymentKey,
      orderId: input.orderId,
      amount: lookup.data.totalAmount,
    })
  }
  if (action === 'abandon') {
    return markPaymentAbandoned(
      supabase,
      payment,
      lookup.data,
      '결제창 인증을 완료하지 않고 종료했습니다. 카드에는 청구되지 않았습니다.',
      pgStatus,
    )
  }
  if (action === 'fail') {
    const message =
      pgStatus === 'EXPIRED'
        ? '결제 승인 시간이 만료되어 결제가 완료되지 않았습니다. 카드에는 청구되지 않았습니다.'
        : '결제가 취소되거나 승인되지 않았습니다. 카드에는 청구되지 않았습니다.'
    return markPaymentFailed(supabase, payment, lookup.data, message, pgStatus)
  }

  return {
    status: 202,
    body: {
      success: false,
      state: 'waiting',
      orderNo: order.order_no,
      charged: false,
      error:
        pgStatus === 'READY'
          ? '결제창에서 카드 또는 계좌 인증을 기다리고 있습니다.'
          : '결제 결과를 확인하고 있습니다.',
      pgStatus: pgStatus ?? null,
    },
  }
}
