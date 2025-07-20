'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, FileText, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BudgetInput } from '@/components/ui/budget-input'
import { supabase } from '@/lib/supabase'

interface ProposalFormProps {
  dancerId: string
  dancerName: string
  onClose: () => void
}

export function ProposalForm({ dancerId, dancerName, onClose }: ProposalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_type: '',
    budget_min: '',
    budget_max: '',
    start_date: '',
    end_date: '',
    location: '',
    requirements: ''
  })
  const [budgetCurrency, setBudgetCurrency] = useState('KRW')
  const [budgetMinUndecided, setBudgetMinUndecided] = useState(false)
  const [budgetMaxUndecided, setBudgetMaxUndecided] = useState(false)

  const projectTypes = [
    { value: 'choreography', label: '안무 제작' },
    { value: 'performance', label: '공연 참여' },
    { value: 'advertisement', label: '광고 촬영' },
    { value: 'tv', label: '방송 출연' },
    { value: 'workshop', label: '워크샵 진행' },
    { value: 'other', label: '기타' }
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.project_type) {
      toast.error('필수 항목을 모두 입력해주세요.')
      return
    }

    // 로그인 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      toast.error('로그인이 필요합니다. 로그인 페이지로 이동합니다.')
      setTimeout(() => {
        window.location.href = '/signin'
      }, 2000)
      return
    }

    // 사용자 타입 확인 (임시로 제거 - 모든 사용자가 제안 가능)
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('type')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        // 프로필 조회 실패해도 제안은 가능하도록 처리
      } else {
        console.log('User profile:', userProfile)
      }
    } catch (error) {
      console.error('Profile check error:', error)
      // 에러가 발생해도 제안은 가능하도록 처리
    }
    
    // 모든 사용자가 제안할 수 있도록 권한 제한 제거
    // if (!userProfile || (userProfile.role !== 'client' && userProfile.role !== 'admin')) {
    //   toast.error('클라이언트만 섭외 제안을 보낼 수 있습니다.')
    //   return
    // }

    setLoading(true)

    try {
      // 실제 API 사용
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dancer_id: dancerId,
          title: formData.title,
          description: formData.description,
          project_type: formData.project_type,
          budget_min: formData.budget_min && !budgetMinUndecided ? parseInt(formData.budget_min.replace(/,/g, '')) : null,
          budget_max: formData.budget_max && !budgetMaxUndecided ? parseInt(formData.budget_max.replace(/,/g, '')) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          location: formData.location || null,
          requirements: formData.requirements || null
        }),
      })

      if (!response.ok) {
        throw new Error('제안 전송에 실패했습니다.')
      }

      const result = await response.json()
      
      toast.success('섭외 제안이 성공적으로 전송되었습니다!')
      onClose()
      router.refresh()
      
    } catch (error) {
      console.error('Proposal submission error:', error)
      toast.error('제안 전송 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="w-5 h-5" />
          <span>섭외 제안 보내기</span>
        </CardTitle>
        <p className="text-sm text-zinc-600">
          <strong>{dancerName}</strong>님에게 섭외 제안을 보냅니다.
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 프로젝트 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>프로젝트 제목 *</span>
            </Label>
            <Input
              id="title"
              placeholder="예: 아이돌 그룹 타이틀곡 안무 제작"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </div>

          {/* 프로젝트 타입 */}
          <div className="space-y-2">
            <Label htmlFor="project_type" className="flex items-center space-x-1">
              <Badge className="w-4 h-4" />
              <span>프로젝트 유형 *</span>
            </Label>
            <Select
              value={formData.project_type}
              onValueChange={(value) => handleInputChange('project_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="프로젝트 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 프로젝트 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>프로젝트 설명 *</span>
            </Label>
            <Textarea
              id="description"
              placeholder="프로젝트에 대한 자세한 설명을 입력하세요..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* 예산 범위 */}
          <div className="grid grid-cols-2 gap-4">
            <BudgetInput
              value={formData.budget_min}
              currency={budgetCurrency}
              isUndecided={budgetMinUndecided}
              onValueChange={(value) => handleInputChange('budget_min', value)}
              onCurrencyChange={setBudgetCurrency}
              onUndecidedChange={setBudgetMinUndecided}
              placeholder="최소 예산"
            />
            <BudgetInput
              value={formData.budget_max}
              currency={budgetCurrency}
              isUndecided={budgetMaxUndecided}
              onValueChange={(value) => handleInputChange('budget_max', value)}
              onCurrencyChange={setBudgetCurrency}
              onUndecidedChange={setBudgetMaxUndecided}
              placeholder="최대 예산"
            />
          </div>

          {/* 기간 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>시작일</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>종료일</span>
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
          </div>

          {/* 장소 */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>장소</span>
            </Label>
            <Input
              id="location"
              placeholder="예: 서울시 강남구"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
            />
          </div>

          {/* 요구사항 */}
          <div className="space-y-2">
            <Label htmlFor="requirements" className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>추가 요구사항</span>
            </Label>
            <Textarea
              id="requirements"
              placeholder="특별한 요구사항이나 조건이 있다면 입력하세요..."
              value={formData.requirements}
              onChange={(e) => handleInputChange('requirements', e.target.value)}
              rows={3}
            />
          </div>

          {/* 버튼 */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  제안 보내기
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 