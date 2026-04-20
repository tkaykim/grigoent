import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'dancer-portfolio-files'

function getServiceRole() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function isSafeStoragePath(path: string): boolean {
  if (!path || path.includes('..') || path.includes('\\')) return false
  if (!path.startsWith('applications/') && !path.startsWith('profiles/')) return false
  const parts = path.split('/')
  if (parts.length !== 3) return false
  const uuid = parts[1]
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
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

  const rawPath = request.nextUrl.searchParams.get('path')
  if (!rawPath) {
    return NextResponse.json({ error: 'path_required' }, { status: 400 })
  }
  let path: string
  try {
    path = decodeURIComponent(rawPath)
  } catch {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 })
  }

  if (!isSafeStoragePath(path)) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 })
  }

  const svc = getServiceRole()
  const { data, error } = await svc.storage.from(BUCKET).createSignedUrl(path, 600)
  if (error || !data?.signedUrl) {
    console.error('signed portfolio url:', error)
    return NextResponse.json({ error: error?.message || 'sign_failed' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
