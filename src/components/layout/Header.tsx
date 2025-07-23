'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Menu, X, Clock } from 'lucide-react'
import { LanguageToggle } from '@/components/ui/LanguageToggle'

export function Header() {
  const { user, profile, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()
  
  // 댄서 승인 대기 상태 확인
  const isDancerPending = profile?.pending_type === 'dancer' && profile?.type === 'general'
  
  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.about'), href: '/#about' },
    { name: t('nav.artists'), href: '/artists' },
    { name: t('nav.works'), href: '/#works' },
    { name: t('nav.contact'), href: '/#contact' },
  ]

  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-zinc-900">GRIGO</span>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* 사용자 메뉴 */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageToggle />
            {user ? (
              <div className="flex items-center space-x-4">
                {profile?.type === 'admin' && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm">
                      {t('header.admin')}
                    </Button>
                  </Link>
                )}
                <div className="flex items-center space-x-2">
                <Link href="/mypage">
                  <Button variant="ghost" size="sm">
                    {t('header.mypage')}
                  </Button>
                </Link>
                  {isDancerPending && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      승인 대기
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  {t('header.signout')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/signin">
                  <Button variant="ghost" size="sm">
                    {t('header.signin')}
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    {t('header.signup')}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-zinc-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {user ? (
                <div className="pt-4 space-y-2">
                  {profile?.type === 'admin' && (
                    <Link href="/admin">
                      <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                        {t('header.admin')}
                      </Button>
                    </Link>
                  )}
                  <div className="flex items-center space-x-2">
                    <Link href="/mypage" className="flex-1">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                      {t('header.mypage')}
                    </Button>
                  </Link>
                    {isDancerPending && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
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
                  <Link href="/signin">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                      {t('header.signin')}
                    </Button>
                  </Link>
                  <Link href="/signup">
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