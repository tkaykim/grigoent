'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BriefcaseBusiness, ChevronDown, Clock, FolderKanban, LogOut, Menu, ShieldCheck, UserCircle, X } from 'lucide-react'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function Header() {
  const { user, profile, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const { t } = useLanguage()
  
  // 댄서 승인 대기 상태 확인
  const isDancerPending = profile?.pending_type === 'dancer' && profile?.type === 'general'
  
  const primaryNavigation = [
    { name: t('nav.company'), href: '/#divisions' },
    { name: t('nav.history'), href: '/history' },
    { name: t('nav.artists'), href: '/artists' },
    { name: 'Works', href: '/#works' },
    { name: t('nav.archive'), href: '/archive' },
    { name: t('nav.careers'), href: '/careers' },
  ]

  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
    setIsAccountOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-5">
          {/* 로고 */}
          <Link href="/" prefetch={false} className="flex shrink-0 items-center space-x-2">
            <span className="text-xl font-bold text-zinc-900">GRIGO</span>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden flex-1 items-center justify-center gap-5 text-sm xl:flex">
            {primaryNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                prefetch={false}
                className="whitespace-nowrap text-zinc-600 transition-colors hover:text-zinc-900"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* 사용자 메뉴 */}
          <div className="ml-auto hidden shrink-0 items-center gap-2 xl:flex">
            <Link
              href="/#contact"
              prefetch={false}
              className="whitespace-nowrap px-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
            >
              Contact
            </Link>
            <LanguageToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setIsAccountOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={isAccountOpen}
                  >
                    <UserCircle className="h-4 w-4" />
                    Account
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  {isAccountOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-2 w-56 border border-zinc-200 bg-white p-1 shadow-lg"
                    >
                      {profile?.type === 'admin' && (
                        <Link
                          href="/admin"
                          prefetch={false}
                          role="menuitem"
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                          onClick={() => setIsAccountOpen(false)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {t('header.admin')}
                        </Link>
                      )}
                      <Link
                        href="/mypage"
                        prefetch={false}
                        role="menuitem"
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                        onClick={() => setIsAccountOpen(false)}
                      >
                        <UserCircle className="h-4 w-4" />
                        {t('header.mypage')}
                      </Link>
                      <Link
                        href="/proposals"
                        prefetch={false}
                        role="menuitem"
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                        onClick={() => setIsAccountOpen(false)}
                      >
                        <FolderKanban className="h-4 w-4" />
                        Proposals
                      </Link>
                      <Link
                        href="/apply/dancer"
                        prefetch={false}
                        role="menuitem"
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                        onClick={() => setIsAccountOpen(false)}
                      >
                        <BriefcaseBusiness className="h-4 w-4" />
                        Agency Pool
                      </Link>
                      {isDancerPending && (
                        <div className="mx-2 my-1 flex items-center gap-2 border-t border-zinc-200 pt-2 text-xs font-semibold text-zinc-600">
                          <Clock className="h-3.5 w-3.5" />
                          승인 대기
                        </div>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4" />
                        {t('header.signout')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/signin" prefetch={false}>
                  <Button variant="ghost" size="sm">
                    {t('header.signin')}
                  </Button>
                </Link>
                <Link href="/signup" prefetch={false}>
                  <Button size="sm">
                    {t('header.signup')}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button
            className="ml-auto p-2 xl:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="border-t border-zinc-200 xl:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {primaryNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  className="block px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/#contact"
                prefetch={false}
                className="block px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <Link
                href="/apply/dancer"
                prefetch={false}
                className="block px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Agency Pool
              </Link>
              
              {user ? (
                <div className="pt-4 space-y-2">
                  {profile?.type === 'admin' && (
                    <Link href="/admin" prefetch={false}>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                        {t('header.admin')}
                      </Button>
                    </Link>
                  )}
                  <div className="flex items-center justify-center">
                    <NotificationBell />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link href="/mypage" prefetch={false} className="flex-1">
                      <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                        {t('header.mypage')}
                      </Button>
                    </Link>
                    <Link href="/proposals" prefetch={false} className="flex-1">
                      <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                        Proposals
                      </Button>
                    </Link>
                    {isDancerPending && (
                      <Badge variant="outline" className="border-zinc-300 bg-zinc-100 text-zinc-700 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        승인 대기
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" className="w-full justify-start" onClick={handleSignOut}>
                    {t('header.signout')}
                  </Button>
                </div>
              ) : (
                <div className="pt-4 space-y-2">
                  <Link href="/signin" prefetch={false}>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                      {t('header.signin')}
                    </Button>
                  </Link>
                  <Link href="/signup" prefetch={false}>
                    <Button className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                      {t('header.signup')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
