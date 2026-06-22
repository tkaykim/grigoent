import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createSupabaseAdmin } from '@/lib/supabase'

// 증빙은 브라우저 → Supabase 스토리지 직접 업로드(서명 URL)로 처리.
// Vercel 서버리스 본문 한도(~4.5MB)를 우회 → 대용량·다수 첨부 가능.
const EVIDENCE_BUCKET = 'fee-report-evidence'
const MAX_FILES = 50 // 사실상 무제한 — 폭주 방지용 안전 백스톱
const MAX_FILE_BYTES = 100 * 1024 * 1024 // 100MB/파일
const ALLOWED_EXT = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', // 이미지·캡처
  'pdf', 'doc', 'docx', 'hwp', 'hwpx', 'txt', 'rtf', // 문서·한글
  'xls', 'xlsx', 'csv', 'ppt', 'pptx', // 계산서·정산표
  'zip', '7z', 'rar', // 묶음 증빙
  'eml', 'msg', // 이메일 원본
  'mp4', 'mov', 'm4v', 'webm', // 화면녹화 증빙
  'mp3', 'm4a', 'wav', 'aac', 'amr', // 통화·음성 증빙
])

function getExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function sanitizeName(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'file'
  return base.replace(/[^a-zA-Z0-9가-힣._-]/g, '_').slice(0, 120)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const incoming = Array.isArray(body.files) ? body.files : []

    if (incoming.length === 0) {
      return NextResponse.json({ error: 'no_files' }, { status: 400 })
    }
    if (incoming.length > MAX_FILES) {
      return NextResponse.json({ error: 'too_many_files', max: MAX_FILES }, { status: 400 })
    }

    for (const f of incoming) {
      const name = typeof f?.name === 'string' ? f.name : ''
      const size = typeof f?.size === 'number' ? f.size : -1
      if (!name || !ALLOWED_EXT.has(getExt(name))) {
        return NextResponse.json({ error: 'file_type_not_allowed', name }, { status: 400 })
      }
      if (size < 0 || size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'file_too_large', name }, { status: 400 })
      }
    }

    const admin = createSupabaseAdmin()
    const reportId = randomUUID()

    const files = await Promise.all(
      incoming.map(async (f: { name: string }, i: number) => {
        const safe = sanitizeName(f.name)
        const path = `${reportId}/${String(i + 1).padStart(2, '0')}-${safe}`
        const { data, error } = await admin.storage
          .from(EVIDENCE_BUCKET)
          .createSignedUploadUrl(path)
        if (error || !data) {
          throw new Error(error?.message || 'sign_failed')
        }
        return { path, token: data.token, name: safe }
      })
    )

    return NextResponse.json({ report_id: reportId, files })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
