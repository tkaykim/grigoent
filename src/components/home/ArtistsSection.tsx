'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { User as UserIcon } from 'lucide-react'

export function ArtistsSection() {
  const [artists, setArtists] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  // 더미 데이터 사용 여부 제거
  const { t, language } = useLanguage()

  useEffect(() => {
    fetchArtistsWithTimeout()
  }, [])

  const fetchArtistsWithTimeout = async () => {
    if (retryCount >= 3) {
      setLoading(false)
      return
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 1000) // 1초 타임아웃으로 변경
    })

    try {
      const dataPromise = supabase
        .from('users')
        .select('*')
        .eq('type', 'dancer')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(8)

      const { data, error } = await Promise.race([dataPromise, timeoutPromise]) as any

      if (error) {
        console.error('아티스트 로드 오류:', error)
        throw error
      }

      if (data && data.length > 0) {
        setArtists(data)
        setLoading(false)
        console.log('아티스트 로드 성공')
      } else {
        throw new Error('No data')
      }
    } catch (error) {
      console.error(`아티스트 로드 실패 (시도 ${retryCount + 1}/3):`, error)
      setRetryCount(prev => prev + 1)
      
      // 1초 타임아웃 시 첫 번째 시도에서만 강제 리로드
      if (retryCount === 0) {
        console.log('1초 타임아웃 - 강제 리로드 실행')
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }
    }
  }

  const getArtistName = (artist: User) => {
    if (language === 'en' && artist.name_en) {
      return artist.name_en
    }
    return artist.name
  }

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 tracking-wider">
              {t('artists.title')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('artists.subtitle')}
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {t('artists.loading')} (시도 {retryCount}/3) - 1.5초 후 페이지 새로고침
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4 md:p-6 animate-pulse">
                <div className="w-full h-48 md:h-56 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 tracking-wider">
            {t('artists.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('artists.description')}
          </p>
          {/* 아티스트가 없을 때 안내 메시지 */}
          {(!loading && artists.length === 0) && (
            <p className="text-sm text-gray-500 mt-4">
              {t('artists.empty') || '등록된 댄서가 없습니다.'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {artists.map((artist) => (
            <div key={artist.id} className="group bg-gray-50 rounded-lg p-4 md:p-6 hover:bg-gray-100 transition-all duration-300 transform hover:scale-105">
              <Link href={`/${artist.slug}`} className="block">
                <div className="relative mb-4">
                  {artist.profile_image ? (
                    <img
                      src={artist.profile_image}
                      alt={getArtistName(artist)}
                      className="w-full h-48 md:h-56 object-cover rounded-lg"
                      loading="lazy"
                      onError={(e) => {
                        console.error('아티스트 이미지 로드 실패:', e)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 md:h-56 bg-gray-200 rounded-lg flex items-center justify-center">
                      <UserIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300 rounded-lg"></div>
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 text-black group-hover:text-gray-700 transition-colors">
                  {getArtistName(artist)}
                </h3>
                {artist.introduction && (
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {artist.introduction}
                  </p>
                )}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/artists">
            <Button size="lg" className="bg-black text-white font-bold tracking-widest uppercase hover:bg-gray-800 transition-all duration-300">
              {t('artists.viewall')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
} 