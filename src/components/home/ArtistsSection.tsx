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

// 하드코딩된 폴백 데이터
const FALLBACK_ARTISTS: User[] = [
  {
    id: 'fallback-1',
    name: '김댄서',
    name_en: 'Kim Dancer',
    email: 'kim@example.com',
    phone: '',
    profile_image: '',
    slug: 'kim-dancer',
    type: 'dancer',
    pending_type: undefined,
    display_order: undefined,
    introduction: '프로페셔널 댄서',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fallback-2',
    name: '이안무가',
    name_en: 'Lee Choreographer',
    email: 'lee@example.com',
    phone: '',
    profile_image: '',
    slug: 'lee-choreographer',
    type: 'dancer',
    pending_type: undefined,
    display_order: undefined,
    introduction: '크리에이티브 안무가',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'fallback-3',
    name: '박퍼포머',
    name_en: 'Park Performer',
    email: 'park@example.com',
    phone: '',
    profile_image: '',
    slug: 'park-performer',
    type: 'dancer',
    pending_type: undefined,
    display_order: undefined,
    introduction: '스테이지 퍼포머',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    created_at: '2024-01-03T00:00:00Z',
  },
  {
    id: 'fallback-4',
    name: '최아티스트',
    name_en: 'Choi Artist',
    email: 'choi@example.com',
    phone: '',
    profile_image: '',
    slug: 'choi-artist',
    type: 'dancer',
    pending_type: undefined,
    display_order: undefined,
    introduction: '컨템포러리 아티스트',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    created_at: '2024-01-04T00:00:00Z',
  },
  {
    id: 'fallback-5',
    name: '정크루',
    name_en: 'Jung Crew',
    email: 'jung@example.com',
    phone: '',
    profile_image: '',
    slug: 'jung-crew',
    type: 'dancer',
    pending_type: undefined,
    display_order: undefined,
    introduction: '스트릿 댄스 크루',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    created_at: '2024-01-05T00:00:00Z',
  },
  {
    id: 'fallback-6',
    name: '한스타',
    name_en: 'Han Star',
    email: 'han@example.com',
    phone: '',
    profile_image: '',
    slug: 'han-star',
    type: 'dancer',
    pending_type: undefined,
    display_order: undefined,
    introduction: 'K-POP 댄서',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    created_at: '2024-01-06T00:00:00Z',
  },
  {
    id: 'fallback-7',
    name: '윤마스터',
    name_en: 'Yoon Master',
    email: 'yoon@example.com',
    phone: '',
    profile_image: '',
    slug: 'yoon-master',
    type: 'dancer',
    pending_type: undefined,
    display_order: undefined,
    introduction: '댄스 마스터',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    created_at: '2024-01-07T00:00:00Z',
  },
  {
    id: 'fallback-8',
    name: '강프로',
    name_en: 'Kang Pro',
    email: 'kang@example.com',
    phone: '',
    profile_image: '',
    slug: 'kang-pro',
    type: 'dancer',
    pending_type: undefined,
    display_order: undefined,
    introduction: '프로페셔널 댄서',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    created_at: '2024-01-08T00:00:00Z',
  },
]

export function ArtistsSection() {
  const [artists, setArtists] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [useFallback, setUseFallback] = useState(false)
  const { t, language } = useLanguage()

  useEffect(() => {
    fetchArtistsWithTimeout()
  }, [])

  const fetchArtistsWithTimeout = async () => {
    if (retryCount >= 3) {
      console.log('3회 시도 후 폴백 데이터 사용')
      setArtists(FALLBACK_ARTISTS)
      setLoading(false)
      setUseFallback(true)
      return
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 1500) // 1.5초 타임아웃
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
      
      if (retryCount + 1 >= 3) {
        console.log('3회 시도 후 폴백 데이터 사용')
        setArtists(FALLBACK_ARTISTS)
        setLoading(false)
        setUseFallback(true)
      } else {
        // 1.5초 후 강제 리프레시
        console.log(`${retryCount + 1}회 시도 실패, 1.5초 후 페이지 리프레시`)
        setTimeout(() => {
          window.location.reload()
        }, 1500)
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
          {useFallback && (
            <p className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-lg inline-block mt-4">
              📡 캐싱된 데이터를 표시하고 있습니다
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