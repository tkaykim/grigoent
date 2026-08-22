import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { TrainingClient } from '@/app/training/TrainingClient'
import { MONTHLY_TRAINING_COPY, MONTHLY_TRAINING_PRODUCT_SLUG } from '@/lib/training-package'
import type { TrainingPlan, TrainingProduct } from '@/lib/training-package'

// 1개월 트레이닝 비용 결제 페이지.
// ⚠ 이 상품은 트레이닝 패키지(/training)를 나눠 내는 분납 상품이 아니다.
//    비자 행정 대행이 빠진 별개 상품이며, 매달 그 달의 이용료만 받고
//    다음 달 계속 여부는 이용자가 매달 다시 정한다.
//    총액 합산·회차·분납·할부 표현을 화면에 노출하지 않는다 (토스페이먼츠 심사 조건).
// 토스 카드사 심사 대상 URL(/training)과 분리된 별도 경로이며,
// 그 화면·구성에 영향을 주지 않도록 검색엔진에서도 제외한다.
export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = MONTHLY_TRAINING_PRODUCT_SLUG

export const metadata: Metadata = {
  title: '1개월 트레이닝 비용 - 그리고 엔터테인먼트',
  description: '트레이닝 수강권, 실무 한국어 교육, 실무 투입 업무교육이 포함된 1개월 이용권 결제 페이지입니다.',
  robots: { index: false, follow: false },
}

export default async function MonthlyTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  // deetz 케이스에서 발급한 결제 링크 토큰. 검증은 서버(checkout)에서만 한다.
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
