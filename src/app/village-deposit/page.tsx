import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { TrainingClient } from '@/app/training/TrainingClient'
import { VILLAGE_DEPOSIT_COPY, VILLAGE_DEPOSIT_PRODUCT_SLUG } from '@/lib/training-package'
import type { TrainingPlan, TrainingProduct } from '@/lib/training-package'

// deetz Village 사전예약금 결제 페이지.
// Village 는 아직 오픈 전이라 크라우드펀딩형 사전예약이다 —
// 입주 시 첫 결제에서 차감하고, 오픈이 무산되면 전액 환불한다(조건은 VILLAGE_DEPOSIT_COPY.terms).
// 토스 카드사 심사 대상 URL(/training)과 분리된 별도 경로이며, 검색엔진에서도 제외한다.
export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = VILLAGE_DEPOSIT_PRODUCT_SLUG

export const metadata: Metadata = {
  title: 'deetz Village 사전예약금 - 그리고 엔터테인먼트',
  description: 'deetz Village 입주 자리를 먼저 확보하기 위한 사전예약금 결제 페이지입니다.',
  robots: { index: false, follow: false },
}

export default async function VillageDepositPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  // deetz 에서 발급한 결제 링크 토큰(케이스 또는 Village 대기자 행). 검증은 서버(checkout)에서만 한다.
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
      copyOverride={VILLAGE_DEPOSIT_COPY}
    />
  )
}
