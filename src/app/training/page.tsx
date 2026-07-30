import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { TrainingClient } from './TrainingClient'
import { TRAINING_PRODUCT_SLUG, type TrainingPlan, type TrainingProduct } from '@/lib/training-package'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '트레이닝 + 실무투입 패키지 - 그리고 엔터테인먼트',
  description:
    '전문 트레이닝과 실무 투입을 결합한 GRIGO 패키지입니다. 일시불과 3·4·5개월 분납 중 선택해 결제할 수 있습니다.',
  alternates: { canonical: '/training' },
  openGraph: {
    title: '트레이닝 + 실무투입 패키지 - 그리고 엔터테인먼트',
    description: '전문 트레이닝과 실무 투입을 결합한 GRIGO 패키지 결제 페이지입니다.',
    url: 'https://grigoent.co.kr/training',
    type: 'website',
  },
}

export default async function TrainingPage() {
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

  return <TrainingClient product={product} plans={plans} />
}
