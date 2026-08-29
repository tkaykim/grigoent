import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { cancelPendingPayment, reconcileRefundPayment, refundPayment } from '@/lib/payment-refund'
import { verifyPaymentCommand } from '@/lib/payment-command-auth'
import { validatePaymentOperationActors } from '@/lib/payment-operation-actors'

const bodySchema = z
  .object({
    operationId: z.string().uuid(),
    action: z.enum(['cancel', 'refund', 'reconcile']),
    paymentId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
    amount: z.number().int().positive().optional(),
    requestedBy: z.string().uuid().nullable().optional(),
    approvedBy: z.string().uuid().nullable().optional(),
    executionMode: z.enum(['two_person', 'direct']).default('two_person'),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'refund' && !value.amount) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: '환불 금액이 필요합니다.' })
    }
    const actorError = validatePaymentOperationActors(value)
    if (actorError) ctx.addIssue({ code: 'custom', path: ['approvedBy'], message: actorError })
  })

export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (
    !verifyPaymentCommand(
      raw,
      request.headers.get('x-payment-timestamp'),
      request.headers.get('x-payment-signature'),
    )
  ) {
    return NextResponse.json({ ok: false, error: '서명을 확인할 수 없습니다.' }, { status: 401 })
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON 요청이 아닙니다.' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.' },
      { status: 400 },
    )
  }

  const input = parsed.data
  const result = input.action === 'reconcile'
    ? await reconcileRefundPayment(input.operationId)
    : input.action === 'refund'
    ? await refundPayment({
        operationId: input.operationId,
        paymentId: input.paymentId,
        reason: input.reason,
        amount: input.amount,
        requestedBy: input.requestedBy,
        approvedBy: input.approvedBy,
        executionMode: input.executionMode,
      })
    : await cancelPendingPayment({
        operationId: input.operationId,
        paymentId: input.paymentId,
        reason: input.reason,
      })

  return NextResponse.json(result, { status: result.ok ? 200 : result.status })
}
