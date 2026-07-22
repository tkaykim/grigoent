import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { companyDivisions, type CompanyDivision, type CompanyDivisionSlug } from '@/lib/company-content'

const fallbackWordmarkMap: Record<CompanyDivisionSlug, string> = {
  grigo: 'GRIGO',
  deetz: 'DEETZ',
  flowmaker: 'FLOWMAKER',
  reactstudio: 'REACT STUDIO',
}

function DivisionCard({ division }: { division: CompanyDivision }) {
  return (
    <Link
      href={division.href}
      target={division.external ? '_blank' : undefined}
      rel={division.external ? 'noreferrer' : undefined}
      prefetch={division.external ? undefined : false}
      className="group flex min-h-[300px] flex-col bg-white p-6 transition duration-200 hover:bg-zinc-50"
      aria-label={`${division.shortTitle} - ${division.cta}`}
    >
      <div className="mb-6 flex h-16 items-center">
        {division.logo ? (
          <img
            src={division.logo.src}
            alt={division.logo.alt}
            className={`${division.logo.className ?? 'h-10 max-w-[170px]'} w-auto object-contain object-left`}
            loading="lazy"
          />
        ) : (
          <span className="text-2xl font-black uppercase tracking-tight text-zinc-950">
            {fallbackWordmarkMap[division.slug]}
          </span>
        )}
      </div>

      <div className="border-t border-zinc-200 pt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {division.eyebrow}
        </p>
        <h3 className="text-xl font-bold leading-snug text-zinc-950 [word-break:keep-all]">
          {division.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-zinc-600 [word-break:keep-all]">
          {division.description}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {division.capabilities.slice(0, 2).map((capability) => (
          <span
            key={capability}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600"
          >
            {capability}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 pt-7">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          {division.status}
        </div>
        <span className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-zinc-950 px-3 text-sm font-semibold text-zinc-950 transition group-hover:bg-zinc-950 group-hover:text-white">
          {division.cta}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}

export function GroupDivisionsSection() {
  return (
    <section id="divisions" className="scroll-mt-24 bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 border-y border-zinc-950 py-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Company Portfolio
              </p>
              <h2 className="text-4xl font-bold tracking-tight text-zinc-950 [text-wrap:balance] [word-break:keep-all] md:text-5xl">
                GRIGO Entertainment Group
              </h2>
            </div>
            <p className="max-w-3xl text-base leading-7 text-zinc-600 [word-break:keep-all] md:text-lg md:leading-8">
              그리고 엔터테인먼트는 전속 안무가 매니지먼트를 중심으로 deetz, Flowmaker, REACT Studio를 연결해 댄스 기반 프로젝트를 만듭니다.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200">
          <div className="grid gap-px bg-zinc-200 md:grid-cols-2 xl:grid-cols-4">
            {companyDivisions.map((division) => (
              <DivisionCard key={division.slug} division={division} />
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 text-sm text-zinc-700 md:grid-cols-3">
          <div className="bg-white p-4">
            <span className="mr-3 text-lg font-bold text-zinc-950">{companyDivisions.length}</span>
            운영 사업축
          </div>
          <Link
            href="/history"
            prefetch={false}
            className="flex items-center justify-between gap-4 bg-white p-4 font-semibold text-zinc-950 transition hover:bg-zinc-950 hover:text-white"
          >
            <span>
              <span className="mr-3 text-lg font-bold">2018-2026</span>
              회사 연혁
            </span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href="/archive"
            prefetch={false}
            className="flex items-center justify-between gap-4 bg-white p-4 font-semibold text-zinc-950 transition hover:bg-zinc-950 hover:text-white"
          >
            프로젝트 기록 보기
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
