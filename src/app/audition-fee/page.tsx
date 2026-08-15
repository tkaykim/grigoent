import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { TrainingClient } from '@/app/training/TrainingClient'
import type { TrainingPlan, TrainingProduct } from '@/lib/training-package'

// 오디션 참석 확정비 결제 페이지.
// 토스 카드사 심사 대상 URL(/training)과 분리된 별도 경로이며,
// 심사 중 그 화면·구성에 영향을 주지 않도록 검색엔진에서도 제외한다.
export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = 'audition-fee'

export const metadata: Metadata = {
  title: '오디션 참석 확정비 - 그리고 엔터테인먼트',
  description: '레벨테스트 오디션 참석을 확정하기 위한 참가비 결제 페이지입니다.',
  robots: { index: false, follow: false },
}

export default async function AuditionFeePage({
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

  return <TrainingClient product={product} plans={plans} productSlug={PRODUCT_SLUG} paymentRef={ref} />
}
