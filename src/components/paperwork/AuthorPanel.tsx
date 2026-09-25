'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FilePlus2 } from 'lucide-react'
import { CopyButton } from '@/components/paperwork/CopyButton'

type Author = { appLabel: string; name: string }
type Doc = {
  id: string
  doc_no: string
  doc_type: 'quote' | 'statement'
  status: string
  client_company: string
  project_title: string | null
  total_amount: number
  version: number
  sent_to: string | null
  created_at: string
  url: string | null
}

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`

// 앱 버튼으로 들어온 담당자에게만 보이는 견적서·거래명세서 영역.
export function AuthorPanel({ expired }: { expired: boolean }) {
  const [author, setAuthor] = useState<Author | null | undefined>(undefined)
  const [docs, setDocs] = useState<Doc[]>([])

  useEffect(() => {
    fetch('/api/paperwork/me')
      .then((r) => r.json())
      .then((d) => {
        setAuthor(d.author)
        if (d.author) {
          fetch('/api/paperwork/documents').then((r) => r.json()).then((x) => setDocs(x.documents ?? []))
        }
      })
  }, [])

  if (author === undefined) return null
  if (!author) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm leading-6 text-zinc-600">
        {expired && <p className="mb-1 font-medium text-amber-700">링크가 만료되었습니다.</p>}
        견적서·거래명세서를 만들려면 원샷크루·deetz 프로젝트 화면의 「거래 서류 보내기」 버튼으로 들어와 주세요.
      </section>
    )
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-900 bg-white p-4">
      <p className="text-xs text-zinc-500">{author.appLabel} · {author.name}</p>
      <h2 className="mt-1 text-base font-bold">견적서·거래명세서</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link href="/paperwork/new?type=quote" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white">
          <FilePlus2 className="h-4 w-4" /> 견적서 만들기
        </Link>
        <Link href="/paperwork/new?type=statement" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-900 px-3 py-2.5 text-sm font-semibold">
          <FilePlus2 className="h-4 w-4" /> 거래명세서 만들기
        </Link>
      </div>
      {docs.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-zinc-500">내가 만든 문서</p>
          <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {d.doc_type === 'quote' ? '견적서' : '거래명세서'} · {d.client_company}
                    {d.status === 'void' && <span className="ml-1 text-red-600">(폐기)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">{d.doc_no} · {won(d.total_amount)}{d.sent_to ? ` · ${d.sent_to} 발송` : ''}</p>
                </div>
                {d.url && d.status !== 'void' && <CopyButton text={d.url} label="링크" />}
                {d.url && d.status !== 'void' && (
                  <a href={`/paperwork/tax-invoice?doc=${d.url.split('/').pop()}`} className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium">계산서 요청</a>
                )}
                {d.status !== 'void' && (
                  <Link href={`/paperwork/edit/${d.id}`} className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium">수정</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
