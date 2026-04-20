import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function getServiceRole() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const cookieStore = cookies()
  const server = createClient(cookieStore)
  const { data: auth, error: authErr } = await server.auth.getUser()
  const userId = auth.user?.id
  if (authErr || !userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileErr } = await server
    .from('users')
    .select('type')
    .eq('id', userId)
    .maybeSingle()

  if (profileErr || profile?.type !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const svc = getServiceRole()
  const { data, error } = await svc
    .from('dancer_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('dancer_applications admin list:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}
