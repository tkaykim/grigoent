'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, CareerEntry } from '@/lib/types'
import { getThumbnailFromUrl, isValidYouTubeUrl } from '@/lib/youtube'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Carousel } from '@/components/ui/carousel'
import { CareerCard } from '@/components/artists/CareerCard'
import { CareerSearch } from '@/components/artists/CareerSearch'
import { ProposalButton } from '@/components/proposals/ProposalButton'
import { LoginStatus } from '@/components/auth/LoginStatus'
import { ProposalTypeInfo } from '@/components/proposals/ProposalTypeInfo'
import { ExternalLink, Instagram, Twitter, Youtube, MapPin, Calendar } from 'lucide-react'

export default function ArtistDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [artist, setArtist] = useState<User | null>(null)
  const [careers, setCareers] = useState<CareerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    if (slug) {
      fetchArtistDataWithTimeout()
    }
  }, [slug])

  // 경력 데이터가 변경될 때 필터링된 경력도 업데이트
  useEffect(() => {
    setFilteredCareers(careers)
  }, [careers])

  const fetchArtistDataWithTimeout = async () => {
    if (retryCount >= 3) {
      console.log('3회 시도 후 폴백 데이터 사용')
      setLoading(false)
      setUseFallback(true)
      return
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 2000) // 2초 타임아웃
    })

    try {
      const dataPromise = fetchArtistData()
      await Promise.race([dataPromise, timeoutPromise])
    } catch (error) {
      console.error(`아티스트 데이터 로드 실패 (시도 ${retryCount + 1}/3):`, error)
      setRetryCount(prev => prev + 1)
      
      if (retryCount + 1 >= 3) {
        console.log('3회 시도 후 폴백 데이터 사용')
        setLoading(false)
        setUseFallback(true)
      } else {
        // 2초 후 강제 리프레시
        console.log(`${retryCount + 1}회 시도 실패, 2초 후 페이지 리프레시`)
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    }
  }

  const fetchArtistData = async () => {
    try {
      // 아티스트 정보 가져오기
      const { data: artistData, error: artistError } = await supabase
        .from('users')
        .select('*')
        .eq('slug', slug)
        .eq('type', 'dancer')
        .single()

      if (artistError) {
        setError('아티스트를 찾을 수 없습니다.')
        setLoading(false)
        return
      }

      setArtist(artistData)

      // 경력 정보 가져오기
      const { data: careersData, error: careersError } = await supabase
        .from('career_entries')
        .select('*')
        .eq('user_id', artistData.id)
        .order('created_at', { ascending: false })

      if (!careersError) {
        setCareers(careersData || [])
      }
    } catch (error) {
      console.error('아티스트 데이터 로드 오류:', error)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      choreography: '안무',
      performance: '공연',
      advertisement: '광고',
      tv: '방송',
      workshop: '워크샵',
    }
    return labels[category] || category
  }

  const [filteredCareers, setFilteredCareers] = useState<CareerEntry[]>(careers)

  // 카테고리별 경력 그룹화 (필터링된 경력 기준)
  const careersByCategory = filteredCareers.reduce((acc, career) => {
    if (!acc[career.category]) {
      acc[career.category] = []
    }
    acc[career.category].push(career)
    return acc
  }, {} as Record<string, CareerEntry[]>)

  const featuredCareers = filteredCareers.filter(career => career.is_featured).slice(0, 4)

  // 경력 필터링 핸들러
  const handleFilteredCareers = (filtered: CareerEntry[]) => {
    setFilteredCareers(filtered)
  }

  if (loading) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-zinc-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-zinc-900 mb-4">
                아티스트 정보 로딩 중...
              </h1>
              {retryCount > 0 && (
                <p className="text-sm text-zinc-500">
                  로딩 중... (시도 {retryCount}/3) - 2초 후 페이지 새로고침
                </p>
              )}
            </div>
            <div className="animate-pulse">
              <div className="flex items-center space-x-6 mb-8">
                <div className="w-32 h-32 bg-zinc-200 rounded-full" />
                <div className="space-y-2">
                  <div className="h-8 bg-zinc-200 rounded w-48" />
                  <div className="h-4 bg-zinc-200 rounded w-32" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (useFallback) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-zinc-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-900 mb-4">
                서버 연결 문제
              </h1>
              <p className="text-zinc-600 mb-4">
                일시적인 서버 연결 문제로 인해 아티스트 정보를 불러올 수 없습니다.
              </p>
              <p className="text-sm text-zinc-500 bg-zinc-100 px-4 py-2 rounded-lg inline-block">
                📡 3회 시도 후 폴백 모드
              </p>
              <div className="mt-6">
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-zinc-900 hover:bg-zinc-800"
                >
                  다시 시도
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !artist) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-zinc-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-900 mb-4">
                {error || '아티스트를 찾을 수 없습니다'}
              </h1>
              <p className="text-zinc-600">
                요청하신 아티스트의 정보를 찾을 수 없습니다.
              </p>
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
      <main className="pt-16 min-h-screen bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 프로필 헤더 */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="flex-shrink-0">
                {artist.profile_image ? (
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200 shadow-lg">
                    <img
                      src={artist.profile_image}
                      alt={artist.name}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        console.error('프로필 이미지 로드 실패:', e)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300 shadow-lg">
                    <span className="text-4xl text-gray-400 font-semibold">{artist.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold text-zinc-900 mb-2">
                  {artist.name}
                </h1>
                <p className="text-2xl text-zinc-600 mb-4">
                  {artist.name_en}
                </p>
                
                {artist.introduction && (
                  <p className="text-lg text-zinc-700 mb-6 leading-relaxed">
                    {artist.introduction}
                  </p>
                )}

                {/* SNS 링크 */}
                {(artist.instagram_url || artist.twitter_url || artist.youtube_url) && (
                  <div className="flex justify-center md:justify-start space-x-4 mb-6">
                    {artist.instagram_url && (
                      <a
                        href={artist.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {artist.twitter_url && (
                      <a
                        href={artist.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {artist.youtube_url && (
                      <a
                        href={artist.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Youtube className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                )}

                {artist.phone && (
                  <div className="text-sm text-zinc-500 mb-4">
                    연락처: {artist.phone}
                  </div>
                )}

                {/* 섭외 제안 버튼 */}
                <div className="mt-6">
                  <ProposalButton
                    dancerId={artist.id}
                    dancerName={artist.name}
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* 제안 유형 정보 */}
                <div className="mt-4">
                  <ProposalTypeInfo />
                </div>
              </div>
            </div>
          </div>

          {/* 대표작 */}
          {featuredCareers.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-zinc-900">대표작</h2>
                <div className="text-sm text-zinc-600">
                  {featuredCareers.length}개의 대표작
                </div>
              </div>
              <Carousel className="mb-8">
                {featuredCareers.map((career) => (
                  <CareerCard key={career.id} career={career} showDetails={false} />
                ))}
              </Carousel>
            </div>
          )}

          {/* 경력 검색 */}
          {careers.length > 0 && (
            <CareerSearch 
              careers={careers}
              onFilteredCareers={handleFilteredCareers}
            />
          )}

          {/* 카테고리별 경력 */}
          {Object.keys(careersByCategory).length > 0 && (
            <div className="space-y-12">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-zinc-900">카테고리별 경력</h2>
                <div className="text-sm text-zinc-600">
                  총 {filteredCareers.length}개의 경력
                  {filteredCareers.length !== careers.length && (
                    <span className="text-blue-600 ml-2">
                      (전체 {careers.length}개 중)
                    </span>
                  )}
                </div>
              </div>
              
              {Object.entries(careersByCategory).map(([category, categoryCareers]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-semibold text-zinc-900">
                      {getCategoryLabel(category)}
                    </h3>
                    <Badge variant="outline" className="text-sm">
                      {categoryCareers.length}개
                    </Badge>
                  </div>
                  
                  <Carousel>
                    {categoryCareers.map((career) => (
                      <CareerCard key={career.id} career={career} />
                    ))}
                  </Carousel>
                </div>
              ))}
            </div>
          )}

          {filteredCareers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-600 text-lg">
                {careers.length === 0 ? '등록된 경력이 없습니다.' : '검색 결과가 없습니다.'}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
} 