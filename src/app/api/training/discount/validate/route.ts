import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { describeDiscount, evaluateDiscount } from '@/lib/discount'
import { TRAINING_PRODUCT_SLUG } from '@/lib/training-package'

// 결제 전 할인코드 미리보기.
// 여기서는 슬롯을 잡지 않는다. 실제 확보는 결제 생성(checkout)에서 한다.
export const dynamic = 'force-dynamic'

const ALLOWED_PRODUCT_SLUGS = new Set([TRAINING_PRODUCT_SLUG, 'audition-fee'])

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string
      productSlug?: string
      planCode?: string
      email?: string
    }

    const rawCode = (body.code ?? '').trim()
    if (!rawCode || rawCode.length > 64) {
      return NextResponse.json({ success: false, error: '할인코드를 입력해 주세요.' }, { status: 400 })
    }

    const productSlug = (body.productSlug ?? '').trim() || TRAINING_PRODUCT_SLUG
    if (!ALLOWED_PRODUCT_SLUGS.has(productSlug)) {
      return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // 금액은 요청값이 아니라 DB의 요금제에서 가져온다.
    const { data: product } = await supabase
      .from('training_products')
      .select('id')
      .eq('slug', productSlug)
      .eq('is_active', true)
      .maybeSingle()

    if (!product) {
      return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    const planQuery = supabase
      .from('training_price_plans')
      .select('code, total_amount')
      .eq('product_id', product.id)
      .eq('is_active', true)

    const { data: plan } = (body.planCode ?? '').trim()
      ? await planQuery.eq('code', (body.planCode ?? '').trim()).maybeSingle()
      : await planQuery.order('sort_order', { ascending: true }).limit(1).maybeSingle()

    if (!plan) {
      return NextResponse.json({ success: false, error: '결제 방식을 선택해 주세요.' }, { status: 400 })
    }

    const amount = plan.total_amount as number
    const result = await evaluateDiscount(supabase, {
      code: rawCode,
      productSlug,
      amount,
      email: body.email,
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error, needsEmail: result.needsEmail ?? false },
        { status: 200 },
      )
    }

    return NextResponse.json({
      success: true,
      code: result.code.code,
      label: result.code.display_name,
      summary: describeDiscount(result.code),
      originalAmount: amount,
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
    })
  } catch (error) {
    console.error('[training/discount/validate] error:', error)
    return NextResponse.json({ success: false, error: '확인 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
