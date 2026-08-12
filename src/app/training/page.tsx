import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { TrainingClient } from './TrainingClient'
import { TRAINING_PRODUCT_SLUG, type TrainingPlan, type TrainingProduct } from '@/lib/training-package'

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
