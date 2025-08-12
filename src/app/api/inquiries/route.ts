import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams
  const type = search.get('type')?.trim()
  let query = supabase
    .from('inquiries')
    .select('id, type, title, created_at, status')
    .order('created_at', { ascending: false })
  if (type) {
    query = query.eq('type', type)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // reply count 병합
  const ids = (data || []).map((d: any) => d.id)
  let countsMap: Record<string, number> = {}
  if (ids.length) {
    const { data: replies } = await supabase
      .from('inquiry_replies')
      .select('id,inquiry_id')
      .in('inquiry_id', ids)
    if (replies) {
      for (const r of replies as any[]) {
        countsMap[r.inquiry_id] = (countsMap[r.inquiry_id] || 0) + 1
      }
    }
  }
  const items = (data || []).map((d: any) => ({ ...d, reply_count: countsMap[d.id] || 0 }))
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, content, name, contact, password } = body
    if (!type || !title || !content || !password) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    }
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabase
      .from('inquiries')
      .insert({ type, title, content, name, contact, password_hash, is_private: true })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown_error' }, { status: 500 })
  }
}

