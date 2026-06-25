'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, CareerEntry } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Play, Star, ChevronDown, ChevronRight, Calendar, MapPin, Edit, Trash, Plus, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { CareerVideoModal } from '@/components/artists/CareerVideoModal'
import { CareerEditModal } from '@/components/artists/detail/CareerEditModal'

// TIDAL 스타일 컴포넌트들
import { ArtistHero } from '@/components/artists/detail/ArtistHero'
import { ContentCarousel } from '@/components/artists/detail/ContentCarousel'
import { TidalCareerCard } from '@/components/artists/detail/TidalCareerCard'
import { PermissionManagerModal } from '@/components/artists/detail/PermissionManagerModal'

import { BiographySection } from '@/components/artists/detail/BiographySection'
import { LatestSongsSection } from '@/components/artists/detail/LatestSongsSection'
import { isHiddenPublicArtist } from '@/lib/public-profile-visibility'

const ARTIST_PROFILE_COLUMNS = [
  'id',
  'name',
  'name_en',
  'email',
  'phone',
  'profile_image',
  'slug',
  'type',
  'pending_type',
  'display_order',
  'introduction',
  'instagram_url',
  'twitter_url',
  'youtube_url',
  'created_at',
].join(',')

const CAREER_COLUMNS = [
  'id',
  'user_id',
  'linked_user_id',
  'category',
  'title',
  'description',
  'country',
  'video_url',
  'poster_url',
  'start_date',
  'end_date',
  'is_featured',
  'created_at',
  'updated_at',
  'date_type',
  'single_date',
  'is_linked',
].join(',')

const INITIAL_CAREER_LIMIT = 8

export default function ArtistDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { profile } = useAuth()
  const [artist, setArtist] = useState<User | null>(null)
  const [careers, setCareers] = useState<CareerEntry[]>([])
  const [careersLoading, setCareersLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [useFallback, setUseFallback] = useState(false)

  // 연도별 경력 아코디언 상태
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set())

  // 영상 팝업 상태
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [videoModalIndex, setVideoModalIndex] = useState(0)
  const [videoModalCareers, setVideoModalCareers] = useState<CareerEntry[]>([])
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCareer, setEditingCareer] = useState<CareerEntry | null>(null)

  // 수정모드 상태
  const [isEditMode, setIsEditMode] = useState(false)
  const [permissionModalOpen, setPermissionModalOpen] = useState(false)



  // 관리자 및 권한 상태
  const isAdmin = profile?.type === 'admin'
  const [hasEditPermission, setHasEditPermission] = useState(false)

  useEffect(() => {
    if (slug) {
      fetchArtistData()
    }
  }, [slug, profile?.id, profile?.type])

  // 현재 로그인 사용자의 아티스트 단위 수정 권한 조회
  useEffect(() => {
    const fetchPermission = async () => {
      if (!artist || !profile) return
      if (profile.type === 'admin' || profile.id === artist.id) {
        setHasEditPermission(true)
        return
      }
      try {
        const { data, error } = await supabase
          .from('data_access_permissions')
          .select('id')
          .eq('user_id', profile.id)
          .eq('original_owner_id', artist.id)
          .in('data_type', ['career', 'profile'])
          .in('access_level', ['write', 'admin'])
          .limit(1)
        if (error) {
          console.error('권한 조회 오류:', error)
          setHasEditPermission(false)
          return
        }
        setHasEditPermission((data || []).length > 0)
      } catch (e) {
        console.error('권한 조회 중 예외:', e)
        setHasEditPermission(false)
      }
    }
    fetchPermission()
  }, [artist, profile])

  const canEdit = !!profile && (isAdmin || profile.id === artist?.id || hasEditPermission)



  // 연도 추출 함수
  const getCareerYear = (career: CareerEntry): string => {
    if (career.single_date) {
      return new Date(career.single_date).getFullYear().toString()
    }
    if (career.start_date) {
      return new Date(career.start_date).getFullYear().toString()
    }
    return '기타'
  }

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  // YouTube URL 검증 함수
  const isValidYouTubeUrl = (url: string): boolean => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(url)
  }

  // YouTube video ID 추출 함수
  const getYouTubeVideoId = (url: string): string | null => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
    return videoId || null
  }

  // 연도 토글 함수
  const toggleYear = (year: string) => {
    const newExpandedYears = new Set(expandedYears)
    if (newExpandedYears.has(year)) {
      newExpandedYears.delete(year)
    } else {
      newExpandedYears.add(year)
    }
    setExpandedYears(newExpandedYears)
  }

  const fetchArtistData = async () => {
    setLoading(true)
    setCareersLoading(true)
    setCareers([])
    setError('')
    try {
      // 아티스트 정보 가져오기
      const { data: artistData, error: artistError } = await supabase
        .from('users')
        .select(ARTIST_PROFILE_COLUMNS)
        .eq('slug', slug)
        .single()

      if (artistError) {
        console.error('아티스트 정보 로드 오류:', artistError)
        setError('아티스트 정보를 불러올 수 없습니다.')
        setCareersLoading(false)
        setLoading(false)
        return
      }

      const canViewHiddenArtist = profile?.type === 'admin' || profile?.id === artistData.id
      if (isHiddenPublicArtist(artistData) && !canViewHiddenArtist) {
        setArtist(null)
        setCareers([])
        setError('아티스트 정보를 불러올 수 없습니다.')
        setCareersLoading(false)
        setLoading(false)
        return
      }

      setArtist(artistData)

      // 경력은 첫 화면에 필요한 일부만 먼저 가져오고, 전체 목록은 뒤에서 로드한다.
      const { data: careersData, error: careersError } = await supabase
        .from('career_entries')
        .select(CAREER_COLUMNS)
        .eq('user_id', artistData.id)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(INITIAL_CAREER_LIMIT)

      if (careersError) {
        console.error('경력 정보 로드 오류:', careersError)
        setCareers([])
      } else {
        setCareers(careersData || [])
      }

      setCareersLoading(false)
      setLoading(false)
      scheduleBackgroundCareerLoad(artistData.id)
    } catch (error) {
      console.error('데이터 로드 중 오류:', error)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
      setCareersLoading(false)
      setLoading(false)
    }
  }

  const scheduleBackgroundCareerLoad = (artistId: string) => {
    const loadCareers = () => fetchAllCareers(artistId)
    const requestIdleCallback = (window as any).requestIdleCallback

    window.setTimeout(() => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(loadCareers, { timeout: 1000 })
        return
      }

      loadCareers()
    }, 1200)
  }

  const fetchAllCareers = async (artistId: string) => {
    try {
      const { data, error } = await supabase
        .from('career_entries')
        .select(CAREER_COLUMNS)
        .eq('user_id', artistId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('전체 경력 정보 로드 오류:', error)
        return
      }

      setCareers(data || [])
    } catch (error) {
      console.error('전체 경력 정보 로드 중 오류:', error)
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





  const handleOpenVideoModal = (career: CareerEntry, careers: CareerEntry[]) => {
    const index = careers.findIndex(c => c.id === career.id)
    setVideoModalIndex(index >= 0 ? index : 0)
    setVideoModalCareers(careers)
    setVideoModalOpen(true)
  }

  const handleCloseVideoModal = () => {
    setVideoModalOpen(false)
    setVideoModalCareers([])
  }

  const handleVideoModalIndexChange = (index: number) => {
    setVideoModalIndex(index)
  }

  // 관리자 편집 핸들러들


  const handleEditMode = () => {
    if (!canEdit) return
    setIsEditMode(!isEditMode)
    if (!isEditMode) {
      toast.success('수정모드가 활성화되었습니다. 모든 편집 기능을 사용할 수 있습니다.')
    } else {
      toast.info('수정모드가 비활성화되었습니다.')
    }
  }

  const handleEditCareer = async (career: CareerEntry) => {
    if (!canEdit || !isEditMode) return
    setEditingCareer(career)
    setEditModalOpen(true)
  }

  const handleDeleteCareer = async (career: CareerEntry) => {
    if (!canEdit || !isEditMode) return
    
    if (confirm(`"${career.title}" 경력을 삭제하시겠습니까?`)) {
      try {
        const { error } = await supabase
          .from('career_entries')
          .delete()
          .eq('id', career.id)
        
          if (error) {
          toast.error('경력 삭제 중 오류가 발생했습니다.')
          console.error('경력 삭제 오류:', error)
          } else {
          toast.success('경력이 삭제되었습니다.')
          // 경력 목록 새로고침
          fetchArtistData()
      }
        } catch (error) {
        toast.error('경력 삭제 중 오류가 발생했습니다.')
        console.error('경력 삭제 오류:', error)
      }
    }
  }

  const handleAddCareerQuick = async () => {
    if (!canEdit || !isEditMode || !artist) return
    setEditingCareer(null)
    setEditModalOpen(true)
  }

  const handleAddCareerForCategory = async (category: string) => {
    if (!canEdit || !isEditMode || !artist) return
    setEditingCareer({
      id: '',
      user_id: artist.id,
      category,
      title: '',
      is_featured: false,
    } as CareerEntry)
    setEditModalOpen(true)
  }

  const handleAddFeaturedCareer = async () => {
    if (!canEdit || !isEditMode || !artist) return
    setEditingCareer({
      id: '',
      user_id: artist.id,
      category: 'choreography',
      title: '',
      is_featured: true,
    } as CareerEntry)
    setEditModalOpen(true)
  }

  // 연도별 그룹화된 경력
  const groupedCareers = useMemo(() => {
    const grouped: Record<string, Record<string, CareerEntry[]>> = {}
    
    careers.forEach(career => {
      const year = getCareerYear(career)
      if (!grouped[year]) {
        grouped[year] = {}
      }
      if (!grouped[year][career.category]) {
        grouped[year][career.category] = []
      }
      grouped[year][career.category].push(career)
    })
    
    return grouped
  }, [careers])

  // 대표작 경력
  const featuredCareers = useMemo(() => {
    return careers.filter(career => career.is_featured)
  }, [careers])

  // 최근 경력 (최근 5개)
  const recentCareers = useMemo(() => {
    return careers.slice(0, 5)
  }, [careers])



  if (loading) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-4">
                아티스트 정보 로딩 중...
              </h1>
              {retryCount > 0 && (
                <p className="text-sm text-gray-400">
                  로딩 중... (시도 {retryCount}/3) - 2초 후 페이지 새로고침
                </p>
              )}
            </div>
            <div className="animate-pulse">
              <div className="flex items-center space-x-6 mb-8">
                <div className="w-32 h-32 bg-black border border-white/20 rounded-full" />
                <div className="space-y-2">
                  <div className="h-8 bg-black border border-white/20 rounded w-48" />
                  <div className="h-4 bg-black border border-white/20 rounded w-32" />
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
        <main className="pt-16 min-h-screen bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">
                서버 연결 문제
              </h1>
              <p className="text-gray-400 mb-4">
                일시적인 서버 연결 문제로 인해 아티스트 정보를 불러올 수 없습니다.
              </p>
              <p className="text-sm text-gray-500 bg-gray-800 px-4 py-2 rounded-lg inline-block">
                📡 3회 시도 후 폴백 모드
              </p>
              <div className="mt-6">
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-black hover:bg-gray-900 text-white border border-white"
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
        <main className="pt-16 min-h-screen bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">
                {error || '아티스트를 찾을 수 없습니다'}
              </h1>
              <p className="text-gray-400">
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
      <main className="pt-16 min-h-screen bg-black">
        {/* TIDAL 스타일 Hero Section */}
        <ArtistHero 
          artist={artist}
          isAdmin={canEdit}
          isEditMode={isEditMode}
          onShare={() => toast.success('공유되었습니다!')}
          onPlay={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          onEditMode={() => handleEditMode()}
          onOpenPermissionManager={() => setPermissionModalOpen(true)}
          onUpdateArtist={async (updates) => {
            try {
              const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', artist.id)
              if (error) throw error
              setArtist(prev => prev ? { ...prev, ...updates } as User : prev)
              toast.success('저장되었습니다')
            } catch (e) {
              toast.error('저장 실패')
              console.error(e)
            }
          }}
          onUploadProfileImage={async (imageUrl) => {
            try {
              const { error } = await supabase
                .from('users')
                .update({ profile_image: imageUrl })
                .eq('id', artist.id)
              if (error) throw error
              setArtist(prev => prev ? { ...prev, profile_image: imageUrl } as User : prev)
              toast.success('프로필 이미지가 변경되었습니다')
            } catch (e) {
              toast.error('이미지 저장 실패')
              console.error(e)
            }
          }}
        />
        {isAdmin && isEditMode && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="bg-black/50 text-white border-white/30 hover:bg-black/70"
                onClick={() => setPermissionModalOpen(true)}
              >
                아티스트 수정 권한 관리
              </Button>
                </div>
            </div>
        )}

        {/* 메인 콘텐츠 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                  {/* 통계 섹션 제거됨 */}

                    {/* TOP HITS 섹션 (대표작) */}
            {featuredCareers.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white cursor-pointer hover:text-gray-300 transition-colors" onClick={() => {
                    const element = document.getElementById('all-careers')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}>
                    TOP HITS &gt;
                  </h2>
                </div>
                {canEdit && isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-black/50 text_white border-white/30 hover:bg-black/70"
                    onClick={handleAddFeaturedCareer}
                  >
                    추가
                  </Button>
                      )}
                    </div>
              
              <ContentCarousel 
                title=""
                items={featuredCareers}
                renderItem={(career) => (
                  <TidalCareerCard
                    career={career}
                    onCardClick={(career) => { if (!isEditMode) handleOpenVideoModal(career, featuredCareers) }}
                    onLike={(career) => toast.success(`${career.title}을 좋아합니다!`)}
                    isAdmin={canEdit}
                    isEditMode={isEditMode}
                    onEdit={(c) => handleEditCareer(c)}
                    onDelete={(c) => handleDeleteCareer(c)}
                  />
                )}
                showViewAll={false}
              />
            </div>
          )}

          {/* 최근 활동 섹션 → Latest Works(= LatestSongsSection)로 통합 */}
          <LatestSongsSection 
            careers={careers}
            onVideoOpen={(career) => { if (!isEditMode) handleOpenVideoModal(career, careers) }}
            isAdmin={canEdit}
            isEditMode={isEditMode}
            onEdit={(c) => handleEditCareer(c)}
            onDelete={(c) => handleDeleteCareer(c)}
            title="Latest Works"
            onAdd={() => handleAddCareerQuick()}
          />

          {/* 카테고리별 섹션들 */}
          {(() => {
            const categories = ['choreography', 'performance', 'advertisement', 'tv', 'workshop']
            const categoryLabels = {
              choreography: '안무',
              performance: '공연',
              advertisement: '광고',
              tv: '방송',
              workshop: '워크샵'
            }
            
            return categories.map(category => {
              const categoryCareers = careers.filter(career => career.category === category)
              if (categoryCareers.length === 0) return null
              
              return (
                <div key={category} className="mb-12">
                  <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                      <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white cursor-pointer hover:text-gray-300 transition-colors" onClick={() => {
                        const element = document.getElementById(`category-${category}`)
                        element?.scrollIntoView({ behavior: 'smooth' })
                      }}>
                        {categoryLabels[category as keyof typeof categoryLabels]} &gt;
                      </h2>
                </div>
                {canEdit && isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-black/50 text-white border-white/30 hover:bg-black/70"
                    onClick={() => handleAddCareerForCategory(category)}
                  >
                    추가
                  </Button>
                )}
              </div>
                  
                  <ContentCarousel 
                    title=""
                    items={categoryCareers}
                    renderItem={(career) => (
                      <TidalCareerCard
                    career={career}
                        onCardClick={(career) => { if (!isEditMode) handleOpenVideoModal(career, categoryCareers) }}
                        onLike={(career) => toast.success(`${career.title}을 좋아합니다!`)}
                        isAdmin={canEdit}
                        isEditMode={isEditMode}
                        onEdit={(c) => handleEditCareer(c)}
                        onDelete={(c) => handleDeleteCareer(c)}
                      />
                    )}
                    showViewAll={false}
                  />
              </div>
              )
            })
          })()}

          {/* 중복 제거: 아래 LatestSongsSection 삭제됨 (위로 통합) */}

          {/* 소개 섹션 */}
          <BiographySection artist={artist} />

          {/* 전체 경력 섹션 */}
          {(careers.length > 0 || careersLoading) && (
            <div id="all-careers" className="mb-12">
              <div className="bg-black/50 border border-white/20 rounded-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">전체 경력</h2>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-400">총 {careers.length}개의 경력</div>
                  {canEdit && isEditMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-black/50 text-white border-white/30 hover:bg-black/70"
                      onClick={() => handleAddCareerQuick()}
                    >
                      <Plus className="w-4 h-4 mr-1" /> 경력 추가
                    </Button>
                  )}
                </div>
              </div>
              


          {/* 연도별 경력 아코디언 */}
          {Object.keys(groupedCareers).length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedCareers).sort(([yearA], [yearB]) => {
                const yearANum = parseInt(yearA) || 0
                const yearBNum = parseInt(yearB) || 0
                return yearBNum - yearANum
              }).map(([year, yearGroup]) => (
                      <div key={year} className="border border-white/20 rounded-lg">
                  <button
                    onClick={() => toggleYear(year)}
                          className="w-full p-4 flex items-center justify-between hover:bg-black transition-colors text-left border border-white/20"
                  >
                    <div className="flex items-center space-x-3">
                            <h3 className="text-xl font-semibold text-white">
                        {year}년
                      </h3>
                                                                <Badge variant="outline" className="text-sm bg-black text-white border-white">
                        {Object.values(yearGroup).reduce((total, careers) => total + careers.length, 0)}개
                      </Badge>
                    </div>
                    {expandedYears.has(year) ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedYears.has(year) && (
                          <div className="p-4 space-y-4 bg-black/50">
                      {Object.entries(yearGroup).map(([category, careers]) => {
                        if (careers.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-3">
                            <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-white">
                                {getCategoryLabel(category)}
                              </h4>
                                                                  <Badge variant="outline" className="bg-black text-white border-white">
                                {careers.length}개
                              </Badge>
                              {canEdit && isEditMode && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-2 bg-black/50 text-white border-white/30 hover:bg-black/70 px-2 py-1 h-7"
                                  onClick={() => handleAddCareerForCategory(category)}
                                >
                                  추가
                                </Button>
                              )}
                            </div>
                            <div className="space-y-2">
                              {careers.map((career) => (
                                <div 
                                  key={career.id} 
                                  className="group p-4 border border-white/30 rounded-lg hover:border-white hover:bg-black transition-all cursor-pointer"
                                  onClick={() => { if (!isEditMode) handleOpenVideoModal(career, careers) }}
                                >
                                  <div className="flex items-start space-x-4">
                                    {/* 썸네일 */}
                                    <div className="flex-shrink-0 w-20 h-20 bg-gray-600 rounded-lg overflow-hidden">
                                      {career.video_url && isValidYouTubeUrl(career.video_url) ? (
                                        <img
                                          src={`https://img.youtube.com/vi/${getYouTubeVideoId(career.video_url)}/mqdefault.jpg`}
                                          alt={career.title}
                                          className="w-full h-full object-cover object-top"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Play className="w-6 h-6 text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* 내용 */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <Badge className="bg-black text-white border-white">
                                          {getCategoryLabel(category)}
                                        </Badge>
                                        <h5 className="font-medium text-sm truncate text-white">
                                          {career.title}
                                        </h5>
                                        {career.is_featured && (
                                          <Badge className="bg-black text-white text-xs border-white">
                                            <Star className="w-3 h-3 mr-1" />
                                            대표작
                                          </Badge>
                                        )}
                                      </div>
                                      {career.description && (
                                        <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                                          {career.description}
                                        </p>
                                      )}
                                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                                        {career.start_date && career.end_date && (
                                          <span className="flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {formatDate(career.start_date)} - {formatDate(career.end_date)}
                                          </span>
                                        )}
                                        {career.country && (
                                          <span className="flex items-center">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {career.country}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* 관리자/권한 사용자 편집 버튼들 (수정모드에서만 표시) */}
                                    {canEdit && isEditMode && (
                                      <div className="flex items-center space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="bg-black/50 hover:bg-black/70 text-white border-white/30 hover:border-white/50"
                                          onClick={() => handleEditCareer(career)}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="bg-red-900/50 hover:bg-red-900/70 text-red-300 border-red-500/30 hover:border-red-500/50"
                                          onClick={() => handleDeleteCareer(career)}
                                        >
                                          <Trash className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!careersLoading && careers.length === 0 && (
            <div className="text-center py-12">
                    <p className="text-gray-400 text-lg mb-4">
                등록된 경력이 없습니다.
              </p>
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* 영상 팝업 */}
      {videoModalOpen && (
        <CareerVideoModal
          careers={videoModalCareers}
          initialIndex={videoModalIndex}
          onClose={handleCloseVideoModal}
          onIndexChange={handleVideoModalIndexChange}
          isAdmin={isAdmin}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}
      {editModalOpen && (
        <CareerEditModal
          open={editModalOpen}
          career={editingCareer && editingCareer.id ? editingCareer : null}
          defaultCategory={editingCareer && !editingCareer.id ? editingCareer.category : undefined}
          defaultIsFeatured={editingCareer && !editingCareer.id ? !!editingCareer.is_featured : undefined}
          onClose={() => { setEditModalOpen(false); setEditingCareer(null) }}
          onSave={async (updates) => {
            try {
              if (editingCareer && editingCareer.id) {
                // update
                const { error } = await supabase
                  .from('career_entries')
                  .update(updates)
                  .eq('id', editingCareer.id)
                if (error) throw error
                toast.success('경력이 수정되었습니다')
              } else {
                // insert
                if (!artist) return
                const payload = { user_id: artist.id, ...updates }
                const { error } = await supabase
                  .from('career_entries')
                  .insert(payload)
                if (error) throw error
                toast.success('경력이 추가되었습니다')
              }
              setEditModalOpen(false)
              setEditingCareer(null)
              fetchArtistData()
            } catch (e) {
              toast.error('경력 저장 실패')
              console.error(e)
            }
          }}
        />
      )}
      {permissionModalOpen && (
        <PermissionManagerModal
          open={permissionModalOpen}
          artistId={artist.id}
          onClose={() => setPermissionModalOpen(false)}
        />
      )}

      {/* 수정모드 플로팅 완료 버튼 */}
      {canEdit && isEditMode && (
        <Button
          onClick={() => handleEditMode()}
          className="fixed bottom-6 right-6 z-50 bg-white text-black hover:bg-gray-100 border border-white px-5 py-3 rounded-full shadow-lg"
        >
          수정 완료
              </Button>
      )}
    </div>
  )
}
