import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export type LegalSection = {
  title: string
  paragraphs?: string[]
  list?: string[]
  table?: { head: string[]; rows: string[][] }
}

const LINKS = [
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/refund', label: '취소·환불 규정' },
]

export function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
  current,
}: {
  title: string
  updatedAt: string
  intro?: string
  sections: LegalSection[]
  current: string
}) {
  return (
    <>
      <Header />
      <main className="bg-white pt-16 [word-break:keep-all]">
        <section className="border-b border-zinc-800 bg-zinc-950 text-white">
          <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">GRIGO</p>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 text-sm text-zinc-400">시행일 {updatedAt}</p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap gap-2 border-b border-zinc-200 pb-6">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.href === current
                    ? 'border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white'
                    : 'border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950'
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {intro ? <p className="mt-8 text-sm leading-7 text-zinc-700">{intro}</p> : null}

          <div className="mt-4 grid gap-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-bold tracking-tight text-zinc-950">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-sm leading-7 text-zinc-700">
                    {paragraph}
                  </p>
                ))}
                {section.table ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse border border-zinc-300 text-sm">
                      <thead>
                        <tr className="bg-zinc-50">
                          {section.table.head.map((head) => (
                            <th
                              key={head}
                              className="border-b border-zinc-300 px-3 py-2 text-left font-semibold text-zinc-900"
                            >
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row) => (
                          <tr key={row.join('|')}>
                            {row.map((cell) => (
                              <td
                                key={cell}
                                className="border-b border-zinc-200 px-3 py-2.5 align-top leading-6 text-zinc-700"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {section.list ? (
                  <ul className="mt-3 grid gap-2">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-7 text-zinc-700">
                        <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <div className="mt-14 border-t border-zinc-200 pt-6 text-sm leading-7 text-zinc-600">
            <p className="font-semibold text-zinc-900">(주) 그리고엔터테인먼트</p>
            <p>대표자 김현준 · 사업자등록번호 116-81-96848</p>
            <p>서울특별시 마포구 성지3길 55, 2층 202호 (합정동, 아진)</p>
            <p>고객센터 02-6229-9229 · contact@grigoent.co.kr · 평일 09:00 ~ 18:00 (KST)</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
