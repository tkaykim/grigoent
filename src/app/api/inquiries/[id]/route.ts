import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  // 관리자 여부 확인
  const cookieStore = cookies()
  const server = createClient(cookieStore)
  const { data: auth } = await server.auth.getUser()
  let isAdmin = false
  if (auth?.user?.id) {
    const { data: profile } = await supabase.from('users').select('type').eq('id', auth.user.id).maybeSingle()
    isAdmin = profile?.type === 'admin'
  }

  if (isAdmin) {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  }

  const { data, error } = await supabase
    .from('inquiries')
    .select('id, type, title, created_at, status')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'missing_password' }, { status: 400 })
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const ok = await bcrypt.compare(password, data.password_hash)
  if (!ok) return NextResponse.json({ error: 'invalid_password' }, { status: 401 })
  return NextResponse.json({ item: { id: data.id, type: data.type, title: data.title, content: data.content, name: data.name, contact: data.contact, created_at: data.created_at } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const body = await req.json()
  const { content, status } = body
  if (!content) return NextResponse.json({ error: 'missing_content' }, { status: 400 })

  // 관리자 확인 (간단 체크: users.type==='admin')
  const cookieStore = cookies()
  const server = createClient(cookieStore)
  const { data: auth } = await server.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('type').eq('id', userId).maybeSingle()
  if (profile?.type !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { error: insErr } = await supabase.from('inquiry_replies').insert({ inquiry_id: id, responder_id: userId, content })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  if (status) {
    await supabase.from('inquiries').update({ status }).eq('id', id)
  }
  return NextResponse.json({ ok: true })
}

