'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Users, User, Building } from 'lucide-react'
import Link from 'next/link'

export function GeneralProposalSection() {
  const { t } = useLanguage()
  
  return (
    <section className="py-16 bg-zinc-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">{t('proposal.general.title')}</h2>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            {t('proposal.general.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">{t('proposal.general.individual.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-600 mb-4">
                {t('proposal.general.individual.desc')}
              </p>
              <Link href="/artists">
                <Button className="w-full">
                  {t('proposal.general.individual.button')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">{t('proposal.general.team.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-600 mb-4">
                {t('proposal.general.team.desc')}
              </p>
              <Link href="/teams">
                <Button className="w-full">
                  {t('proposal.general.team.button')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">{t('proposal.general.general.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-600 mb-4">
                {t('proposal.general.general.desc')}
              </p>
              <Link href="/proposals/general">
                <Button className="w-full">
                  {t('proposal.general.general.button')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}