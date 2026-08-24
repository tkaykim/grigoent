import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { TrainingClient } from '@/app/training/TrainingClient'
import { MONTHLY_TRAINING_100_COPY, MONTHLY_TRAINING_100_PRODUCT_SLUG } from '@/lib/training-package'
import type { TrainingPlan, TrainingProduct } from '@/lib/training-package'

// 월 100만원의 독립적인 1개월 이용권을 매달 직접 결제하는 4개월 과정이다.
// 현재는 자동청구하지 않으며, 주문·정산은 전용 slug 로 구분한다.
// 토스 카드사 심사 대상 URL(/training)과 분리하고 검색엔진에서도 제외한다.
export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = MONTHLY_TRAINING_100_PRODUCT_SLUG

export const metadata: Metadata = {
  title: '4개월 월간 트레이닝 프로그램 - 그리고 엔터테인먼트',
  description: '월 100만원의 1개월 이용권을 매달 결제하며 총 4개월 동안 진행하는 트레이닝 프로그램입니다.',
  robots: { index: false, follow: false },
}

export default async function MonthlyTraining100Page({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  // deetz 케이스에서 발급한 결제 링크 토큰이며, 검증은 서버(checkout)에서만 한다.
  const { ref } = await searchParams
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: productRow } = await supabase
    .from('training_products')
    .select('id, slug, title, subtitle, description, highlights, currency, i18n')
    .eq('slug', PRODUCT_SLUG)
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

  return (
    <TrainingClient
      product={product}
      plans={plans}
      productSlug={PRODUCT_SLUG}
      paymentRef={ref}
      copyOverride={MONTHLY_TRAINING_100_COPY}
    />
  )
}
