import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'

const VALID_STATUSES = new Set(['submitted', 'reviewing', 'interview', 'offer', 'hired', 'not_selected', 'withdrawn'])

function getServiceRole() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminFromRequest(request, 'admin/recruiting-applications[id]')
  if (!auth.ok) return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })

  const { id } = await context.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  let body: { review_status?: string; review_note?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const update: { review_status?: string; review_note?: string | null; reviewed_at?: string; updated_at: string } = {
    updated_at: now,
  }
  if (body.review_status !== undefined) {
    if (!VALID_STATUSES.has(body.review_status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    update.review_status = body.review_status
    update.reviewed_at = now
  }
  if (body.review_note !== undefined) {
    update.review_note = typeof body.review_note === 'string' ? body.review_note.trim().slice(0, 3000) || null : null
  }

  if (Object.keys(update).length === 1) return NextResponse.json({ error: 'empty_update' }, { status: 400 })

  const { data, error } = await getServiceRole()
    .from('recruiting_applications')
    .update(update)
    .eq('id', id)
    .select('id, review_status, review_note, reviewed_at, updated_at')
    .single()

  if (error) {
    console.error('[admin/recruiting-applications[id]] patch failed:', error.message)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  return NextResponse.json({ item: data })
}
