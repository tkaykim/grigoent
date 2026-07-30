'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export function FailClient() {
  const params = useSearchParams()
  const message = params.get('message')
  const code = params.get('code')

  return (
    <>
      <Header />
      <main className="bg-white pt-16">
        <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="border border-zinc-300 p-8">
            <XCircle className="h-10 w-10 text-red-600" />
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">결제가 취소되었습니다.</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 [word-break:keep-all]">
              {message ?? '결제가 완료되지 않았습니다. 다시 시도해 주세요.'}
            </p>
            {code ? <p className="mt-2 font-mono text-xs text-zinc-400">{code}</p> : null}
            <Link
              href="/training"
              className="mt-8 inline-flex min-h-11 items-center bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              다시 시도하기
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
