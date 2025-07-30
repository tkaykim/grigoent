'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { User, Team } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { User as UserIcon } from 'lucide-react'

export function ArtistsSection() {
  const [orderedItems, setOrderedItems] = useState<Array<{type: 'artist' | 'team', data: User | Team}>>([])
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const { t, language } = useLanguage()

  useEffect(() => {
    fetchArtists()
  }, [])

  const fetchArtists = async () => {
    if (retryCount >= 3) {
      setLoading(false)
      return
    }

    try {
      // 아티스트 페이지와 동일한 방식: 통합 순서 테이블 사용
      const { data: orderItems, error: orderError } = await supabase
        .from('display_order_items')
        .select('*')
        .order('display_order', { ascending: true })

      if (orderError) {
        console.error('순서 데이터 로드 오류:', orderError)
        await fetchWithLegacyMethod()
        return
      }

      if (!orderItems || orderItems.length === 0) {
        await fetchWithLegacyMethod()
        return
      }

      // 아티스트와 팀 ID 분리 (아티스트 페이지와 동일)
      const artistIds = orderItems
        .filter(item => item.item_type === 'artist')
        .map(item => item.item_id)
      
      const teamIds = orderItems
        .filter(item => item.item_type === 'team')
        .map(item => item.item_id)

      // 아티스트와 팀 데이터 가져오기 (아티스트 페이지와 동일)
      const [artistsResult, teamsResult] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('type', 'dancer')
          .in('id', artistIds),
        supabase
          .from('teams')
          .select('*')
          .eq('status', 'active')
          .in('id', teamIds)
      ])

      if (artistsResult.error || teamsResult.error) {
        console.error('데이터 로드 오류:', artistsResult.error || teamsResult.error)
        await fetchWithLegacyMethod()
        return
      }

      // 순서 테이블의 순서대로 아티스트와 팀 정렬 (아티스트 페이지와 동일)
      const orderedItems: Array<{type: 'artist' | 'team', data: User | Team}> = []

      orderItems.forEach(orderItem => {
        if (orderItem.item_type === 'artist') {
          const artist = artistsResult.data?.find(a => a.id === orderItem.item_id)
          if (artist) {
            orderedItems.push({ type: 'artist', data: artist })
          }
        } else if (orderItem.item_type === 'team') {
          const team = teamsResult.data?.find(t => t.id === orderItem.item_id)
          if (team) {
            orderedItems.push({ type: 'team', data: team })
          }
        }
      })

      // 최대 8개만 표시
      const limitedItems = orderedItems.slice(0, 8)

      if (limitedItems.length > 0) {
        setOrderedItems(limitedItems)
        setLoading(false)
        console.log('아티스트 로드 성공 (아티스트 페이지와 동일한 순서)')
      } else {
        throw new Error('No data')
      }
    } catch (error) {
      console.error(`아티스트 로드 실패 (시도 ${retryCount + 1}/3):`, error)
      setRetryCount(prev => prev + 1)
      
      if (retryCount + 1 >= 3) {
        setLoading(false)
      }
    }
  }

  // 기존 방식으로 로드 (fallback)
  const fetchWithLegacyMethod = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('type', 'dancer')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(8)

      if (error) {
        console.error('기존 방식 아티스트 로드 오류:', error)
        throw error
      }

      if (data && data.length > 0) {
        // 기존 방식은 아티스트만 표시
        const legacyItems = data.map(artist => ({ type: 'artist' as const, data: artist }))
        setOrderedItems(legacyItems)
        setLoading(false)
        console.log('아티스트 로드 성공 (기존 방식)')
      } else {
        throw new Error('No data')
      }
    } catch (error) {
      console.error('기존 방식 아티스트 로드 실패:', error)
      setLoading(false)
    }
  }

  const getItemName = (item: User | Team) => {
    if (language === 'en' && 'name_en' in item && item.name_en) {
      return item.name_en
    }
    return item.name
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
          {(!loading && orderedItems.length === 0) && (
            <p className="text-sm text-gray-500 mt-4">
              {t('artists.empty') || '등록된 아티스트가 없습니다.'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {orderedItems.map((item) => (
            <div key={`${item.type}-${item.data.id}`} className="group bg-gray-50 rounded-lg p-4 md:p-6 hover:bg-gray-100 transition-all duration-300 transform hover:scale-105">
              <Link href={item.type === 'artist' ? `/${(item.data as User).slug}` : `/teams/${(item.data as Team).slug}`} className="block">
                <div className="relative mb-4">
                  {item.type === 'artist' ? (
                    // 아티스트 카드
                    <>
                      {(item.data as User).profile_image ? (
                        <img
                          src={(item.data as User).profile_image}
                          alt={(item.data as User).name}
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
                    </>
                  ) : (
                    // 팀 카드
                    <>
                      {(item.data as Team).logo_url ? (
                        <img
                          src={(item.data as Team).logo_url}
                          alt={(item.data as Team).name}
                          className="w-full h-48 md:h-56 object-cover rounded-lg"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full h-48 md:h-56 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-2xl">👥</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300 rounded-lg"></div>
                    </>
                  )}
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 text-black group-hover:text-gray-700 transition-colors">
                  {getItemName(item.data)}
                </h3>
                {item.type === 'artist' ? (
                  // 아티스트 정보
                  <>
                    {(item.data as User).name_en && (
                      <p className="text-sm text-gray-600 mb-2">
                        {(item.data as User).name_en}
                      </p>
                    )}
                    {(item.data as User).introduction && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {(item.data as User).introduction}
                      </p>
                    )}
                  </>
                ) : (
                  // 팀 정보
                  <>
                    {(item.data as Team).name_en && (
                      <p className="text-sm text-gray-600 mb-2">
                        {(item.data as Team).name_en}
                      </p>
                    )}
                    {(item.data as Team).description && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {(item.data as Team).description}
                      </p>
                    )}
                  </>
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