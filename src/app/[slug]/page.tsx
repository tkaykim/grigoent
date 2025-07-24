'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { ExternalLink, Instagram, Twitter, Youtube, MapPin, Calendar, Upload, X as CloseIcon, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

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

  // 관리자 권한 체크
  const { profile, loading: loadingProfile } = useAuth();
  const isAdmin = profile?.type === 'admin';

  // 프로필 수정 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    profile_image: '',
    name: '',
    name_en: '',
    introduction: '',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    phone: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [softDeleteLoading, setSoftDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSoftDeleteModal, setShowSoftDeleteModal] = useState(false);

  // 아티스트 정보가 바뀌면 폼에 반영
  useEffect(() => {
    if (artist) {
      setEditForm({
        profile_image: artist.profile_image || '',
        name: artist.name || '',
        name_en: artist.name_en || '',
        introduction: artist.introduction || '',
        instagram_url: artist.instagram_url || '',
        twitter_url: artist.twitter_url || '',
        youtube_url: artist.youtube_url || '',
        phone: artist.phone || '',
      });
    }
  }, [artist]);

  // 프로필 수정
  const handleEditProfile = async () => {
    if (!artist) return;
    setEditLoading(true);
    try {
      const { error } = await supabase.from('users').update(editForm).eq('id', artist.id);
      if (error) throw error;
      toast.success('프로필이 수정되었습니다.');
      setEditModalOpen(false);
      fetchArtistData();
    } catch (e) {
      const err = e as any;
      toast.error('수정 실패: ' + (err.message || err));
    } finally {
      setEditLoading(false);
    }
  };

  // soft delete (숨기기)
  const handleSoftDelete = async () => {
    if (!artist) return;
    setSoftDeleteLoading(true);
    try {
      const { error } = await supabase.from('users').update({ type: 'general' }).eq('id', artist.id);
      if (error) throw error;
      toast.success('계정이 숨김 처리되었습니다.');
      setShowSoftDeleteModal(false);
      fetchArtistData();
    } catch (e) {
      const err = e as any;
      toast.error('숨기기 실패: ' + (err.message || err));
    } finally {
      setSoftDeleteLoading(false);
    }
  };

  // 복원
  const handleRestore = async () => {
    if (!artist) return;
    setSoftDeleteLoading(true);
    try {
      const { error } = await supabase.from('users').update({ type: 'dancer' }).eq('id', artist.id);
      if (error) throw error;
      toast.success('계정이 복원되었습니다.');
      fetchArtistData();
    } catch (e) {
      const err = e as any;
      toast.error('복원 실패: ' + (err.message || err));
    } finally {
      setSoftDeleteLoading(false);
    }
  };

  // 완전 삭제
  const handleDelete = async () => {
    if (!artist) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', artist.id);
      if (error) throw error;
      toast.success('계정이 완전히 삭제되었습니다.');
      setShowDeleteModal(false);
      window.location.href = '/artists';
    } catch (e) {
      const err = e as any;
      toast.error('삭제 실패: ' + (err.message || err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${artist?.id || 'profile'}-${Date.now()}.${fileExt}`;
      const filePath = fileName;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      setEditForm(prev => ({ ...prev, profile_image: publicUrl }));
      toast.success('이미지가 성공적으로 업로드되었습니다.');
    } catch (error) {
      const err = error as any;
      toast.error('이미지 업로드 실패: ' + (err.message || err));
    } finally {
      setUploading(false);
    }
  };
  const removeImage = () => {
    setEditForm(prev => ({ ...prev, profile_image: '' }));
  };

  // 경력 추가/수정 모달 상태
  const [careerModalOpen, setCareerModalOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<CareerEntry | null>(null);
  const [careerForm, setCareerForm] = useState<any>({
    title: '',
    description: '',
    category: '',
    country: '',
    video_url: '',
    poster_url: '',
    start_date: '',
    end_date: '',
    is_featured: false,
  });
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerDeleteLoading, setCareerDeleteLoading] = useState(false);

  // 경력 폼 초기화
  const openCareerModal = (career?: CareerEntry) => {
    if (career) {
      setEditingCareer(career);
      setCareerForm({ ...career });
    } else {
      setEditingCareer(null);
      setCareerForm({
        title: '', description: '', category: '', country: '', video_url: '', poster_url: '', start_date: '', end_date: '', is_featured: false,
      });
    }
    setCareerModalOpen(true);
  };
  const closeCareerModal = () => {
    setCareerModalOpen(false);
    setEditingCareer(null);
  };

  // 경력 추가/수정
  const handleCareerSave = async () => {
    if (!artist) return;
    setCareerLoading(true);
    try {
      if (editingCareer) {
        // 수정
        const { error } = await supabase.from('career_entries').update(careerForm).eq('id', editingCareer.id);
        if (error) throw error;
        toast.success('경력이 수정되었습니다.');
      } else {
        // 추가
        const { error } = await supabase.from('career_entries').insert({ ...careerForm, user_id: artist.id });
        if (error) throw error;
        toast.success('경력이 추가되었습니다.');
      }
      closeCareerModal();
      fetchArtistData();
    } catch (e) {
      const err = e as any;
      toast.error('저장 실패: ' + (err.message || err));
    } finally {
      setCareerLoading(false);
    }
  };

  // 경력 삭제
  const handleCareerDelete = async (career: CareerEntry) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;
    setCareerDeleteLoading(true);
    try {
      const { error } = await supabase.from('career_entries').delete().eq('id', career.id);
      if (error) throw error;
      toast.success('경력이 삭제되었습니다.');
      fetchArtistData();
    } catch (e) {
      const err = e as any;
      toast.error('삭제 실패: ' + (err.message || err));
    } finally {
      setCareerDeleteLoading(false);
    }
  };

  // 카테고리 옵션
  const careerCategories = useMemo(() => [
    { value: 'choreography', label: '안무' },
    { value: 'performance', label: '공연' },
    { value: 'advertisement', label: '광고' },
    { value: 'tv', label: '방송' },
    { value: 'workshop', label: '워크샵' },
  ], []);

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

          {/* 관리자만 보이는 프로필 관리 버튼 */}
          {isAdmin && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant="outline" onClick={() => setEditModalOpen(true)}>프로필 수정</Button>
              {artist?.type === 'dancer' ? (
                <Button variant="destructive" onClick={() => setShowSoftDeleteModal(true)}>숨기기(soft delete)</Button>
              ) : (
                <Button variant="default" onClick={handleRestore}>복원</Button>
              )}
              <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>완전 삭제</Button>
            </div>
          )}

          {/* 프로필 수정 모달 */}
          {editModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw] w-full sm:w-[400px]">
                <h2 className="text-xl font-bold mb-4">프로필 수정</h2>
                <div className="space-y-3">
                  <Label>프로필 이미지</Label>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="relative">
                      {editForm.profile_image ? (
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                          <img
                            src={editForm.profile_image}
                            alt={editForm.name}
                            className="w-full h-full object-cover object-center"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                          <span className="text-2xl text-gray-400 font-semibold">?</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? '업로드 중...' : '이미지 선택'}
                    </Button>
                    {editForm.profile_image && (
                      <Button type="button" variant="outline" size="sm" onClick={removeImage}>
                        <CloseIcon className="w-4 h-4 mr-2" />
                        이미지 제거
                      </Button>
                    )}
                  </div>
                  <Label>프로필 이미지 URL</Label>
                  <Input value={editForm.profile_image} onChange={e => setEditForm(f => ({ ...f, profile_image: e.target.value }))} placeholder="프로필 이미지 URL" />
                  <Label>이름</Label>
                  <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="이름" />
                  <Label>영문 이름</Label>
                  <Input value={editForm.name_en} onChange={e => setEditForm(f => ({ ...f, name_en: e.target.value }))} placeholder="영문 이름" />
                  <Label>소개</Label>
                  <Input value={editForm.introduction} onChange={e => setEditForm(f => ({ ...f, introduction: e.target.value }))} placeholder="소개" />
                  <Label>Instagram</Label>
                  <Input value={editForm.instagram_url} onChange={e => setEditForm(f => ({ ...f, instagram_url: e.target.value }))} placeholder="Instagram URL" />
                  <Label>Twitter</Label>
                  <Input value={editForm.twitter_url} onChange={e => setEditForm(f => ({ ...f, twitter_url: e.target.value }))} placeholder="Twitter URL" />
                  <Label>YouTube</Label>
                  <Input value={editForm.youtube_url} onChange={e => setEditForm(f => ({ ...f, youtube_url: e.target.value }))} placeholder="YouTube URL" />
                  <Label>연락처</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="연락처" />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setEditModalOpen(false)}>닫기</Button>
                  <Button variant="default" onClick={handleEditProfile} disabled={editLoading}>
                    {editLoading ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* soft delete(숨기기) 모달 */}
          {showSoftDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw] w-full sm:w-[400px]">
                <h2 className="text-xl font-bold mb-4">정말로 숨기시겠습니까?</h2>
                <p className="mb-4 text-zinc-700">이 댄서 계정은 일반회원으로 전환되어 사이트에 노출되지 않습니다.<br/>복원은 언제든 가능합니다.</p>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowSoftDeleteModal(false)}>취소</Button>
                  <Button variant="destructive" onClick={handleSoftDelete} disabled={softDeleteLoading}>
                    {softDeleteLoading ? '숨기는 중...' : '숨기기'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 완전 삭제 모달 */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw] w-full sm:w-[400px]">
                <h2 className="text-xl font-bold mb-4">정말로 완전 삭제하시겠습니까?</h2>
                <p className="mb-4 text-zinc-700">이 댄서 계정은 복구할 수 없습니다.<br/>경력 등 모든 데이터가 삭제됩니다.</p>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowDeleteModal(false)}>취소</Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                    {deleteLoading ? '삭제 중...' : '완전 삭제'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 대표작 */}
          {featuredCareers.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-zinc-900">대표작</h2>
                <div className="text-sm text-zinc-600">
                  {featuredCareers.length}개의 대표작
                </div>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => openCareerModal()}><Plus className="w-4 h-4 mr-1" /> 경력 추가</Button>
                )}
              </div>
              <Carousel className="mb-8">
                {featuredCareers.map((career) => (
                  <CareerCard
                    key={career.id}
                    career={career}
                    showDetails={false}
                    isAdmin={isAdmin}
                    onEdit={openCareerModal}
                    onDelete={handleCareerDelete}
                    disableActions={careerDeleteLoading}
                  />
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
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => openCareerModal()}><Plus className="w-4 h-4 mr-1" /> 경력 추가</Button>
                )}
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
                      <CareerCard
                        key={career.id}
                        career={career}
                        isAdmin={isAdmin}
                        onEdit={openCareerModal}
                        onDelete={handleCareerDelete}
                        disableActions={careerDeleteLoading}
                      />
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

      {/* 경력 추가/수정 모달 */}
      {careerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw] w-full sm:w-[400px]">
            <h2 className="text-xl font-bold mb-4">{editingCareer ? '경력 수정' : '경력 추가'}</h2>
            <div className="space-y-3">
              <Label>제목</Label>
              <Input value={careerForm.title} onChange={e => setCareerForm(f => ({ ...f, title: e.target.value }))} placeholder="제목" />
              <Label>설명</Label>
              <Textarea value={careerForm.description} onChange={e => setCareerForm(f => ({ ...f, description: e.target.value }))} placeholder="설명" />
              <Label>카테고리</Label>
              <select className="w-full border rounded p-2" value={careerForm.category} onChange={e => setCareerForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">카테고리 선택</option>
                {careerCategories.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <Label>국가</Label>
              <Input value={careerForm.country} onChange={e => setCareerForm(f => ({ ...f, country: e.target.value }))} placeholder="국가" />
              <Label>시작일</Label>
              <Input type="date" value={careerForm.start_date || ''} onChange={e => setCareerForm(f => ({ ...f, start_date: e.target.value }))} />
              <Label>종료일</Label>
              <Input type="date" value={careerForm.end_date || ''} onChange={e => setCareerForm(f => ({ ...f, end_date: e.target.value }))} />
              <Label>영상 URL</Label>
              <Input value={careerForm.video_url} onChange={e => setCareerForm(f => ({ ...f, video_url: e.target.value }))} placeholder="YouTube 등" />
              <Label>포스터 이미지 URL</Label>
              <Input value={careerForm.poster_url} onChange={e => setCareerForm(f => ({ ...f, poster_url: e.target.value }))} placeholder="포스터 이미지 URL" />
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="is_featured" checked={!!careerForm.is_featured} onChange={e => setCareerForm(f => ({ ...f, is_featured: e.target.checked }))} />
                <Label htmlFor="is_featured">대표작</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={closeCareerModal}>취소</Button>
              <Button variant="default" onClick={handleCareerSave} disabled={careerLoading}>{careerLoading ? '저장 중...' : '저장'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 