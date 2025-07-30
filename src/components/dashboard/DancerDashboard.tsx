'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Edit, 
  Plus, 
  Star, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Trash2,
  X as CloseIcon,
  Upload,
  FileText,
  Trash,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Play
} from 'lucide-react'
import { Tabs as UITabs, TabsList as UITabsList, TabsTrigger as UITabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DancerDashboardProps {
  profile: any
}

interface CareerEntry {
  id: string;
  user_id: string;
  linked_user_id?: string;
  category: string;
  title: string;
  description?: string;
  country?: string;
  video_url?: string;
  poster_url?: string;
  start_date?: string;
  end_date?: string;
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
  date_type?: 'single' | 'range';
  single_date?: string;
  is_linked?: boolean;
}

interface YearGroup {
  year: number;
  categories: {
    choreography: CareerEntry[];
    performance: CareerEntry[];
    advertisement: CareerEntry[];
    tv: CareerEntry[];
    workshop: CareerEntry[];
  };
}

export function DancerDashboard({ profile }: DancerDashboardProps) {
  const [careers, setCareers] = useState<CareerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [bulkData, setBulkData] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [selectedCareer, setSelectedCareer] = useState<CareerEntry | null>(null);
  const [showCareerModal, setShowCareerModal] = useState(false);
  const [isAddingCareer, setIsAddingCareer] = useState(false);
  const [isBulkUpload, setIsBulkUpload] = useState(false);
  const [editingCareer, setEditingCareer] = useState<CareerEntry | null>(null);
  
  // 새로운 상태들
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    country: 'Korea',
    video_url: '',
    poster_url: '',
    start_date: '',
    end_date: '',
    is_featured: false,
    date_type: 'range' as 'single' | 'range',
    single_date: ''
  })

  useEffect(() => {
    if (profile) {
      fetchCareers()
    }
  }, [profile])

  // 경력의 연도 추출
  const getCareerYear = (career: CareerEntry): number => {
    if (career.date_type === 'single' && career.single_date) {
      return new Date(career.single_date).getFullYear();
    }
    if (career.start_date) {
      return new Date(career.start_date).getFullYear();
    }
    if (career.created_at) {
      return new Date(career.created_at).getFullYear();
    }
    return new Date().getFullYear();
  };

  // 경력 데이터를 연도별, 카테고리별로 그룹화
  const groupedCareers = useMemo(() => {
    const filteredCareers = careers.filter(career => {
      const matchesSearch = career.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (career.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || career.category === selectedCategory;
      const matchesYear = selectedYear === 'all' || getCareerYear(career) === parseInt(selectedYear);
      
      return matchesSearch && matchesCategory && matchesYear;
    });

    const yearGroups: { [key: number]: YearGroup } = {};
    
    filteredCareers.forEach(career => {
      const year = getCareerYear(career);
      if (!yearGroups[year]) {
        yearGroups[year] = {
          year,
          categories: {
            choreography: [],
            performance: [],
            advertisement: [],
            tv: [],
            workshop: []
          }
        };
      }
      const categoryKey = career.category as 'choreography' | 'performance' | 'advertisement' | 'tv' | 'workshop';
      yearGroups[year].categories[categoryKey].push(career);
    });

    // 연도별로 정렬 (최신 연도가 위로)
    return Object.values(yearGroups).sort((a, b) => b.year - a.year);
  }, [careers, searchQuery, selectedCategory, selectedYear]);

  // 사용 가능한 연도 목록
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    careers.forEach(career => {
      years.add(getCareerYear(career));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [careers]);

  // 사용 가능한 카테고리 목록
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    careers.forEach(career => {
      categories.add(career.category);
    });
    return Array.from(categories);
  }, [careers]);

  // 연도 토글
  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const fetchCareers = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/careers?userId=${profile.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setCareers(data.careers || [])
        console.log('Careers fetched:', {
          total: data.total,
          owned: data.owned,
          linked: data.linked
        })
      } else {
        console.error('Failed to fetch careers:', data.error)
        setMessage('경력 데이터를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Career fetch error:', error)
      setMessage('경력 데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // YouTube URL 유효성 검사 함수
  const isValidYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    return youtubeRegex.test(url)
  }

  // YouTube 썸네일 URL 생성 함수
  const getThumbnailFromUrl = (url: string): string => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }
    return ''
  }

  // YouTube URL에서 video ID 추출
  const getYouTubeVideoId = (url: string): string | null => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
    return videoId || null
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'video_url' && typeof value === 'string' && value.trim()) {
      if (isValidYouTubeUrl(value)) {
        const thumbnailUrl = getThumbnailFromUrl(value)
        setFormData(prev => ({ ...prev, poster_url: thumbnailUrl }))
      }
    }
    if (field === 'date_type') {
      if (value === 'single') {
        setFormData(prev => ({ ...prev, start_date: '', end_date: '' }))
      } else {
        setFormData(prev => ({ ...prev, single_date: '' }))
      }
    }
  }

  const resetForm = () => {
    setFormData({
      category: 'choreography',
      title: '',
      video_url: '',
      poster_url: '',
      description: '',
      country: 'Korea',
      start_date: '',
      end_date: '',
      single_date: '',
      date_type: 'range',
      is_featured: false
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const careerData = {
        user_id: profile.id,
        category: formData.category,
        title: formData.title,
        video_url: formData.video_url || null,
        poster_url: formData.poster_url || null,
        description: formData.description || null,
        country: formData.country,
        date_type: formData.date_type,
        single_date: formData.date_type === 'single' ? (formData.single_date || null) : null,
        start_date: formData.date_type === 'range' ? (formData.start_date || null) : null,
        end_date: formData.date_type === 'range' ? (formData.end_date || null) : null,
        is_featured: formData.is_featured
      }

      if (editingCareer) {
        const response = await fetch('/api/careers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profile.id,
            careerData: {
              ...careerData,
              id: editingCareer.id
            }
          })
        })

        if (response.ok) {
          setMessage('경력이 성공적으로 수정되었습니다.')
        } else {
          const error = await response.json()
          throw new Error(error.error || '수정에 실패했습니다.')
        }
      } else {
        const response = await fetch('/api/careers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profile.id,
            careerData
          })
        })

        if (response.ok) {
          setMessage('경력이 성공적으로 추가되었습니다.')
        } else {
          const error = await response.json()
          throw new Error(error.error || '추가에 실패했습니다.')
        }
      }

      await fetchCareers()
      setIsAddingCareer(false)
      setEditingCareer(null)
      resetForm()
    } catch (error) {
      console.error('경력 저장 오류:', error)
      setMessage(`경력 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (careerId: string) => {
    if (!confirm('정말로 이 경력을 삭제하시겠습니까?')) return

    try {
      const response = await fetch('/api/careers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          careerId,
          userId: profile.id
        })
      })

      if (response.ok) {
        setMessage('경력이 성공적으로 삭제되었습니다.')
        await fetchCareers()
      } else {
        const error = await response.json()
        throw new Error(error.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('경력 삭제 오류:', error)
      setMessage('경력 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (career: CareerEntry) => {
    setEditingCareer(career)
    setFormData({
      category: career.category || 'choreography',
      title: career.title,
      video_url: career.video_url || '',
      poster_url: career.poster_url || '',
      description: career.description || '',
      country: career.country || 'Korea',
      start_date: career.start_date || '',
      end_date: career.end_date || '',
      single_date: career.single_date || '',
      date_type: career.date_type || (career.single_date ? 'single' : 'range'),
      is_featured: career.is_featured || false
    })
  }

  const cancelEdit = () => {
    setEditingCareer(null)
    setIsAddingCareer(false)
    setIsBulkUpload(false)
    resetForm()
    setBulkData('')
    setMessage('')
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      choreography: 'bg-blue-100 text-blue-800',
      performance: 'bg-purple-100 text-purple-800',
      advertisement: 'bg-green-100 text-green-800',
      tv: 'bg-red-100 text-red-800',
      workshop: 'bg-yellow-100 text-yellow-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  // CSV 파싱 함수
  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n')
    const careers = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = []
      let current = ''
      let inQuotes = false
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())
      
      if (values.length >= 3) {
        const [type, title, detail, country = 'Korea', video_url = ''] = values
        
        const categoryMap: Record<string, string> = {
          'choreo': 'choreography',
          'performance': 'performance',
          'ad': 'advertisement',
          'tv': 'tv',
          'workshop': 'workshop'
        }
        
        const cleanVideoUrl = video_url.replace(/^"|"$/g, '') || null
        const posterUrl = cleanVideoUrl && isValidYouTubeUrl(cleanVideoUrl) 
          ? getThumbnailFromUrl(cleanVideoUrl) 
          : null

        careers.push({
          category: categoryMap[type.toLowerCase()] || 'choreography',
          title: title.replace(/^"|"$/g, ''),
          description: detail.replace(/^"|"$/g, ''),
          country: country.replace(/^"|"$/g, '') || 'Korea',
          video_url: cleanVideoUrl,
          poster_url: posterUrl,
          start_date: null,
          end_date: null,
          is_featured: false
        })
      }
    }
    
    return careers
  }

  // 대량 등록 처리
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkData.trim()) {
      setMessage('데이터를 입력해주세요.')
      return
    }

    setBulkLoading(true)
    setMessage('')

    try {
      const careers = parseCSV(bulkData)
      
      if (careers.length === 0) {
        setMessage('유효한 데이터가 없습니다. 형식을 확인해주세요.')
        return
      }

      const careerData = careers.map(career => ({
        ...career,
        user_id: profile.id
      }))

      for (const career of careerData) {
        const response = await fetch('/api/careers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profile.id,
            careerData: career
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '대량 등록 중 오류가 발생했습니다.')
        }
      }

      setMessage(`${careers.length}개의 경력이 성공적으로 등록되었습니다.`)
      await fetchCareers()
      setIsBulkUpload(false)
      setBulkData('')
    } catch (error) {
      console.error('대량 등록 오류:', error)
      setMessage(`대량 등록 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setBulkLoading(false)
    }
  }

  // 경력 데이터 수정/삭제 함수
  const handleCareerAction = async (action: 'edit' | 'delete', career: CareerEntry) => {
    try {
      if (action === 'edit') {
        setSelectedCareer(career)
        setShowCareerModal(true)
      } else if (action === 'delete') {
        if (confirm('정말 삭제하시겠습니까?')) {
          const isLinked = career.is_linked || false
          
          const response = await fetch('/api/careers', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              careerId: career.id,
              userId: profile.id,
              originalOwnerId: isLinked ? career.user_id : null
            })
          })

          if (response.ok) {
            setMessage(isLinked ? '연결된 경력이 삭제되었습니다.' : '경력이 삭제되었습니다.')
            fetchCareers()
          } else {
            const error = await response.json()
            setMessage(error.error || '삭제에 실패했습니다.')
          }
        }
      }
    } catch (error) {
      console.error('Career action error:', error)
      setMessage('작업에 실패했습니다.')
    }
  }

  // 경력 데이터 저장 함수
  const handleCareerSave = async (careerData: any) => {
    try {
      const isLinked = selectedCareer?.is_linked || false
      const originalOwnerId = isLinked ? selectedCareer?.user_id : null
      
      const response = await fetch('/api/careers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: profile.id,
          careerData: {
            ...careerData,
            id: selectedCareer?.id
          },
          originalOwnerId
        })
      })

      if (response.ok) {
        const result = await response.json()
        setMessage(result.message || '경력이 저장되었습니다.')
        setShowCareerModal(false)
        setSelectedCareer(null)
        fetchCareers()
      } else {
        const error = await response.json()
        setMessage(error.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Career save error:', error)
      setMessage('저장에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-200 rounded w-48 mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-zinc-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">경력 관리</h3>
          <p className="text-sm text-zinc-600">댄서 경력을 등록하고 관리하세요</p>
        </div>
        {!isAddingCareer && !editingCareer && !isBulkUpload && (
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsAddingCareer(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>경력 추가</span>
            </Button>
            <Button
              onClick={() => setIsBulkUpload(true)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>대량 등록</span>
            </Button>
          </div>
        )}
      </div>

      {/* 검색 및 필터 섹션 */}
      <div className="space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="경력 제목이나 설명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 카테고리</SelectItem>
              {availableCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {getCategoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="연도" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 연도</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 경력 추가/수정 폼 */}
      {(isAddingCareer || editingCareer) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingCareer ? '경력 수정' : '새 경력 추가'}</span>
              <Button
                onClick={cancelEdit}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <CloseIcon className="w-4 h-4" />
                <span>취소</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">카테고리 *</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="choreography">안무</option>
                    <option value="performance">공연</option>
                    <option value="advertisement">광고</option>
                    <option value="tv">방송</option>
                    <option value="workshop">워크샵</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">제목 *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="예: 아이돌 그룹 OO 타이틀곡 안무"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="video_url">영상 URL</Label>
                  <Input
                    id="video_url"
                    value={formData.video_url}
                    onChange={(e) => handleInputChange('video_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poster_url">포스터 URL</Label>
                  <Input
                    id="poster_url"
                    value={formData.poster_url}
                    onChange={(e) => handleInputChange('poster_url', e.target.value)}
                    placeholder="YouTube URL 입력시 자동 생성됩니다"
                  />
                  {formData.poster_url && (
                    <div className="mt-2">
                      <p className="text-xs text-zinc-600 mb-2">썸네일 미리보기:</p>
                      <img 
                        src={formData.poster_url} 
                        alt="썸네일 미리보기"
                        className="w-32 h-20 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">상세 설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="경력에 대한 상세한 설명을 입력하세요..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">국가</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Korea"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="mb-0">날짜</Label>
                    <UITabs value={formData.date_type} onValueChange={v => handleInputChange('date_type', v)} className="w-fit">
                      <UITabsList className="inline-flex h-8 w-fit items-center justify-center rounded-lg p-[2px] bg-zinc-900 border border-zinc-800">
                        <UITabsTrigger value="single" className="inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md border border-transparent px-3 py-0.5 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-transparent data-[state=inactive]:text-zinc-400">
                          날짜
                        </UITabsTrigger>
                        <UITabsTrigger value="range" className="inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md border border-transparent px-3 py-0.5 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-transparent data-[state=inactive]:text-zinc-400">
                          기간
                        </UITabsTrigger>
                      </UITabsList>
                    </UITabs>
                  </div>
                  {formData.date_type === 'range' ? (
                    <div className="flex items-center gap-3">
                      <input
                        id="start_date"
                        type="date"
                        value={formData.start_date || ''}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        placeholder="시작일"
                        className="min-w-[140px] w-full border rounded px-3 py-2 appearance-auto"
                      />
                      <span className="mx-1 text-lg text-zinc-400">~</span>
                      <input
                        id="end_date"
                        type="date"
                        value={formData.end_date || ''}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                        placeholder="종료일"
                        className="min-w-[140px] w-full border rounded px-3 py-2 appearance-auto"
                      />
                    </div>
                  ) : (
                    <input
                      id="single_date"
                      type="date"
                      value={formData.single_date || ''}
                      onChange={(e) => handleInputChange('single_date', e.target.value)}
                      placeholder="연도-월-일"
                      className="min-w-[140px] w-full border rounded pl-3 pr-2 py-2 appearance-auto bg-white"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="is_featured"
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_featured">대표작으로 설정</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={cancelEdit}
                  variant="outline"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? '저장 중...' : (editingCareer ? '수정' : '추가')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 대량 등록 폼 */}
      {isBulkUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>경력 대량 등록</span>
              <Button
                onClick={cancelEdit}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <CloseIcon className="w-4 h-4" />
                <span>취소</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">📋 입력 형식</h4>
                <p className="text-sm text-blue-800 mb-3">
                  각 줄에 다음 형식으로 입력하세요: <code className="bg-blue-100 px-1 rounded">type,title,detail,country,video_url</code>
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>type:</strong> choreo, performance, ad, tv, workshop</p>
                  <p><strong>title:</strong> 경력 제목 (따옴표로 감싸기 권장)</p>
                  <p><strong>detail:</strong> 상세 설명 (따옴표로 감싸기 권장)</p>
                  <p><strong>country:</strong> 국가 (기본값: Korea)</p>
                  <p><strong>video_url:</strong> 영상 URL (선택사항)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-data">경력 데이터</Label>
                <Textarea
                  id="bulk-data"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder={`choreo,"Love Language - TXT","안무 제작",,https://www.youtube.com/watch?v=8aRTMQvbODs
choreo,"마음 따라 뛰는 건 멋지지 않아? - TWS","안무 제작",,https://www.youtube.com/watch?v=Csaj3X6PKxY
choreo,"New is Now - NouerA","안무 제작",,https://www.youtube.com/watch?v=nfI7SX5n03c`}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={cancelEdit}
                  variant="outline"
                >
                  취소
                </Button>
                <Button
                  onClick={handleBulkUpload}
                  disabled={bulkLoading || !bulkData.trim()}
                  className="flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{bulkLoading ? '등록 중...' : '대량 등록'}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 연도별 아코디언 경력 목록 */}
      <div className="space-y-4">
        {groupedCareers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-zinc-400 mb-4">
                <Plus className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                {searchQuery || selectedCategory !== 'all' || selectedYear !== 'all' 
                  ? '검색 결과가 없습니다' 
                  : '등록된 경력이 없습니다'}
              </h3>
              <p className="text-zinc-600 mb-4">
                {searchQuery || selectedCategory !== 'all' || selectedYear !== 'all'
                  ? '검색 조건을 변경해보세요'
                  : '첫 번째 경력을 추가해보세요!'}
              </p>
              {!searchQuery && selectedCategory === 'all' && selectedYear === 'all' && (
                <Button
                  onClick={() => setIsAddingCareer(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>경력 추가</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          groupedCareers.map((yearGroup) => {
            const hasCareers = Object.values(yearGroup.categories).some(careers => careers.length > 0);
            if (!hasCareers) return null;

            return (
              <div key={yearGroup.year} className="border-b border-zinc-200 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleYear(yearGroup.year)}
                  className="flex justify-between items-center w-full p-4 text-left cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold">{yearGroup.year}년</span>
                    <Badge variant="secondary">
                      {Object.values(yearGroup.categories).reduce((sum, careers) => sum + careers.length, 0)}개
                    </Badge>
                  </div>
                  {expandedYears.has(yearGroup.year) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedYears.has(yearGroup.year) && (
                  <div className="p-4 space-y-4">
                    {Object.entries(yearGroup.categories).map(([category, careers]) => {
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
                                onClick={() => {
                                  setSelectedCareer(career);
                                  setShowCareerModal(true);
                                }}
                              >
                                <div className="flex items-start space-x-4">
                                  {/* 썸네일 */}
                                  <div className="flex-shrink-0 w-20 h-20 bg-zinc-100 rounded-lg overflow-hidden">
                                    {career.video_url && isValidYouTubeUrl(career.video_url) ? (
                                      <img
                                        src={`https://img.youtube.com/vi/${getYouTubeVideoId(career.video_url)}/mqdefault.jpg`}
                                        alt={career.title}
                                        className="w-full h-full object-cover"
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
                                  
                                  {/* 액션 버튼 */}
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCareerAction('edit', career);
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
                                        handleCareerAction('delete', career);
                                      }}
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash className="w-3 h-3" />
                                    </Button>
                                  </div>
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
            );
          })
        )}
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div className={`p-3 rounded-md ${
          message.includes('성공') 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* 경력 상세 모달 */}
      {showCareerModal && selectedCareer && (
        <Dialog open={showCareerModal} onOpenChange={setShowCareerModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedCareer.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCareerModal(false)}
                  className="h-6 w-6 p-0"
                >
                  <CloseIcon className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center">
                {selectedCareer.video_url && isValidYouTubeUrl(selectedCareer.video_url) && (
                  <div className="w-full max-w-2xl">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedCareer.video_url)}`}
                      title={selectedCareer.title}
                      className="w-full aspect-video rounded-lg shadow-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
                {selectedCareer.video_url && !isValidYouTubeUrl(selectedCareer.video_url) && (
                  <div className="w-full max-w-2xl aspect-video bg-zinc-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-zinc-600 mb-2">YouTube가 아닌 영상입니다</p>
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedCareer.video_url, '_blank')}
                      >
                        새 탭에서 보기
                      </Button>
                    </div>
                  </div>
                )}
                {!selectedCareer.video_url && (
                  <div className="w-full max-w-2xl aspect-video bg-zinc-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
                      <p className="text-zinc-600">영상이 없습니다</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-zinc-900">
                  {selectedCareer.title}
                </h3>
                <p className="text-sm text-zinc-600">
                  {selectedCareer.description}
                </p>
                <div className="flex items-center space-x-2 text-xs text-zinc-500">
                  {selectedCareer.start_date && selectedCareer.end_date && (
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(selectedCareer.start_date)} - {formatDate(selectedCareer.end_date)}
                    </span>
                  )}
                  {selectedCareer.country && (
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {selectedCareer.country}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCareerModal(false);
                    setSelectedCareer(null);
                  }}
                >
                  닫기
                </Button>
                <Button
                  onClick={() => {
                    setShowCareerModal(false);
                    setSelectedCareer(null);
                    handleEdit(selectedCareer);
                  }}
                >
                  수정
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowCareerModal(false);
                    setSelectedCareer(null);
                    handleCareerAction('delete', selectedCareer);
                  }}
                >
                  삭제
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 