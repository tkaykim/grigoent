'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DocumentForm, formFromRow, toPayload, type DocumentFormValues } from '@/components/paperwork/DocumentForm'
import { ResultPanel } from '@/components/paperwork/ResultPanel'

// 담당자 본인 문서 수정 = 새 버전 발행. 거래처가 가진 링크는 그대로이며 최신 버전을 보여준다.
export default function EditDocumentPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ document: any; url: string; sendError?: string } | null>(null)

  useEffect(() => {
    fetch(`/api/paperwork/documents/${id}`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        setDoc(d.document)
      })
      .catch((e) => setError(e.message))
  }, [id])

  const submit = async (values: DocumentFormValues, send: boolean) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/paperwork/documents/${id}`, {
        method: 'PATCH',
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

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Link href="/paperwork/share" className="text-sm text-zinc-500 underline underline-offset-4">← 거래 서류 보내기</Link>
      <h1 className="mt-3 text-2xl font-bold">문서 수정</h1>
      {doc && <p className="mt-2 text-sm text-zinc-600">{doc.doc_no} · 저장하면 수정 {doc.version + 1}차 문서로 발행되고, 이미 보낸 링크에서도 새 내용이 보입니다.</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {result ? (
        <div className="mt-6">
          <ResultPanel doc={result.document} url={result.url} sendError={result.sendError} />
        </div>
      ) : (
        doc && (
          <div className="mt-6">
            <DocumentForm initial={formFromRow(doc)} lockDocType showEditNote busy={busy} onSubmit={submit} />
          </div>
        )
      )}
    </main>
  )
}
