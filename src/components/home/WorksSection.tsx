'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { CareerEntry, User } from '@/lib/types'
import Link from 'next/link'
import { Play, Star, X, RefreshCw } from 'lucide-react'

interface FeaturedWork {
  id: string
  title: string
  description?: string
  video_url?: string
  poster_url?: string
  category: string
  artist: {
    id: string
    name: string
    slug: string
  }
  created_at: string
}

export function WorksSection() {
  const [featuredWorks, setFeaturedWorks] = useState<FeaturedWork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWork, setSelectedWork] = useState<FeaturedWork | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<number>(0)

  // 사용자 프로필 가져오기
  useEffect(() => {
    const getUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('type')
            .eq('id', user.id)
            .single()
          
          setUserProfile(profile)
        }
      } catch (error) {
        console.error('사용자 프로필 로드 오류:', error)
      }
    }

    getUserProfile()
  }, [])

  const fetchFeaturedWorks = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      // 타임아웃 없이 직접 쿼리 실행
      const { data: featuredCareers, error } = await supabase
        .from('career_entries')
        .select(`
          id,
          title,
          description,
          video_url,
          poster_url,
          category,
          created_at,
          user_id,
          is_featured,
          updated_at
        `)
        .eq('is_featured', true)
        .order('updated_at', { ascending: false })
        .limit(6)

      if (error) {
        console.error('대표작 로드 오류:', error)
        setError('대표작을 불러오는 중 오류가 발생했습니다.')
        return
      }

      if (featuredCareers && featuredCareers.length > 0) {
        // 각 경력에 해당하는 사용자 정보 가져오기
        const userIds = [...new Set(featuredCareers.map((career: any) => career.user_id))]
        
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, slug')
          .in('id', userIds)

        if (usersError) {
          console.error('사용자 정보 로드 오류:', usersError)
          setError('사용자 정보를 불러오는 중 오류가 발생했습니다.')
          return
        }

        const works = featuredCareers.map((career: any) => {
          const user = users?.find((u: any) => u.id === career.user_id)
          return {
            id: career.id,
            title: career.title,
            description: career.description,
            video_url: career.video_url,
            poster_url: career.poster_url,
            category: career.category || '안무제작',
            artist: user ? {
              id: user.id,
              name: user.name,
              slug: user.slug
            } : {
              id: career.user_id,
              name: 'Unknown Artist',
              slug: ''
            },
            created_at: career.created_at,
            updated_at: career.updated_at
          }
        })

        setFeaturedWorks(works)
        lastFetchTimeRef.current = Date.now()
        console.log('대표작 로드 성공:', works.length, '개')
      } else {
        console.log('등록된 대표작이 없습니다.')
        setFeaturedWorks([])
      }
    } catch (error: any) {
      console.error('대표작 로드 실패:', error)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // 하루에 한 번 자동 새로고침 설정 (24시간마다)
  useEffect(() => {
    const startPeriodicRefresh = () => {
      refreshIntervalRef.current = setInterval(() => {
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current
        // 마지막 fetch로부터 24시간이 지났으면 새로고침
        if (timeSinceLastFetch > 24 * 60 * 60 * 1000) {
          fetchFeaturedWorks()
        }
      }, 60 * 60 * 1000) // 1시간마다 체크
    }

    startPeriodicRefresh()

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [fetchFeaturedWorks])

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      if (isMounted) {
        await fetchFeaturedWorks()
      }
    }

    loadData()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [fetchFeaturedWorks])

  const handleManualRefresh = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault()
    
    // 강제로 상태 리셋
    setFeaturedWorks([])
    setError(null)
    
    // 강제로 새로운 요청을 만들기 위해 약간의 지연
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 캐시 무효화를 위해 새로운 요청
    await fetchFeaturedWorks(true)
  }, [fetchFeaturedWorks])

  const getYouTubeVideoId = useCallback((url: string) => {
    if (!url) return null
    
    let videoId = null
    
    // 다양한 YouTube URL 형식 지원
    if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0]
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0]
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0]
    }
    
    return videoId
  }, [])

  const getThumbnailUrl = useCallback((work: FeaturedWork) => {
    // 포스터 URL이 있으면 우선 사용
    if (work.poster_url) {
      return work.poster_url
    }
    
    // YouTube URL에서 썸네일 추출
    if (work.video_url) {
      const videoId = getYouTubeVideoId(work.video_url)
      
      if (videoId) {
        // 여러 해상도 시도 (maxresdefault -> hqdefault -> mqdefault)
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    }
    
    return undefined
  }, [getYouTubeVideoId])

  const handleWorkClick = useCallback((work: FeaturedWork) => {
    setSelectedWork(work)
    setShowVideoModal(true)
  }, [])

  const closeVideoModal = useCallback(() => {
    setShowVideoModal(false)
    setSelectedWork(null)
  }, [])

  if (loading) {
    return (
      <section id="works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6">
              Our Works
            </h2>
            <p className="text-xl text-zinc-600 max-w-3xl mx-auto">
              우리 댄서들이 참여한 다양한 프로젝트들을 확인해보세요.
              각각의 작품은 열정과 창의성이 담긴 결과물입니다.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-zinc-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-zinc-200 rounded mb-2"></div>
                <div className="h-3 bg-zinc-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id="works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6">
              Our Works
            </h2>
            <p className="text-xl text-zinc-600 max-w-3xl mx-auto">
              우리 댄서들이 참여한 다양한 프로젝트들을 확인해보세요.
              각각의 작품은 열정과 창의성이 담긴 결과물입니다.
            </p>
          </div>

          {/* 서비스 카드들 */}
          <div className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">🎵</div>
                <h4 className="font-semibold text-blue-900 mb-2">K-POP & 앨범 안무제작</h4>
                <p className="text-sm text-blue-700">아이돌 그룹, 솔로 아티스트의 타이틀곡 및 수록곡 안무 제작</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">🎬</div>
                <h4 className="font-semibold text-purple-900 mb-2">영화 & 광고 안무</h4>
                <p className="text-sm text-purple-700">영화, 드라마, 광고 CF 안무 제작 및 출연</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">📺</div>
                <h4 className="font-semibold text-green-900 mb-2">방송 & 행사 출연</h4>
                <p className="text-sm text-green-700">TV 프로그램, 콘서트, 행사 댄서 및 팀 섭외</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">🌍</div>
                <h4 className="font-semibold text-orange-900 mb-2">해외 & 국내 워크샵</h4>
                <p className="text-sm text-orange-700">전 세계 K-POP 댄스 레슨 및 워크샵 진행</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">💃</div>
                <h4 className="font-semibold text-red-900 mb-2">댄스 챌린지</h4>
                <p className="text-sm text-red-700">제품, 공간, 앨범 홍보를 위한 댄스 챌린지 제작</p>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border border-indigo-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">🏆</div>
                <h4 className="font-semibold text-indigo-900 mb-2">댄스 대회 & 행사</h4>
                <p className="text-sm text-indigo-700">댄스 대회 주최, 운영 및 다양한 행사 기획</p>
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          <div className="text-center py-12">
            <div className="text-zinc-400 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-zinc-600 mb-2">데이터를 불러올 수 없습니다</h3>
            <p className="text-zinc-500 mb-4">{error}</p>
            <button
              onClick={() => fetchFeaturedWorks()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section id="works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6">
              Our Works
            </h2>
            <p className="text-xl text-zinc-600 max-w-3xl mx-auto">
              우리 댄서들이 참여한 다양한 프로젝트들을 확인해보세요.
              각각의 작품은 열정과 창의성이 담긴 결과물입니다.
            </p>
          </div>

          {/* 서비스 카드들 */}
          <div className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">🎵</div>
                <h4 className="font-semibold text-blue-900 mb-2">K-POP & 앨범 안무제작</h4>
                <p className="text-sm text-blue-700">아이돌 그룹, 솔로 아티스트의 타이틀곡 및 수록곡 안무 제작</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">🎬</div>
                <h4 className="font-semibold text-purple-900 mb-2">영화 & 광고 안무</h4>
                <p className="text-sm text-purple-700">영화, 드라마, 광고 CF 안무 제작 및 출연</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">📺</div>
                <h4 className="font-semibold text-green-900 mb-2">방송 & 행사 출연</h4>
                <p className="text-sm text-green-700">TV 프로그램, 콘서트, 행사 댄서 및 팀 섭외</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">🌍</div>
                <h4 className="font-semibold text-orange-900 mb-2">해외 & 국내 워크샵</h4>
                <p className="text-sm text-orange-700">전 세계 K-POP 댄스 레슨 및 워크샵 진행</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">💃</div>
                <h4 className="font-semibold text-red-900 mb-2">댄스 챌린지</h4>
                <p className="text-sm text-red-700">제품, 공간, 앨범 홍보를 위한 댄스 챌린지 제작</p>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border border-indigo-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">🏆</div>
                <h4 className="font-semibold text-indigo-900 mb-2">댄스 대회 & 행사</h4>
                <p className="text-sm text-indigo-700">댄스 대회 주최, 운영 및 다양한 행사 기획</p>
              </div>
            </div>
          </div>

          {/* 최근 대표작 */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-zinc-800">Recently</h3>
              {userProfile?.type === 'admin' && (
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? '새로고침 중...' : '새로고침'}
                </button>
              )}
            </div>
            {featuredWorks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredWorks.map((work) => (
                  <div 
                    key={work.id} 
                    className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => handleWorkClick(work)}
                  >
                                         <div className="aspect-video relative">
                       {getThumbnailUrl(work) ? (
                         <img
                           src={getThumbnailUrl(work)}
                           alt={work.title}
                           className="w-full h-full object-cover"
                           loading="lazy"
                           onError={(e) => {
                             // 썸네일 로딩 실패 시 대체 이미지 표시
                             const img = e.currentTarget
                             const parent = img.parentElement
                             if (parent) {
                               img.style.display = 'none'
                               const fallback = parent.querySelector('.thumbnail-fallback')
                               if (fallback) {
                                 fallback.classList.remove('hidden')
                               }
                             }
                           }}
                         />
                       ) : null}
                       
                       {/* 썸네일 로딩 실패 시 대체 이미지 */}
                       <div className={`thumbnail-fallback w-full h-full bg-zinc-200 flex items-center justify-center ${getThumbnailUrl(work) ? 'hidden' : ''}`}>
                         <Play className="w-12 h-12 text-zinc-400" />
                       </div>

                      {/* 호버 오버레이 */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-center p-4">
                          <h3 className="text-lg font-semibold mb-2">{work.title}</h3>
                          <p className="text-sm font-medium">{work.category}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-zinc-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {work.title}
                      </h3>
                      <p className="text-sm text-zinc-600">{work.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-zinc-400 text-6xl mb-4">🎭</div>
                <h3 className="text-xl font-semibold text-zinc-600 mb-2">아직 등록된 대표작이 없습니다</h3>
                <p className="text-zinc-500">댄서들이 대표작을 등록하면 여기에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 비디오 모달 */}
      {showVideoModal && selectedWork && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-zinc-900">{selectedWork.title}</h3>
              <button
                onClick={closeVideoModal}
                className="text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4">
              {selectedWork.video_url && getYouTubeVideoId(selectedWork.video_url) ? (
                <div className="aspect-video w-full">
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedWork.video_url)}?autoplay=1`}
                    title={selectedWork.title}
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-video bg-zinc-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
                    <p className="text-zinc-600">영상이 없습니다</p>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <h4 className="font-semibold text-zinc-900 mb-2">{selectedWork.title}</h4>
                {selectedWork.description && (
                  <p className="text-zinc-600 mb-2">{selectedWork.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span>{selectedWork.category}</span>
                  <span>•</span>
                  <span>{selectedWork.artist.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 