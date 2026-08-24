import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { TrainingClient } from '@/app/training/TrainingClient'
import { MONTHLY_TRAINING_100_PRODUCT_SLUG, MONTHLY_TRAINING_COPY } from '@/lib/training-package'
import type { TrainingPlan, TrainingProduct } from '@/lib/training-package'

// 기존 /monthly-training 과 제공 내용은 같고 가격만 100만원인 별도 1개월 이용권이다.
// 한 달분만 결제하며, 다음 달 이용료는 자동으로 청구하지 않는다.
// 토스 카드사 심사 대상 URL(/training)과 분리하고 검색엔진에서도 제외한다.
export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = MONTHLY_TRAINING_100_PRODUCT_SLUG

export const metadata: Metadata = {
  title: '1개월 트레이닝 비용 - 그리고 엔터테인먼트',
  description: '트레이닝 수강권, 실무 한국어 교육, 실무 투입 업무교육이 포함된 1개월 이용권 결제 페이지입니다.',
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
      copyOverride={MONTHLY_TRAINING_COPY}
    />
  )
}
