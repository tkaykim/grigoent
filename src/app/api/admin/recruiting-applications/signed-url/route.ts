import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'

const BUCKET = 'recruiting-resumes'

function getServiceRole() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function isSafeResumePath(path: string) {
  if (path.includes('..') || path.includes('\\')) return false
  return /^applications\/[0-9a-f-]{36}\/resume\.pdf$/i.test(path)
}

export async function GET(request: NextRequest) {
  const auth = await assertAdminFromRequest(request, 'admin/recruiting-applications/signed-url')
  if (!auth.ok) return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })

  const path = request.nextUrl.searchParams.get('path') ?? ''
  if (!isSafeResumePath(path)) return NextResponse.json({ error: 'invalid_path' }, { status: 400 })

  const { data, error } = await getServiceRole().storage.from(BUCKET).createSignedUrl(path, 600)
  if (error || !data?.signedUrl) {
    console.error('[admin/recruiting-applications/signed-url] sign failed:', error?.message)
    return NextResponse.json({ error: 'sign_failed' }, { status: 500 })
  }
  return NextResponse.json({ url: data.signedUrl })
}
