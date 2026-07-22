import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarClock, Layers3, Newspaper } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { archiveItems, companyHistory } from '@/lib/company-content'

export const metadata: Metadata = {
  title: 'History - 그리고 엔터테인먼트',
  description:
    '2018년 그리고 스튜디오 설립부터 그리고 엔터테인먼트, deetz, Flowmaker, REACT Studio로 확장된 회사 연혁입니다.',
  alternates: {
    canonical: '/history',
  },
}

const totalHistoryItems = companyHistory.reduce((total, event) => total + event.items.length, 0)
const firstYear = companyHistory[0]?.year ?? '2018'
const latestYear = companyHistory.at(-1)?.year ?? '2026'
const relatedItems = archiveItems.filter((item) => item.featured).slice(0, 3)

export default function HistoryPage() {
  return (
    <>
      <Header />
      <main className="bg-white pt-16">
        <section className="border-b border-zinc-200 bg-zinc-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div className="flex flex-col justify-end">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Company History
              </p>
              <h1 className="max-w-3xl text-3xl font-black leading-[1.08] tracking-tight [text-wrap:balance] [word-break:keep-all] sm:text-4xl md:text-5xl xl:text-6xl">
                스튜디오에서 엔터테인먼트 그룹으로 확장된 시간
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 [word-break:keep-all] md:text-lg md:leading-8">
                그리고 엔터테인먼트는 콘텐츠 제작과 전속 매니지먼트에서 출발해 deetz, Flowmaker, REACT Studio를 연결하는 회사군으로 성장했습니다.
              </p>
            </div>
            <div className="grid content-end gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                [`${firstYear}-${latestYear}`, '기록 기간'],
                ['4', '운영 사업축'],
                [`${totalHistoryItems}`, '주요 이정표'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-white/15 bg-white/5 p-5">
                  <div className="text-3xl font-bold">{value}</div>
                  <div className="mt-1 text-sm text-zinc-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-zinc-950 text-white">
                <CalendarClock className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-zinc-950 [word-break:keep-all]">
                2018년부터 이어진 성장
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600 [word-break:keep-all]">
                연습실과 유튜브 제작 기능을 결합한 그리고 스튜디오에서 출발해, 전속 매니지먼트와 제작 네트워크를 확장하며 현재의 회사군을 만들었습니다.
              </p>
              <Link
                href="/archive"
                prefetch={false}
                className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
              >
                프로젝트 기록 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>

          <div className="space-y-5">
            {companyHistory.map((event, index) => (
              <article
                key={event.year}
                className="grid gap-5 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm md:grid-cols-[120px_1fr] md:p-7"
              >
                <div className="flex items-center gap-3 md:block">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-zinc-950 text-sm font-bold text-white md:mb-4">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Year
                    </p>
                    <h3 className="text-3xl font-black text-zinc-950">{event.year}</h3>
                  </div>
                </div>
                <ul className="max-w-3xl space-y-3 text-base leading-7 text-zinc-700 [word-break:keep-all]">
                  {event.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-950" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-200 bg-zinc-50">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200">
                  <Newspaper className="h-5 w-5" />
                </div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Selected Work
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-zinc-950 [text-wrap:balance] [word-break:keep-all] md:text-4xl">
                  회사의 성장은 실제 프로젝트로 이어졌습니다.
                </h2>
              </div>
              <Link
                href="/archive"
                prefetch={false}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                프로젝트 기록 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {relatedItems.map((item) => (
                <Link
                  key={item.id}
                  href="/archive"
                  prefetch={false}
                  className="group flex min-h-[220px] flex-col rounded-lg border border-zinc-200 bg-white p-6 transition hover:-translate-y-1 hover:border-zinc-500 hover:shadow-md"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-zinc-500">{item.date}</span>
                    <span className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">
                      {item.division}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold leading-7 text-zinc-950 [word-break:keep-all] group-hover:underline">
                    {item.title}
                  </h3>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-600 [word-break:keep-all]">
                    {item.summary}
                  </p>
                  <div className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-zinc-950">
                    자세히 보기
                    <Layers3 className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
