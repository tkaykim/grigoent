import { createClient } from '@supabase/supabase-js'
import {
  BANK_ACCOUNTS,
  BUSINESS_REGISTRATION,
  PAPERWORK_BUCKET,
  PAPERWORK_FILES,
  PAPERWORK_STORAGE_PREFIX,
} from '@/lib/company-paperwork'

// 서버 전용: private 버킷에서 사업자등록증·통장사본 원본을 읽는다(프록시 응답·메일 첨부 공용).

export type PaperworkFile = (typeof PAPERWORK_FILES)[number]

export function isPaperworkFile(name: string): name is PaperworkFile {
  return (PAPERWORK_FILES as readonly string[]).includes(name)
}

export function paperworkDownloadName(file: PaperworkFile): string {
  if (file === BUSINESS_REGISTRATION.file) return BUSINESS_REGISTRATION.downloadName
  return file === BANK_ACCOUNTS.react.file ? BANK_ACCOUNTS.react.downloadName : BANK_ACCOUNTS.enter.downloadName
}

export async function loadPaperworkFile(file: PaperworkFile): Promise<Buffer> {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const { data, error } = await svc.storage.from(PAPERWORK_BUCKET).download(`${PAPERWORK_STORAGE_PREFIX}/${file}`)
  if (error || !data) throw new Error(`서류 파일을 불러오지 못했습니다: ${file}`)
  return Buffer.from(await data.arrayBuffer())
}
