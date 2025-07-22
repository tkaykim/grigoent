'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArtistSearch } from '@/components/artists/ArtistSearch'
import Link from 'next/link'

// 하드코딩된 폴백 데이터 (더 많은 아티스트)

export default function ArtistsPage() {
  const [allArtists, setAllArtists] = useState<User[]>([])
  const [filteredArtists, setFilteredArtists] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  // 더미 데이터 사용 여부 제거

  useEffect(() => {
    fetchArtistsWithTimeout()
  }, [])

  // 검색 및 필터링 함수
  const handleSearch = (query: string, category: string) => {
    let filtered = allArtists

    // 텍스트 검색
    if (query.trim()) {
      const searchTerm = query.toLowerCase()
      filtered = filtered.filter(artist => 
        artist.name.toLowerCase().includes(searchTerm) ||
        artist.name_en.toLowerCase().includes(searchTerm) ||
        (artist.introduction && artist.introduction.toLowerCase().includes(searchTerm))
      )
    }

    // 카테고리 필터링 (실제로는 경력 데이터를 확인해야 하지만, 여기서는 간단히 처리)
    if (category !== 'all') {
      // 실제 구현에서는 경력 데이터를 조인해서 필터링해야 함
      // 현재는 모든 아티스트를 표시
    }

    setFilteredArtists(filtered)
  }

  const handleClearSearch = () => {
    setFilteredArtists(allArtists)
  }

  const fetchArtistsWithTimeout = async () => {
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

      const { data, error } = await Promise.race([dataPromise, timeoutPromise]) as any

      if (error) {
        console.error('아티스트 로드 오류:', error)
        throw error
      }

      if (data && data.length > 0) {
        setAllArtists(data)
        setFilteredArtists(data)
        setLoading(false)
        console.log('아티스트 로드 성공')
      } else {
        throw new Error('No data')
      }
    } catch (error) {
      console.error(`아티스트 로드 실패 (시도 ${retryCount + 1}/3):`, error)
      setRetryCount(prev => prev + 1)
      // 더미 데이터 없이, 1.5초 후 강제 리프레시만 유지
      if (retryCount + 1 < 3) {
        console.log(`${retryCount + 1}회 시도 실패, 1.5초 후 페이지 리프레시`)
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setLoading(false)
      }
    }
  }

  if (loading) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Our Artists
              </h1>
              <p className="text-xl text-white/60">
                최고의 댄서들을 만나보세요
              </p>
              {retryCount > 0 && (
                <p className="text-sm text-white/40 mt-2">
                  로딩 중... (시도 {retryCount}/3) - 1.5초 후 페이지 새로고침
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-4 md:p-6 animate-pulse">
                  <div className="w-full h-48 md:h-56 bg-white/10 rounded-lg mb-4"></div>
                  <div className="h-4 bg-white/10 rounded mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-2/3"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2 mt-2"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div>
      <Header />
              <main className="pt-16 min-h-screen bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Our Artists
              </h1>
              <p className="text-xl text-white/60">
                최고의 댄서들을 만나보세요
              </p>
              {/* 더미 데이터 없이, 1.5초 후 강제 리프레시만 유지 */}
            </div>

            {/* 검색 컴포넌트 */}
            <ArtistSearch 
              onSearch={handleSearch}
              onClear={handleClearSearch}
              className="bg-white/10 border-white/20"
            />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredArtists.map((artist) => (
              <div key={artist.id} className="group bg-white/5 rounded-lg p-4 md:p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                <Link href={`/${artist.slug}`} className="block">
                  <div className="relative mb-4">
                    {artist.profile_image ? (
                      <img
                        src={artist.profile_image}
                        alt={artist.name}
                        className="w-full h-48 md:h-56 object-cover rounded-lg"
                        loading="lazy"
                        onError={(e) => {
                          console.error('아티스트 이미지 로드 실패:', e)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 md:h-56 bg-white/10 rounded-lg flex items-center justify-center">
                        <span className="text-white/40 text-2xl">🎭</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 rounded-lg"></div>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 text-white group-hover:text-white/80 transition-colors">
                    {artist.name}
                  </h3>
                  {artist.name_en && (
                    <p className="text-sm md:text-base text-white/60 mb-2">
                      {artist.name_en}
                    </p>
                  )}
                  {artist.introduction && (
                    <p className="text-sm text-white/80 line-clamp-2">
                      {artist.introduction}
                    </p>
                  )}
                </Link>
              </div>
            ))}
          </div>

          {filteredArtists.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/60 text-lg">
                {allArtists.length === 0 ? '등록된 댄서가 없습니다.' : '검색 결과가 없습니다.'}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
} 