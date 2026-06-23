import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'

const EVIDENCE_BUCKET = 'fee-report-evidence'
const SIGNED_URL_TTL = 60 * 60 // 1시간

type EvidenceFile = { path: string; name: string; size: number; type: string }

function getServiceRole() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(request: NextRequest) {
  // grigoent는 세션이 localStorage라 쿠키 인증 불가 → 클라가 보낸 Bearer 토큰으로 검증
  const auth = await assertAdminFromRequest(request, 'fee-reports')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  const svc = getServiceRole()
  const { data, error } = await svc
    .from('fee_payment_reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fee_payment_reports list:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 비공개 버킷 증빙은 1시간 signed URL (관리자 인증 통과 후에만)
  const items = await Promise.all(
    (data ?? []).map(async (row: Record<string, unknown>) => {
      const evidence = Array.isArray(row.evidence_files) ? (row.evidence_files as EvidenceFile[]) : []
      const evidence_files = await Promise.all(
        evidence.map(async (f) => {
          const { data: signed } = await svc.storage
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
