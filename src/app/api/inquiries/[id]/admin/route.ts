import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const server = createClient(cookieStore)
  const { data: auth } = await server.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('type').eq('id', userId).maybeSingle()
  if (profile?.type !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { data, error } = await supabase.from('inquiries').select('*').eq('id', params.id).maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ item: data })
}

