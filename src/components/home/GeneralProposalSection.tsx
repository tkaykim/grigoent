'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { ArrowUpRight, Building2, Send, UserRound } from 'lucide-react'
import Link from 'next/link'

export function GeneralProposalSection() {
  const { t } = useLanguage()
  const proposalOptions = [
    {
      href: '/artists',
      label: 'Roster',
      title: t('proposal.general.individual.title'),
      description: t('proposal.general.individual.desc'),
      button: t('proposal.general.individual.button'),
      Icon: UserRound,
    },
    {
      href: '/teams',
      label: 'Team',
      title: t('proposal.general.team.title'),
      description: t('proposal.general.team.desc'),
      button: t('proposal.general.team.button'),
      Icon: Building2,
    },
    {
      href: '/proposals/general',
      label: 'Brief',
      title: t('proposal.general.general.title'),
      description: t('proposal.general.general.desc'),
      button: t('proposal.general.general.button'),
      Icon: Send,
    },
  ]
  
  return (
    <section className="scroll-mt-24 bg-zinc-950 py-20 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:px-8">
        <div className="lg:sticky lg:top-24">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Project Request
          </p>
          <h2 className="text-3xl font-bold tracking-tight [word-break:keep-all] md:text-5xl">
            {t('proposal.general.title')}
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-zinc-300 [word-break:keep-all]">
            {t('proposal.general.subtitle')}
          </p>
        </div>

        <div className="divide-y divide-white/15 border-y border-white/15">
          {proposalOptions.map(({ href, label, title, description, button, Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="group -mx-4 grid gap-4 px-4 py-6 transition hover:bg-white hover:text-zinc-950 sm:mx-0 sm:grid-cols-[56px_1fr_auto] sm:items-center sm:px-0"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition group-hover:border-zinc-950 group-hover:text-zinc-950">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 transition group-hover:text-zinc-500">
                  {label}
                </span>
                <span className="block text-xl font-bold leading-snug [word-break:keep-all]">
                  {title}
                </span>
                <span className="mt-2 block text-sm leading-6 text-zinc-300 transition [word-break:keep-all] group-hover:text-zinc-700">
                  {description}
                </span>
              </span>
              <span className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-zinc-950 transition group-hover:bg-zinc-950 group-hover:text-white sm:justify-self-end">
                {button}
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
