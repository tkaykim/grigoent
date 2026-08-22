import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { TrainingClient } from '@/app/training/TrainingClient'
import { PAYMENT_TEST_COPY, PAYMENT_TEST_PRODUCT_SLUG } from '@/lib/training-package'
import type { TrainingPlan, TrainingProduct } from '@/lib/training-package'

// 결제 수단 점검(내부용) 페이지.
//
// 실제 판매 상품은 400만원·140만원이라 소액 테스트가 불가능하다.
// 승인·취소가 실제로 도는지만 100원 / 1,000원으로 확인하기 위한 경로다.
//
// ⚠ 판매 페이지가 아니다. 어디에서도 링크하지 않고 sitemap 에도 넣지 않으며 noindex 로 둔다.
// ⚠ 즉시 차단: update training_products set is_active = false where slug = 'payment-test';
//    (페이지는 빈 화면으로, checkout API 는 404 로 함께 막힌다 — 코드 배포 없이 끌 수 있다.)
export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = PAYMENT_TEST_PRODUCT_SLUG

export const metadata: Metadata = {
  title: '결제 수단 점검 - 그리고 엔터테인먼트',
  description: '결제 승인과 취소가 정상 동작하는지 확인하기 위한 내부 점검용 페이지입니다.',
  robots: { index: false, follow: false },
}

export default async function PaymentTestPage() {
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
      copyOverride={PAYMENT_TEST_COPY}
    />
  )
}
