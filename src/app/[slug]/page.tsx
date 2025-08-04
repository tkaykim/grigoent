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
import { ExternalLink, Instagram, Twitter, Youtube, MapPin, Calendar, X as CloseIcon, Plus, ChevronDown, ChevronRight, Filter, Play, Star, Edit, Trash } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProfileImageUpload } from '@/components/ui/profile-image-upload'
import { toast } from 'sonner'
import { useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { CareerVideoModal } from '@/components/artists/CareerVideoModal'

export default function ArtistDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [artist, setArtist] = useState<User | null>(null)
  const [careers, setCareers] = useState<CareerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [useFallback, setUseFallback] = useState(false)

  // 새로운 상태 변수들
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set())

  // 영상 팝업 상태
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [videoModalIndex, setVideoModalIndex] = useState(0)
  const [videoModalCareers, setVideoModalCareers] = useState<CareerEntry[]>([])

  // 필터링된 경력 상태
  const [filteredCareers, setFilteredCareers] = useState<CareerEntry[]>(careers)

  useEffect(() => {
    if (slug) {
      fetchArtistData()
    }
  }, [slug])

  // 경력 데이터가 변경될 때 필터링된 경력도 업데이트
  useEffect(() => {
    setFilteredCareers(careers)
  }, [careers])

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

  // 필터링된 경력 계산
  const filteredCareersMemo = useMemo(() => {
    let filtered = careers

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(career =>
        career.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (career.description && career.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // 카테고리 필터
    if (selectedCategory) {
      filtered = filtered.filter(career => career.category === selectedCategory)
    }

    // 연도 필터
    if (selectedYear) {
      filtered = filtered.filter(career => getCareerYear(career) === selectedYear)
    }

    return filtered
  }, [careers, searchQuery, selectedCategory, selectedYear])

  // 그룹화된 경력 계산 (대표작 우선 정렬)
  const groupedCareers = useMemo(() => {
    const grouped: { [year: string]: { [category: string]: CareerEntry[] } } = {}

    filteredCareersMemo.forEach(career => {
      const year = getCareerYear(career)
      const category = career.category || 'performance'

      if (!grouped[year]) {
        grouped[year] = {}
      }
      if (!grouped[year][category]) {
        grouped[year][category] = []
      }
      grouped[year][category].push(career)
    })

    // 각 카테고리 내에서 대표작을 맨 위로 정렬
    Object.keys(grouped).forEach(year => {
      Object.keys(grouped[year]).forEach(category => {
        grouped[year][category].sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1
          if (!a.is_featured && b.is_featured) return 1
          return 0
        })
      })
    })

    return grouped
  }, [filteredCareersMemo])

  // 사용 가능한 연도 목록
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    careers.forEach(career => {
      years.add(getCareerYear(career))
    })
    return Array.from(years).sort((a, b) => b.localeCompare(a)) // 최신 연도부터
  }, [careers])

  // 사용 가능한 카테고리 목록
  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    careers.forEach(career => {
      if (career.category) {
        categories.add(career.category)
      }
    })
    return Array.from(categories).sort()
  }, [careers])



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

  // 카테고리 색상 함수
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      choreography: 'bg-purple-100 text-purple-800',
      performance: 'bg-blue-100 text-blue-800',
      advertisement: 'bg-green-100 text-green-800',
      tv: 'bg-red-100 text-red-800',
      workshop: 'bg-orange-100 text-orange-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

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
  const handleImageUpload = async (imageUrl: string) => {
    setUploading(true);
    try {
      // Blob URL을 File로 변환
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      
      const fileExt = 'jpg';
      const fileName = `${artist?.id || 'profile'}-${Date.now()}.${fileExt}`;
      const filePath = fileName;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
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
  const [careerForm, setCareerForm] = useState<Partial<CareerEntry>>({
    title: '',
    description: '',
    category: '',
    country: '',
    video_url: '',
    poster_url: '',
    start_date: '',
    end_date: '',
    is_featured: false,
    date_type: 'range', // 'single' 또는 'range'
    single_date: '',
  });
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerDeleteLoading, setCareerDeleteLoading] = useState(false);

  // 대량 경력 등록 모달 상태
  const [bulkCareerModalOpen, setBulkCareerModalOpen] = useState(false);
  const [bulkCareerLoading, setBulkCareerLoading] = useState(false);
  const [csvData, setCsvData] = useState<string>('');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkError, setBulkError] = useState<string>('');

  // CSV 템플릿 다운로드
  const downloadCsvTemplate = () => {
    const csvContent = `제목,설명,카테고리,국가,일정유형,시작일,종료일,단일일자,영상URL,포스터URL,대표작
예시 안무,댄스 영상 제작,choreography,한국,range,2024-01-01,2024-01-31,,https://youtube.com/watch?v=example,https://example.com/poster.jpg,true
예시 공연,무대 공연,performance,미국,single,,,2024-02-01,https://youtube.com/watch?v=example2,https://example.com/poster2.jpg,false`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'career_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 카테고리 매핑 함수
  const mapCategoryToDbValue = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      '안무': 'choreography',
      '안무제작': 'choreography',
      'choreography': 'choreography',
      '공연': 'performance',
      '댄서참여': 'performance',
      'performance': 'performance',
      '광고': 'advertisement',
      '광고진행': 'advertisement',
      'advertisement': 'advertisement',
      '방송': 'tv',
      'TV프로그램': 'tv',
      'tv': 'tv',
      '워크샵': 'workshop',
      'workshop': 'workshop',
      '뮤직비디오': 'performance', // 뮤직비디오는 performance로 매핑
      'MV': 'performance',
      '음악방송': 'tv',
      '예능': 'tv'
    };
    
    return categoryMap[category] || 'performance'; // 기본값은 performance
  };

  // CSV 데이터 파싱
  const parseCsvData = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }
    
    return data;
  };

  // 대량 등록 미리보기
  const handleBulkPreview = () => {
    if (!csvData.trim()) return;
    
    setBulkCareerLoading(true);
    try {
      const parsedData = parseCsvData(csvData);
      setBulkPreview(parsedData);
      setBulkError('');
    } catch (error) {
      setBulkError('CSV 파싱 오류: ' + error);
    } finally {
      setBulkCareerLoading(false);
    }
  };

  // 대량 경력 등록
  const handleBulkCareerSave = async () => {
    if (!artist || bulkPreview.length === 0) return;
    
    setBulkCareerLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const item of bulkPreview) {
        try {
          const careerData: any = {
            title: item['제목'],
            description: item['설명'],
            category: mapCategoryToDbValue(item['카테고리']),
            country: item['국가'],
            video_url: item['영상URL'],
            poster_url: item['포스터URL'],
            is_featured: item['대표작'] === 'true',
            user_id: artist.id
          };
          
          // 일정 유형에 따른 처리
          if (item['일정유형'] === 'single') {
            careerData.date_type = 'single';
            careerData.single_date = item['단일일자'];
            careerData.start_date = null;
            careerData.end_date = null;
          } else {
            careerData.date_type = 'range';
            careerData.start_date = item['시작일'];
            careerData.end_date = item['종료일'];
            careerData.single_date = null;
          }
          
          console.log('저장할 경력 데이터:', careerData);
          
          const { error } = await supabase.from('career_entries').insert(careerData);
          if (error) {
            console.error('Supabase 오류:', error);
            throw error;
          }
          successCount++;
        } catch (error) {
          console.error('경력 등록 실패:', item, error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount}개의 경력이 성공적으로 등록되었습니다.`);
        if (errorCount > 0) {
          toast.error(`${errorCount}개의 경력 등록에 실패했습니다.`);
        }
        setBulkCareerModalOpen(false);
        setCsvData('');
        setBulkPreview([]);
        fetchArtistData();
      } else {
        toast.error('모든 경력 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('대량 등록 오류:', error);
      toast.error('대량 등록 중 오류가 발생했습니다.');
    } finally {
      setBulkCareerLoading(false);
    }
  };

  // 경력 폼 초기화
  const openCareerModal = (career?: CareerEntry) => {
    if (career) {
      setEditingCareer(career);
      // 기존 경력의 경우 date_type과 single_date 설정
      const dateType = career.date_type || (career.end_date ? 'range' : 'single');
      const singleDate = career.single_date || career.start_date || '';
      setCareerForm({ 
        ...career, 
        date_type: dateType,
        single_date: singleDate
      });
    } else {
      setEditingCareer(null);
      setCareerForm({
        title: '', description: '', category: '', country: '', video_url: '', poster_url: '', 
        start_date: '', end_date: '', is_featured: false, date_type: 'range', single_date: ''
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
      // DB 스키마에 맞게 데이터 준비
      const careerData = { ...careerForm };
      
      // 카테고리 매핑 적용
      careerData.category = mapCategoryToDbValue(careerData.category);
      
      if (careerData.date_type === 'single') {
        // 단일 일정인 경우
        careerData.single_date = careerData.single_date || careerData.start_date;
        careerData.start_date = null;
        careerData.end_date = null;
      } else {
        // 기간인 경우
        careerData.single_date = null;
      }
      
      // date_type은 DB에 저장해야 하므로 삭제하지 않음

      console.log('저장할 경력 데이터:', careerData);

      if (editingCareer) {
        // 수정
        const { error } = await supabase.from('career_entries').update(careerData).eq('id', editingCareer.id);
        if (error) {
          console.error('경력 수정 오류:', error);
          throw error;
        }
        toast.success('경력이 수정되었습니다.');
      } else {
        // 추가
        const { error } = await supabase.from('career_entries').insert({ ...careerData, user_id: artist.id });
        if (error) {
          console.error('경력 추가 오류:', error);
          throw error;
        }
        toast.success('경력이 추가되었습니다.');
      }
      
      setCareerModalOpen(false);
      fetchArtistData();
    } catch (error) {
      console.error('경력 저장 오류:', error);
      toast.error('경력 저장에 실패했습니다.');
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

  // 영상 팝업 열기
  const handleOpenVideoModal = (career: CareerEntry, careers: CareerEntry[]) => {
    const index = careers.findIndex(c => c.id === career.id)
    setVideoModalCareers(careers)
    setVideoModalIndex(index)
    setVideoModalOpen(true)
  }

  // 영상 팝업 닫기
  const handleCloseVideoModal = () => {
    setVideoModalOpen(false)
  }

  // 영상 팝업 인덱스 변경
  const handleVideoModalIndexChange = (index: number) => {
    setVideoModalIndex(index)
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
          {/* 프로필 헤더 - 배경 이미지가 꽉 찬 디자인 */}
          <div className="relative h-[60vh] min-h-[400px] rounded-lg overflow-hidden mb-8">
            {/* 배경 이미지 */}
            <div className="absolute inset-0">
              {artist.profile_image ? (
                <img
                  src={artist.profile_image}
                  alt={artist.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    console.error('프로필 이미지 로드 실패:', e)
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <span className="text-white text-6xl font-bold opacity-20">
                    {artist.name.charAt(0)}
                  </span>
                </div>
              )}
              {/* 오버레이 */}
              <div className="absolute inset-0 bg-black/40"></div>
            </div>
            
            {/* 콘텐츠 오버레이 */}
            <div className="relative z-10 h-full flex flex-col justify-between p-8">
              {/* 상단 정보 */}
              <div className="flex items-start justify-between">
                <div className="text-white">
                  <h1 className="text-4xl md:text-5xl font-bold mb-2">
                    {artist.name}
                  </h1>
                  <p className="text-xl md:text-2xl text-zinc-200 mb-4">
                    {artist.name_en}
                  </p>
                  
                  {artist.introduction && (
                    <p className="text-lg text-zinc-300 max-w-2xl leading-relaxed">
                      {artist.introduction}
                    </p>
                  )}
                </div>
                
                {/* 우측 버튼들 */}
                <div className="flex flex-col gap-2">
                  <ProposalButton
                    dancerId={artist.id}
                    dancerName={artist.name}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  />
                  
                  
                </div>
              </div>
              
              {/* 하단 정보 */}
              <div className="flex items-center justify-between text-white/90">
                <div className="flex items-center gap-6">
                  {/* SNS 링크 */}
                  {(artist.instagram_url || artist.twitter_url || artist.youtube_url) && (
                    <div className="flex space-x-4">
                      {artist.instagram_url && (
                        <a
                          href={artist.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                        >
                          <Instagram className="w-5 h-5" />
                        </a>
                      )}
                      {artist.twitter_url && (
                        <a
                          href={artist.twitter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                        >
                          <Twitter className="w-5 h-5" />
                        </a>
                      )}
                      {artist.youtube_url && (
                        <a
                          href={artist.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                        >
                          <Youtube className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  )}
                  
                  {artist.phone && (
                    <div className="text-lg">
                      연락처: {artist.phone}
                    </div>
                  )}
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
                  <ProfileImageUpload
                    currentImage={editForm.profile_image}
                    onImageChange={handleImageUpload}
                    onImageRemove={removeImage}
                    size="sm"
                    cropShape="square"
                    disabled={editLoading}
                    uploading={uploading}
                  />
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
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openCareerModal()}><Plus className="w-4 h-4 mr-1" /> 경력 추가</Button>
                    <Button size="sm" variant="outline" onClick={() => setBulkCareerModalOpen(true)}>대량 등록</Button>
                  </div>
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
                    onCardClick={(career) => handleOpenVideoModal(career, featuredCareers)}
                  />
                ))}
              </Carousel>
            </div>
          )}

          {/* 경력 검색 */}
          {careers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-zinc-900">경력 검색</h2>
                <div className="text-sm text-zinc-600">
                  총 {filteredCareersMemo.length}개의 경력
                  {filteredCareersMemo.length !== careers.length && (
                    <span className="text-blue-600 ml-2">
                      (전체 {careers.length}개 중)
                    </span>
                  )}
                </div>
              </div>
              
              {/* 검색 및 필터 */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="제목이나 설명으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-zinc-300 rounded-md text-sm"
                  >
                    <option value="">모든 카테고리</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>
                        {getCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-zinc-300 rounded-md text-sm"
                  >
                    <option value="">모든 연도</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 연도별 경력 아코디언 */}
          {Object.keys(groupedCareers).length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-zinc-900">연도별 경력</h2>
                <div className="text-sm text-zinc-600">
                  총 {filteredCareersMemo.length}개의 경력
                  {filteredCareersMemo.length !== careers.length && (
                    <span className="text-blue-600 ml-2">
                      (전체 {careers.length}개 중)
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openCareerModal()}><Plus className="w-4 h-4 mr-1" /> 경력 추가</Button>
                    <Button size="sm" variant="outline" onClick={() => setBulkCareerModalOpen(true)}>대량 등록</Button>
                  </div>
                )}
              </div>
              
              {Object.entries(groupedCareers).sort(([yearA], [yearB]) => {
                // 숫자로 변환하여 비교 (최신 연도가 위로)
                const yearANum = parseInt(yearA) || 0
                const yearBNum = parseInt(yearB) || 0
                return yearBNum - yearANum
              }).map(([year, yearGroup]) => (
                <div key={year} className="border border-zinc-200 rounded-lg">
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-semibold text-zinc-900">
                        {year}년
                      </h3>
                      <Badge variant="outline" className="text-sm">
                        {Object.values(yearGroup).reduce((total, careers) => total + careers.length, 0)}개
                      </Badge>
                    </div>
                    {expandedYears.has(year) ? (
                      <ChevronDown className="w-5 h-5 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-zinc-500" />
                    )}
                  </button>
                  
                  {expandedYears.has(year) && (
                    <div className="p-4 space-y-4">
                      {Object.entries(yearGroup).map(([category, careers]) => {
                        if (careers.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-zinc-900">
                                {getCategoryLabel(category)}
                              </h4>
                              <Badge variant="outline" className={getCategoryColor(category)}>
                                {careers.length}개
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {careers.map((career) => (
                                <div 
                                  key={career.id} 
                                  className="group p-4 border border-zinc-200 rounded-lg hover:border-zinc-300 hover:bg-zinc-50 transition-all cursor-pointer"
                                  onClick={() => handleOpenVideoModal(career, careers)}
                                >
                                  <div className="flex items-start space-x-4">
                                    {/* 썸네일 */}
                                    <div className="flex-shrink-0 w-20 h-20 bg-zinc-100 rounded-lg overflow-hidden">
                                      {career.video_url && isValidYouTubeUrl(career.video_url) ? (
                                        <img
                                          src={`https://img.youtube.com/vi/${getYouTubeVideoId(career.video_url)}/mqdefault.jpg`}
                                          alt={career.title}
                                          className="w-full h-full object-cover object-top"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Play className="w-6 h-6 text-zinc-400" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* 내용 */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <Badge className={getCategoryColor(category)}>
                                          {getCategoryLabel(category)}
                                        </Badge>
                                        <h5 className="font-medium text-sm truncate">
                                          {career.title}
                                        </h5>
                                        {career.is_featured && (
                                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                            <Star className="w-3 h-3 mr-1" />
                                            대표작
                                          </Badge>
                                        )}
                                      </div>
                                      {career.description && (
                                        <p className="text-xs text-zinc-600 line-clamp-2 mb-2">
                                          {career.description}
                                        </p>
                                      )}
                                      <div className="flex items-center space-x-2 text-xs text-zinc-500">
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
                                    
                                    {/* 관리자 액션 버튼 */}
                                    {isAdmin && (
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openCareerModal(career);
                                          }}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCareerDelete(career);
                                          }}
                                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                        >
                                          <Trash className="w-3 h-3" />
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

          {filteredCareersMemo.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-600 text-lg mb-4">
                {careers.length === 0 ? '등록된 경력이 없습니다.' : '검색 결과가 없습니다.'}
              </p>
              {isAdmin && careers.length === 0 && (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => openCareerModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    경력 추가
                  </Button>
                  <Button variant="outline" onClick={() => setBulkCareerModalOpen(true)}>
                    대량 등록
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* 경력 추가/수정 모달 */}
      {careerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw] w-full sm:w-[500px]">
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
              
              {/* 일정 유형 선택 */}
              <Label>일정 유형</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="date_type"
                    value="single"
                    checked={careerForm.date_type === 'single'}
                    onChange={e => setCareerForm(f => ({ ...f, date_type: e.target.value }))}
                  />
                  <span>단일 일정</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="date_type"
                    value="range"
                    checked={careerForm.date_type === 'range'}
                    onChange={e => setCareerForm(f => ({ ...f, date_type: e.target.value }))}
                  />
                  <span>기간</span>
                </label>
              </div>
              
              {/* 단일 일정인 경우 */}
              {careerForm.date_type === 'single' && (
                <>
                  <Label>단일 일자</Label>
                  <Input 
                    type="date" 
                    value={careerForm.single_date || ''} 
                    onChange={e => setCareerForm(f => ({ ...f, single_date: e.target.value }))} 
                  />
                </>
              )}

              {/* 기간인 경우에만 시작일/종료일 표시 */}
              {careerForm.date_type === 'range' && (
                <>
                  <Label>시작일</Label>
                  <Input 
                    type="date" 
                    value={careerForm.start_date || ''} 
                    onChange={e => setCareerForm(f => ({ ...f, start_date: e.target.value }))} 
                  />
                  
                  <Label>종료일</Label>
                  <Input 
                    type="date" 
                    value={careerForm.end_date || ''} 
                    onChange={e => setCareerForm(f => ({ ...f, end_date: e.target.value }))} 
                  />
                </>
              )}
              
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

      {/* 대량 경력 등록 모달 */}
      {bulkCareerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw] w-full sm:w-[600px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">대량 경력 등록</h2>
            <div className="space-y-3">
              <Label>CSV 파일 업로드</Label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setCsvData(event.target.result as string);
                      }
                    };
                    reader.readAsText(e.target.files[0]);
                  }
                }}
                className="block w-full text-sm text-zinc-900 border border-zinc-300 rounded-lg cursor-pointer bg-zinc-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-200 file:text-zinc-700 hover:file:bg-zinc-300"
              />
              <Button variant="outline" onClick={downloadCsvTemplate} className="w-full">CSV 템플릿 다운로드</Button>
              <Label>또는 직접 입력</Label>
              <Textarea
                value={csvData}
                onChange={e => setCsvData(e.target.value)}
                placeholder="CSV 데이터를 여기에 입력하세요 (템플릿 참고)"
                rows={8}
              />
              {bulkError && (
                <p className="text-red-500 text-sm mt-2">{bulkError}</p>
              )}
              
              {/* 미리보기 결과 */}
              {bulkPreview.length > 0 && (
                <div className="mt-4">
                  <Label>미리보기 ({bulkPreview.length}개)</Label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 bg-zinc-50">
                    {bulkPreview.map((item, index) => (
                      <div key={index} className="text-sm p-2 border-b last:border-b-0">
                        <strong>{item['제목']}</strong> - {item['카테고리']} ({item['국가']})
                        {item['대표작'] === 'true' && <span className="text-blue-600 ml-2">★ 대표작</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => {
                setBulkCareerModalOpen(false);
                setCsvData('');
                setBulkPreview([]);
                setBulkError('');
              }}>취소</Button>
              <Button variant="outline" onClick={handleBulkPreview} disabled={!csvData.trim() || bulkCareerLoading}>
                {bulkCareerLoading ? '미리보기 중...' : '미리보기'}
              </Button>
              <Button variant="default" onClick={handleBulkCareerSave} disabled={bulkPreview.length === 0 || bulkCareerLoading}>
                {bulkCareerLoading ? '등록 중...' : '대량 등록'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 영상 팝업 */}
      {videoModalOpen && (
        <CareerVideoModal
          careers={videoModalCareers}
          initialIndex={videoModalIndex}
          onClose={handleCloseVideoModal}
          onIndexChange={handleVideoModalIndexChange}
          isAdmin={isAdmin}
          onEdit={openCareerModal}
          onDelete={handleCareerDelete}
        />
      )}
    </div>
  )
} 