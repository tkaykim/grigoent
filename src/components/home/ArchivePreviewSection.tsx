import Link from 'next/link'
import { ArrowRight, CalendarClock, Newspaper } from 'lucide-react'
import { featuredArchiveItems } from '@/lib/company-content'

export function ArchivePreviewSection() {
  return (
    <section id="archive-preview" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-zinc-950 text-white">
              <Newspaper className="h-6 w-6" />
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Newsroom
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 [text-wrap:balance] [word-break:keep-all] md:text-5xl">
              GRIGO가 만든 프로젝트와 브랜드의 흐름
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/archive"
              prefetch={false}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-900 transition hover:border-zinc-900 hover:bg-zinc-950 hover:text-white"
            >
              프로젝트 기록
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/history"
              prefetch={false}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              회사 연혁
              <CalendarClock className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {featuredArchiveItems.map((item) => (
            <Link
              key={item.id}
              href="/archive"
              prefetch={false}
              className="group flex min-h-[280px] flex-col rounded-lg border border-zinc-200 bg-zinc-50 p-6 transition hover:-translate-y-1 hover:border-zinc-500 hover:bg-white hover:shadow-md"
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
              <p className="mt-4 line-clamp-4 text-sm leading-6 text-zinc-600 [word-break:keep-all]">{item.summary}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs font-medium text-zinc-500">
                    #{tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
