import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, Home } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default async function RecruitingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; mail?: string }>
}) {
  const params = await searchParams
  const reference = params.id?.slice(0, 8).toUpperCase() || 'RECEIVED'
  const mailWarning = params.mail === 'warning'

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-4rem)] items-center bg-zinc-100 px-4 py-24 pt-32 sm:px-6">
        <section className="mx-auto w-full max-w-2xl border border-zinc-300 bg-white p-7 sm:p-10 md:p-12">
          <div className="flex h-12 w-12 items-center justify-center bg-zinc-950 text-white">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Application received</p>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-normal text-zinc-950 [word-break:keep-all] sm:text-4xl">
            지원서 제출이 완료되었습니다.
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-600 [word-break:keep-all]">
            접수 완료 안내와 이후 채용 결과는 지원서에 입력하신 이메일로 전달드립니다.
            서류 검토 후 다음 절차가 필요한 경우 개별적으로 연락드리겠습니다.
          </p>

          <div className="mt-8 border-y border-zinc-200 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">접수 번호</div>
            <div className="mt-2 font-mono text-xl font-bold text-zinc-950">{reference}</div>
          </div>

          {mailWarning ? (
            <div className="mt-6 flex gap-3 border border-zinc-400 bg-zinc-100 p-4 text-sm leading-6 text-zinc-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>지원서는 정상 접수되었지만 접수 메일 발송이 지연될 수 있습니다.</p>
            </div>
          ) : (
            <div className="mt-6 border border-zinc-300 bg-zinc-50 p-4 text-sm font-medium text-zinc-800">
              접수 확인 메일을 발송했습니다.
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/" prefetch={false} className="inline-flex h-11 items-center justify-center gap-2 bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800">
              <Home className="h-4 w-4" />
              홈으로
            </Link>
            <Link href="/careers" prefetch={false} className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-300 px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950">
              채용 정보 다시 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
