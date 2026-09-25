'use client'

import { CheckCircle2, ExternalLink } from 'lucide-react'
import { CopyButton } from '@/components/paperwork/CopyButton'

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`

export function ResultPanel({
  doc,
  url,
  sendError,
}: {
  doc: { doc_no: string; doc_type: 'quote' | 'statement'; client_company: string; project_title: string | null; total_amount: number; sent_at: string | null; sent_to: string | null; version: number }
  url: string
  sendError?: string
}) {
  const label = doc.doc_type === 'quote' ? '견적서' : '거래명세서'
  const message = [
    `${doc.client_company} 담당자님, 안녕하세요.`,
    `${doc.project_title ? `「${doc.project_title}」 ` : ''}${label}${doc.version > 1 ? `(수정 ${doc.version}차)` : ''}를 보내드립니다.`,
    `합계 ${won(doc.total_amount)}이며, 아래 링크에서 ${label}와 사업자등록증·통장사본을 확인하실 수 있습니다.`,
    url,
  ].join('\n')

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="flex items-center gap-2 font-semibold text-emerald-800">
        <CheckCircle2 className="h-5 w-5" /> {label} {doc.doc_no} 발행 완료
      </p>
      {doc.sent_at && <p className="mt-1 text-sm text-emerald-800">{doc.sent_to}로 메일을 보냈습니다.</p>}
      {sendError && <p className="mt-1 text-sm font-medium text-red-700">{sendError} 링크를 복사해 카톡으로 보내 주세요.</p>}
      <pre className="mt-3 whitespace-pre-wrap break-all rounded-lg bg-white px-3 py-2 font-sans text-[13px] leading-6 text-zinc-800">{message}</pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={message} label="카톡용 문구 복사" className="px-3 py-2 text-sm" />
        <CopyButton text={url} label="링크만 복사" className="px-3 py-2 text-sm" />
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700">
          <ExternalLink className="h-4 w-4" /> 받는 사람 화면
        </a>
      </div>
    </section>
  )
}
