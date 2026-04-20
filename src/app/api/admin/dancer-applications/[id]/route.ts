import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'

const VALID_STATUSES = new Set(['pending', 'in_review', 'accepted', 'rejected', 'hold'])

function getServiceRole() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminFromRequest(request, 'admin/dancer-applications[id]')
  if (!auth.ok) return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })

  const { id } = await context.params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  let body: { review_status?: string; review_note?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const update: { review_status?: string; review_note?: string | null; reviewed_at?: string } = {}
  if (typeof body.review_status === 'string') {
    if (!VALID_STATUSES.has(body.review_status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    }
    update.review_status = body.review_status
    update.reviewed_at = new Date().toISOString()
  }
  if (typeof body.review_note === 'string') {
    update.review_note = body.review_note.trim().slice(0, 2000) || null
  } else if (body.review_note === null) {
    update.review_note = null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'empty_update' }, { status: 400 })
  }

  const svc = getServiceRole()
  const { data, error } = await svc
    .from('dancer_applications')
    .update(update)
    .eq('id', id)
    .select('id, review_status, review_note, reviewed_at')
    .single()

  if (error) {
    console.error('[admin/dancer-applications[id]] patch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}
