'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DocumentForm, emptyForm, toPayload, type DocumentFormValues } from '@/components/paperwork/DocumentForm'
import { ResultPanel } from '@/components/paperwork/ResultPanel'

type Author = { appLabel: string; name: string; project: string | null; client: string | null }

function NewDocument() {
  const sp = useSearchParams()
  const [author, setAuthor] = useState<Author | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ document: any; url: string; sendError?: string } | null>(null)

  useEffect(() => {
    fetch('/api/paperwork/me').then((r) => r.json()).then((d) => setAuthor(d.author))
  }, [])

  const submit = async (values: DocumentFormValues, send: boolean) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/paperwork/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...toPayload(values), send }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 207) throw new Error(data.error || '저장하지 못했습니다.')
      setResult(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (author === undefined) return <main className="mx-auto max-w-2xl px-4 py-12 text-sm text-zinc-500">불러오는 중…</main>
  if (!author) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">견적서·거래명세서 만들기</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">담당자 확인이 필요합니다.<br />원샷크루·deetz 프로젝트 화면의 「거래 서류 보내기」 버튼으로 다시 들어와 주세요.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Link href="/paperwork/share" className="text-sm text-zinc-500 underline underline-offset-4">← 거래 서류 보내기</Link>
      <h1 className="mt-3 text-2xl font-bold">견적서·거래명세서 만들기</h1>
      <p className="mt-2 text-sm text-zinc-600">{author.appLabel} · {author.name} 담당자로 발행합니다. 발행 내용은 경영지원실에 공유됩니다.</p>

      {result ? (
        <div className="mt-6 space-y-4">
          <ResultPanel doc={result.document} url={result.url} sendError={result.sendError} />
          <div className="flex gap-2">
            <Link href={`/paperwork/edit/${result.document.id}`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">수정하기</Link>
            <button type="button" onClick={() => setResult(null)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">새로 만들기</button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <DocumentForm
            busy={busy}
            onSubmit={submit}
            initial={emptyForm({
              docType: sp.get('type') === 'statement' ? 'statement' : 'quote',
              account: sp.get('for') === 'react' ? 'react' : 'enter',
              projectTitle: author.project ?? '',
              clientCompany: author.client ?? '',
            })}
          />
        </div>
      )}
    </main>
  )
}

export default function NewDocumentPage() {
  return (
    <Suspense>
      <NewDocument />
    </Suspense>
  )
}
