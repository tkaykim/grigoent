'use client'

import { useState, useEffect } from 'react'
import { User, CareerEntry } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { getThumbnailFromUrl, isValidYouTubeUrl } from '@/lib/youtube'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  StarOff, 
  Calendar, 
  MapPin, 
  ExternalLink,
  Save,
  X as CloseIcon,
  Upload,
  FileText
} from 'lucide-react'
import { Tabs as UITabs, TabsList as UITabsList, TabsTrigger as UITabsTrigger } from '@/components/ui/tabs';

interface DancerDashboardProps {
  profile: User
}

export function DancerDashboard({ profile }: DancerDashboardProps) {
  const [careers, setCareers] = useState<CareerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingCareer, setIsAddingCareer] = useState(false)
  const [isBulkUpload, setIsBulkUpload] = useState(false)
  const [editingCareer, setEditingCareer] = useState<CareerEntry | null>(null)
  const [message, setMessage] = useState('')
  const [bulkData, setBulkData] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    category: 'choreography',
    title: '',
    video_url: '',
    poster_url: '',
    description: '',
    country: 'Korea',
    start_date: '',
    end_date: '',
    single_date: '',
    date_type: 'single',
    is_featured: false
  })

  useEffect(() => {
    fetchCareers()
  }, [])

  const fetchCareers = async () => {
    try {
      const { data, error } = await supabase
        .from('career_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('경력 로드 오류:', error)
        setMessage('경력을 불러오는 중 오류가 발생했습니다.')
        return
      }

      setCareers(data || [])
    } catch (error) {
      console.error('경력 로드 오류:', error)
      setMessage('경력을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // YouTube URL 입력시 자동으로 썸네일 생성
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
        // 수정
        const { error } = await supabase
          .from('career_entries')
          .update(careerData)
          .eq('id', editingCareer.id)

        if (error) {
          throw error
        }
        setMessage('경력이 성공적으로 수정되었습니다.')
      } else {
        // 새로 추가
        const { error } = await supabase
          .from('career_entries')
          .insert(careerData)

        if (error) {
          throw error
        }
        setMessage('경력이 성공적으로 추가되었습니다.')
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
      const { error } = await supabase
        .from('career_entries')
        .delete()
        .eq('id', careerId)

      if (error) {
        throw error
      }

      setMessage('경력이 성공적으로 삭제되었습니다.')
      await fetchCareers()
    } catch (error) {
      console.error('경력 삭제 오류:', error)
      setMessage('경력 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (career: CareerEntry) => {
    setEditingCareer(career)
    setFormData({
      category: career.category,
      title: career.title,
      video_url: career.video_url || '',
      poster_url: career.poster_url || '',
      description: career.description || '',
      country: career.country,
      start_date: career.start_date || '',
      end_date: career.end_date || '',
      single_date: career.single_date || '',
      date_type: career.date_type || (career.single_date ? 'single' : 'range'),
      is_featured: career.is_featured
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
      
      // CSV 파싱 (쉼표로 구분, 따옴표 처리)
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
      values.push(current.trim()) // 마지막 값
      
      if (values.length >= 3) {
        const [type, title, detail, country = 'Korea', video_url = ''] = values
        
        // 타입 매핑
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
          title: title.replace(/^"|"$/g, ''), // 따옴표 제거
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

      // 경력 데이터 준비
      const careerData = careers.map(career => ({
        ...career,
        user_id: profile.id
      }))

      // 대량 삽입
      const { error } = await supabase
        .from('career_entries')
        .insert(careerData)

      if (error) {
        throw error
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
                {/* 날짜/기간 토글 + 날짜 입력 */}
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

      {/* 경력 목록 */}
      <div className="space-y-4">
        {careers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-zinc-400 mb-4">
                <Plus className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                등록된 경력이 없습니다
              </h3>
              <p className="text-zinc-600 mb-4">
                첫 번째 경력을 추가해보세요!
              </p>
              <Button
                onClick={() => setIsAddingCareer(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>경력 추가</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          careers.map((career) => (
            <Card key={career.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className={getCategoryColor(career.category)}>
                        {getCategoryLabel(career.category)}
                      </Badge>
                      {career.is_featured && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3 mr-1" />
                          대표작
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                      {career.title}
                    </h3>
                    
                    {career.description && (
                      <p className="text-zinc-600 mb-3">
                        {career.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-zinc-500">
                      {career.country && (
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {career.country}
                        </span>
                      )}
                      {career.date_type === 'single' && career.single_date && (
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(career.single_date)}
                        </span>
                      )}
                      {career.date_type !== 'single' && career.start_date && (
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(career.start_date)}
                          {career.end_date && ` ~ ${formatDate(career.end_date)}`}
                        </span>
                      )}
                    </div>
                    
                    {(career.video_url || career.poster_url) && (
                      <div className="mt-3">
                        {career.video_url && (
                          <a
                            href={career.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:underline mr-4"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            영상 보기
                          </a>
                        )}
                        {career.poster_url && (
                          <a
                            href={career.poster_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:underline"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            포스터 보기
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      onClick={() => handleEdit(career)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>수정</span>
                    </Button>
                    <Button
                      onClick={() => handleDelete(career.id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>삭제</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
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
    </div>
  )
} 