import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { TrainingClient } from './TrainingClient'
import type { PersonalPaymentContext } from './TrainingClient'
import { foreignQuote } from '@/lib/paypal-fx'
import { TRAINING_PRODUCT_SLUG, type TrainingPlan, type TrainingProduct } from '@/lib/training-package'
import { resolveVisaPaymentContext } from '@/lib/visa-payment-ref'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '한국 활동 준비 트레이닝 패키지 - 그리고 엔터테인먼트',
  description:
    '전문 댄스 트레이닝, 한국어 교육, 한국 댄스 업계 실무 교육으로 구성된 GRIGO 교육 패키지입니다. 결제 금액과 결제 수단을 확인한 뒤 결제하실 수 있습니다.',
  alternates: { canonical: '/training' },
  openGraph: {
    title: '한국 활동 준비 트레이닝 패키지 - 그리고 엔터테인먼트',
    description: '전문 댄스 트레이닝과 한국어·업계 교육으로 구성된 GRIGO 교육 패키지 결제 페이지입니다.',
    url: 'https://grigoent.co.kr/training',
    type: 'website',
  },
}

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  // deetz 케이스에서 발급한 개인 결제 링크 토큰.
  // 화면에서는 신청 정보(가려진 값)와 관리자가 정한 결제 금액을 보여 주고,
  // 실제 청구 금액은 checkout 이 deetz 에서 다시 받아 확정한다.
  const { ref } = await searchParams
  const paymentContextResult = ref ? await resolveVisaPaymentContext(ref, 'display') : null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: productRow } = await supabase
    .from('training_products')
    .select('id, slug, title, subtitle, description, highlights, currency, i18n')
    .eq('slug', TRAINING_PRODUCT_SLUG)
    .eq('is_active', true)
    .maybeSingle()

  let plans: TrainingPlan[] = []
  if (productRow) {
    const { data: planRows } = await supabase
      .from('training_price_plans')
      .select('id, code, label, plan_type, installment_months, amount_per_charge, total_amount, currency, note, sort_order, i18n')
      .eq('product_id', productRow.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    plans = (planRows ?? []) as unknown as TrainingPlan[]
  }

  const product = productRow
    ? ({
        ...productRow,
        highlights: Array.isArray(productRow.highlights) ? (productRow.highlights as string[]) : [],
      } as TrainingProduct)
    : null

  // 링크에 금액이 정해져 있으면 일시불 요금제 하나만, 그 금액으로 보여 준다.
  const linkAmount = paymentContextResult?.ok ? paymentContextResult.context.amountKrw : null
  if (linkAmount !== null) {
    plans = plans
      .filter((plan) => plan.installment_months === 1)
      .slice(0, 1)
      .map((plan) => ({ ...plan, amount_per_charge: linkAmount, total_amount: linkAmount }))
  }

  const firstPlan = plans[0] ?? null
  const personalPayment: PersonalPaymentContext | undefined = paymentContextResult?.ok
    ? {
        ...paymentContextResult.context.customer,
        preferredMethod: 'paypal',
        paypalQuote: firstPlan ? foreignQuote(firstPlan.amount_per_charge) : null,
      }
    : undefined

  return (
    <TrainingClient
      product={product}
      plans={plans}
      paymentRef={ref}
      personalPayment={personalPayment}
      paymentLinkError={ref && paymentContextResult && !paymentContextResult.ok ? paymentContextResult.reason : undefined}
    />
  )
}
