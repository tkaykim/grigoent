import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'

function getServiceRole() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const VALID_STATUSES = new Set(['pending', 'in_review', 'accepted', 'rejected', 'hold'])

export async function GET(request: NextRequest) {
  const auth = await assertAdminFromRequest(request, 'admin/dancer-applications')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  const url = request.nextUrl
  const q = (url.searchParams.get('q') ?? '').trim()
  const status = url.searchParams.get('status') ?? ''
  const nationality = url.searchParams.get('nationality') ?? '' // 'korean' | 'foreign' | ''
  const specialty = (url.searchParams.get('specialty') ?? '').trim()
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100)
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0)
  const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc'

  const svc = getServiceRole()

  let query = svc
    .from('dancer_applications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  if (status && VALID_STATUSES.has(status)) {
    query = query.eq('review_status', status)
  }
  if (nationality === 'korean') query = query.eq('is_korean_national', true)
  if (nationality === 'foreign') query = query.eq('is_korean_national', false)
  if (specialty) query = query.contains('specialties', [specialty])
  if (q) {
    const safe = q.replace(/[,%]/g, ' ').trim()
    const like = `%${safe}%`
    query = query.or(
      [
        `stage_name.ilike.${like}`,
        `full_name.ilike.${like}`,
        `email.ilike.${like}`,
        `phone.ilike.${like}`,
        `instagram_handle.ilike.${like}`,
        `agency_name.ilike.${like}`,
      ].join(','),
    )
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[admin/dancer-applications] list query error:', error)
    return NextResponse.json({ error: 'list_query_failed', detail: error.message }, { status: 500 })
  }

  // 요약 카운트 (pending / 오늘 신규) - 실패해도 메인 응답은 유지
  let totalCount = 0, pendingCount = 0, todayCount = 0
  try {
    const [all, pend, today] = await Promise.all([
      svc.from('dancer_applications').select('id', { count: 'exact', head: true }),
      svc.from('dancer_applications').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
      svc
        .from('dancer_applications')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ])
    totalCount = all.count ?? 0
    pendingCount = pend.count ?? 0
    todayCount = today.count ?? 0
  } catch (err) {
    console.error('[admin/dancer-applications] totals query error:', err)
  }

  return NextResponse.json({
    items: data ?? [],
    count: count ?? 0,
    totals: {
      all: totalCount,
      pending: pendingCount,
      today: todayCount,
    },
  })
}
