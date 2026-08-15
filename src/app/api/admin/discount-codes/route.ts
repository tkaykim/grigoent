import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'
import { normalizeCode } from '@/lib/discount'
import { TRAINING_PRODUCT_SLUG } from '@/lib/training-package'

// 할인코드 등록·조회·수정 (관리자).
const ALLOWED_PRODUCT_SLUGS = [TRAINING_PRODUCT_SLUG, 'audition-fee']

function getServiceRole() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(request: NextRequest) {
  const auth = await assertAdminFromRequest(request, 'discount-codes')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  const svc = getServiceRole()
  const { data: codes, error } = await svc
    .from('training_discount_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/discount-codes] list failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 사용 횟수는 사용 이력 행 수로 센다 (코드 테이블에 카운터를 두지 않는다).
  const { data: redemptions } = await svc
    .from('training_discount_redemptions')
    .select('code_id, customer_email, discount_amount, confirmed_at, created_at')

  const usage = new Map<string, { total: number; confirmed: number; rows: unknown[] }>()
  for (const row of redemptions ?? []) {
    const key = row.code_id as string
    if (!usage.has(key)) usage.set(key, { total: 0, confirmed: 0, rows: [] })
    const entry = usage.get(key)!
    entry.total += 1
    if (row.confirmed_at) entry.confirmed += 1
    entry.rows.push(row)
  }

  return NextResponse.json({
    items: (codes ?? []).map((code) => ({
      ...code,
      usage: usage.get(code.id as string) ?? { total: 0, confirmed: 0, rows: [] },
    })),
    productSlugs: ALLOWED_PRODUCT_SLUGS,
  })
}

type CreateBody = {
  code?: string
  displayName?: string
  description?: string
  discountType?: 'percentage' | 'fixed_amount'
  discountValue?: number
  maxDiscountAmount?: number | null
  minOrderAmount?: number
  maxUses?: number | null
  productSlugs?: string[] | null
  expiresAt?: string | null
}

export async function POST(request: NextRequest) {
  const auth = await assertAdminFromRequest(request, 'discount-codes')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as CreateBody
    const code = normalizeCode(body.code ?? '')
    const displayName = (body.displayName ?? '').trim()
    const discountType = body.discountType
    const discountValue = Number(body.discountValue)

    if (!/^[A-Z0-9_-]{4,64}$/.test(code)) {
      return NextResponse.json(
        { error: '코드는 영문 대문자·숫자·하이픈·밑줄 4~64자로 입력해 주세요.' },
        { status: 400 },
      )
    }
    if (!displayName) {
      return NextResponse.json({ error: '표시 이름을 입력해 주세요.' }, { status: 400 })
    }
    if (discountType !== 'percentage' && discountType !== 'fixed_amount') {
      return NextResponse.json({ error: '할인 방식을 선택해 주세요.' }, { status: 400 })
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: '할인 값을 확인해 주세요.' }, { status: 400 })
    }
    if (discountType === 'percentage' && discountValue > 100) {
      return NextResponse.json({ error: '퍼센트 할인은 100을 넘을 수 없습니다.' }, { status: 400 })
    }

    const slugs = Array.isArray(body.productSlugs) ? body.productSlugs.filter(Boolean) : null
    if (slugs && slugs.some((slug) => !ALLOWED_PRODUCT_SLUGS.includes(slug))) {
      return NextResponse.json({ error: '알 수 없는 상품이 포함되어 있습니다.' }, { status: 400 })
    }

    const svc = getServiceRole()
    const { data, error } = await svc
      .from('training_discount_codes')
      .insert({
        code,
        display_name: displayName,
        description: (body.description ?? '').trim() || null,
        discount_type: discountType,
        discount_value: Math.floor(discountValue),
        max_discount_amount: body.maxDiscountAmount ? Math.floor(body.maxDiscountAmount) : null,
        min_order_amount: body.minOrderAmount ? Math.floor(body.minOrderAmount) : 0,
        max_uses: body.maxUses ? Math.floor(body.maxUses) : null,
        product_slugs: slugs && slugs.length > 0 ? slugs : null,
        expires_at: body.expiresAt || null,
      })
      .select('*')
      .single()

    if (error) {
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? '이미 존재하는 코드입니다.' : error.message },
        { status: duplicate ? 409 : 500 },
      )
    }

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    console.error('[admin/discount-codes] create failed:', error)
    return NextResponse.json({ error: '등록 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 활성/비활성 전환.
export async function PATCH(request: NextRequest) {
  const auth = await assertAdminFromRequest(request, 'discount-codes')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  try {
    const { id, isActive } = (await request.json()) as { id?: string; isActive?: boolean }
    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: '요청이 올바르지 않습니다.' }, { status: 400 })
    }

    const svc = getServiceRole()
    const { error } = await svc
      .from('training_discount_codes')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '변경 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
