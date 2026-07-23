import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'

const VALID_STATUSES = new Set(['submitted', 'reviewing', 'interview', 'offer', 'hired', 'not_selected', 'withdrawn'])

function getServiceRole() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(request: NextRequest) {
  const auth = await assertAdminFromRequest(request, 'admin/recruiting-applications')
  if (!auth.ok) return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
  const status = request.nextUrl.searchParams.get('status') ?? ''
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit')) || 20, 1), 100)
  const offset = Math.max(Number(request.nextUrl.searchParams.get('offset')) || 0, 0)
  const supabase = getServiceRole()

  let query = supabase
    .from('recruiting_applications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && VALID_STATUSES.has(status)) query = query.eq('review_status', status)
  if (q) {
    const safe = q.replace(/[,%]/g, ' ').trim()
    const like = `%${safe}%`
    query = query.or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like},position_title.ilike.${like}`)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[admin/recruiting-applications] list failed:', error.message)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }

  const [all, submitted, interview] = await Promise.all([
    supabase.from('recruiting_applications').select('id', { count: 'exact', head: true }),
    supabase.from('recruiting_applications').select('id', { count: 'exact', head: true }).eq('review_status', 'submitted'),
    supabase.from('recruiting_applications').select('id', { count: 'exact', head: true }).eq('review_status', 'interview'),
  ])

  return NextResponse.json({
    items: data ?? [],
    count: count ?? 0,
    totals: {
      all: all.count ?? 0,
      submitted: submitted.count ?? 0,
      interview: interview.count ?? 0,
    },
  })
}
