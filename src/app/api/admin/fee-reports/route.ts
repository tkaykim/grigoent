import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const EVIDENCE_BUCKET = 'fee-report-evidence'
const SIGNED_URL_TTL = 60 * 60 // 1시간

type EvidenceFile = { path: string; name: string; size: number; type: string }

export async function GET() {
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

  const { data, error } = await server
    .from('fee_payment_reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fee_payment_reports list:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 비공개 버킷 증빙은 service role로 1시간 signed URL 생성 (관리자 인증 통과 후에만)
  const admin = createSupabaseAdmin()
  const items = await Promise.all(
    (data ?? []).map(async (row: Record<string, unknown>) => {
      const evidence = Array.isArray(row.evidence_files) ? (row.evidence_files as EvidenceFile[]) : []
      const evidence_files = await Promise.all(
        evidence.map(async (f) => {
          const { data: signed } = await admin.storage
            .from(EVIDENCE_BUCKET)
            .createSignedUrl(f.path, SIGNED_URL_TTL)
          return { ...f, url: signed?.signedUrl ?? null }
        })
      )
      return { ...row, evidence_files }
    })
  )

  return NextResponse.json({ items })
}
