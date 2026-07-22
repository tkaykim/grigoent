'use client'

import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Clapperboard,
  Clock3,
  Layers3,
  Newspaper,
} from 'lucide-react'
import {
  archiveCategories,
  archiveItems,
  type ArchiveCategory,
} from '@/lib/company-content'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type CategoryValue = 'all' | ArchiveCategory

const categoryIconMap: Record<CategoryValue, ComponentType<{ className?: string }>> = {
  all: Layers3,
  company: BriefcaseBusiness,
  work: CalendarDays,
  media: Clapperboard,
  case: Newspaper,
}

export function ArchiveClient() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>('all')

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return archiveItems

    return archiveItems.filter((item) => item.category === selectedCategory)
  }, [selectedCategory])

  return (
    <main className="bg-white pt-16">
      <section className="border-b border-zinc-200 bg-zinc-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
          <div className="flex flex-col justify-end">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Newsroom & Archive
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight [text-wrap:balance] [word-break:keep-all] md:text-5xl xl:text-6xl">
              GRIGO가 만든 프로젝트와 브랜드 기록
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 [word-break:keep-all] md:text-lg md:leading-8">
              매니지먼트, deetz 플랫폼, 공연제작, 영상제작으로 확장하며 쌓아 온 주요 프로젝트와 브랜드 이슈입니다.
            </p>
          </div>
          <div className="grid content-end gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ['4', '운영 사업축'],
                ['4', '아카이브 필터'],
                [`${archiveItems.length}`, '주요 기록'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-white/15 bg-white/5 p-5">
                <div className="text-3xl font-bold">{value}</div>
                <div className="mt-1 text-sm text-zinc-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as CategoryValue)}>
            <TabsList className="h-auto flex-wrap justify-start rounded-lg border border-zinc-200 bg-white p-1">
              {archiveCategories.map((category) => {
                const Icon = categoryIconMap[category.value]

                return (
                  <TabsTrigger
                    key={category.value}
                    value={category.value}
                    className="h-9 rounded-md px-3 data-[state=active]:bg-zinc-950 data-[state=active]:text-white"
                  >
                    <Icon className="h-4 w-4" />
                    {category.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-zinc-950">Project Records</h2>
            <span className="text-sm text-zinc-500">{filteredItems.length} records</span>
          </div>

          <div className="grid gap-5">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-500 hover:shadow-md"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-zinc-950">{item.date}</span>
                  <span className="h-1 w-1 rounded-full bg-zinc-300" />
                  <span className="font-medium text-zinc-600">{item.division}</span>
                  <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">
                    {item.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold leading-7 text-zinc-950 [word-break:keep-all] md:text-2xl md:leading-8">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-zinc-600 [word-break:keep-all]">{item.summary}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600">
                      #{tag}
                    </span>
                  ))}
                </div>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
                  >
                    {item.sourceLabel ?? '원문 보기'}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>

        <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200">
              <Clock3 className="h-5 w-5" />
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Company Growth
            </p>
            <h2 className="text-xl font-bold leading-7 text-zinc-950 [word-break:keep-all]">
              스튜디오에서 출발해 네 개 사업축으로 확장했습니다.
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600 [word-break:keep-all]">
              그리고 엔터테인먼트는 전속 안무가 매니지먼트와 콘텐츠 제작 경험을 바탕으로 deetz, Flowmaker, REACT Studio를 연결합니다.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ['2018', '시작'],
                ['4', '사업축'],
                [`${archiveItems.length}`, '주요 기록'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-md border border-zinc-200 bg-white px-3 py-3">
                  <div className="text-xl font-bold text-zinc-950">{value}</div>
                  <div className="text-xs font-medium text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
            <Link
              href="/history"
              prefetch={false}
              className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              회사 연혁 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>
    </main>
  )
}
