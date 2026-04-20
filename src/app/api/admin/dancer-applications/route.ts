import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function getServiceRole() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function assertAdmin() {
  const cookieStore = cookies()
  const server = createClient(cookieStore)
  const { data: auth, error: authErr } = await server.auth.getUser()
  const userId = auth.user?.id
  if (authErr || !userId) {
    console.error('[admin/dancer-applications] auth failed:', authErr?.message, 'userId:', userId)
    return { ok: false as const, status: 401, error: 'unauthorized', detail: authErr?.message }
  }
  const { data: profile, error: profileErr } = await server
    .from('users')
    .select('type')
    .eq('id', userId)
    .maybeSingle()
  if (profileErr) {
    console.error('[admin/dancer-applications] profile query error:', profileErr.message)
    return { ok: false as const, status: 500, error: 'profile_lookup_failed', detail: profileErr.message }
  }
  if (profile?.type !== 'admin') {
    console.warn('[admin/dancer-applications] non-admin attempt. userId:', userId, 'profile.type:', profile?.type)
    return { ok: false as const, status: 403, error: 'forbidden', detail: `type=${profile?.type ?? 'null'}` }
  }
  return { ok: true as const, userId }
}

const VALID_STATUSES = new Set(['pending', 'in_review', 'accepted', 'rejected', 'hold'])

export async function GET(request: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, detail: (auth as { detail?: string }).detail ?? undefined },
      { status: auth.status },
    )
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'missing_service_role_key', detail: 'SUPABASE_SERVICE_ROLE_KEY env not set' },
      { status: 500 },
    )
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
