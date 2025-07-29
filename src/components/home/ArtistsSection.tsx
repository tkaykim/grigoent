'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { User, Team } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { User as UserIcon, Users } from 'lucide-react'

interface DisplayItem {
  id: string
  type: 'artist' | 'team'
  data: User | Team
  display_order: number
}

export function ArtistsSection() {
  const [items, setItems] = useState<DisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const { t, language } = useLanguage()

  useEffect(() => {
    fetchItemsWithTimeout()
  }, [])

  const fetchItemsWithTimeout = async () => {
    if (retryCount >= 3) {
      setLoading(false)
      return
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 1000)
    })

    try {
      // 통합 순서 테이블에서 데이터 가져오기
      const { data: orderItems, error: orderError } = await supabase
        .from('display_order_items')
        .select('*')
        .order('display_order', { ascending: true })
        .limit(8)

      if (orderError) {
        console.error('순서 데이터 로드 오류:', orderError)
        // 순서 테이블이 없으면 기존 방식으로 로드
        await fetchWithLegacyMethod()
        return
      }

      if (!orderItems || orderItems.length === 0) {
        // 순서 테이블이 비어있으면 기존 방식으로 로드
        await fetchWithLegacyMethod()
        return
      }

      // 아티스트와 팀 ID 분리
      const artistIds = orderItems
        .filter(item => item.item_type === 'artist')
        .map(item => item.item_id)
      
      const teamIds = orderItems
        .filter(item => item.item_type === 'team')
        .map(item => item.item_id)

      // 아티스트와 팀 데이터 가져오기
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

      // 순서 테이블의 순서대로 아이템 구성
      const allItems: DisplayItem[] = orderItems.map(orderItem => {
        if (orderItem.item_type === 'artist') {
          const artist = artistsResult.data?.find(a => a.id === orderItem.item_id)
          if (artist) {
            return {
              id: artist.id,
              type: 'artist' as const,
              data: artist,
              display_order: orderItem.display_order
            }
          }
        } else if (orderItem.item_type === 'team') {
          const team = teamsResult.data?.find(t => t.id === orderItem.item_id)
          if (team) {
            return {
              id: team.id,
              type: 'team' as const,
              data: team,
              display_order: orderItem.display_order
            }
          }
        }
        return null
      }).filter(Boolean) as DisplayItem[]

      setItems(allItems)
      setLoading(false)
      console.log('아티스트 & 팀 로드 성공')
    } catch (error) {
      console.error(`아이템 로드 실패 (시도 ${retryCount + 1}/3):`, error)
      setRetryCount(prev => prev + 1)
      
      if (retryCount === 0) {
        console.log('1초 타임아웃 - 강제 리로드 실행')
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }
    }
  }

  // 기존 방식으로 데이터 로드 (순서 테이블이 없을 때 사용)
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
        console.error('아티스트 로드 오류:', error)
        throw error
      }

      if (data && data.length > 0) {
        const artistItems: DisplayItem[] = data.map((artist, index) => ({
          id: artist.id,
          type: 'artist' as const,
          data: artist,
          display_order: artist.display_order || index + 1
        }))
        setItems(artistItems)
        setLoading(false)
        console.log('기존 방식 아티스트 로드 성공')
      } else {
        throw new Error('No data')
      }
    } catch (error) {
      console.error('기존 방식 데이터 로드 오류:', error)
      setLoading(false)
    }
  }

  const getItemName = (item: DisplayItem) => {
    if (item.type === 'artist') {
      const artist = item.data as User
      if (language === 'en' && artist.name_en) {
        return artist.name_en
      }
      return artist.name
    } else {
      const team = item.data as Team
      if (language === 'en' && team.name_en) {
        return team.name_en
      }
      return team.name
    }
  }

  const getItemDescription = (item: DisplayItem) => {
    if (item.type === 'artist') {
      const artist = item.data as User
      return artist.introduction
    } else {
      const team = item.data as Team
      return team.description
    }
  }

  const getItemImage = (item: DisplayItem) => {
    if (item.type === 'artist') {
      const artist = item.data as User
      return artist.profile_image
    } else {
      const team = item.data as Team
      return team.logo_url
    }
  }

  const getItemSlug = (item: DisplayItem) => {
    if (item.type === 'artist') {
      const artist = item.data as User
      return artist.slug
    } else {
      const team = item.data as Team
      return `teams/${team.slug}`
    }
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
          {/* 아이템이 없을 때 안내 메시지 */}
          {(!loading && items.length === 0) && (
            <p className="text-sm text-gray-500 mt-4">
              {t('artists.empty') || '등록된 댄서가 없습니다.'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {items.map((item) => (
            <div key={item.id} className="group bg-gray-50 rounded-lg p-4 md:p-6 hover:bg-gray-100 transition-all duration-300 transform hover:scale-105">
              <Link href={`/${getItemSlug(item)}`} className="block">
                <div className="relative mb-4">
                  {getItemImage(item) ? (
                    <img
                      src={getItemImage(item)}
                      alt={getItemName(item)}
                      className="w-full h-48 md:h-56 object-cover rounded-lg"
                      loading="lazy"
                      onError={(e) => {
                        console.error('이미지 로드 실패:', e)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 md:h-56 bg-gray-200 rounded-lg flex items-center justify-center">
                      {item.type === 'artist' ? (
                        <UserIcon className="w-12 h-12 text-gray-400" />
                      ) : (
                        <Users className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300 rounded-lg"></div>
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 text-black group-hover:text-gray-700 transition-colors">
                  {getItemName(item)}
                </h3>
                {getItemDescription(item) && (
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {getItemDescription(item)}
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