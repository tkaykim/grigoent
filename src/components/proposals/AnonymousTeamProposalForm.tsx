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
import { Calendar, MapPin, FileText, Send, Loader2, User, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { BudgetInput } from '@/components/ui/budget-input'

interface AnonymousTeamProposalFormProps {
  teamId: string
  teamName: string
  onClose: () => void
}

export function AnonymousTeamProposalForm({ teamId, teamName, onClose }: AnonymousTeamProposalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
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
    
    if (!formData.client_name.trim() || !formData.client_email.trim() || 
        !formData.title.trim() || !formData.description.trim() || !formData.project_type) {
      toast.error('필수 항목을 모두 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/proposals/anonymous-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: teamId,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
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
        const errorData = await response.json()
        throw new Error(errorData.error || '제안 전송에 실패했습니다.')
      }

      const result = await response.json()
      
      toast.success('익명 팀 제안이 성공적으로 전송되었습니다! 팀이 확인 후 연락드리겠습니다.')
      onClose()
      router.refresh()
      
    } catch (error) {
      console.error('Anonymous team proposal submission error:', error)
      toast.error(error instanceof Error ? error.message : '제안 전송 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="w-5 h-5" />
          <span>익명 팀 섭외 제안</span>
        </CardTitle>
        <p className="text-sm text-zinc-600">
          <strong>{teamName}</strong> 팀에게 익명으로 섭외 제안을 보냅니다.
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 연락처 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-zinc-900">연락처 정보</h3>
            
            <div className="space-y-2">
              <Label htmlFor="client_name" className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>이름 *</span>
              </Label>
              <Input
                id="client_name"
                placeholder="연락받을 분의 이름을 입력하세요"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_email" className="flex items-center space-x-1">
                <Mail className="w-4 h-4" />
                <span>이메일 *</span>
              </Label>
              <Input
                id="client_email"
                type="email"
                placeholder="example@email.com"
                value={formData.client_email}
                onChange={(e) => handleInputChange('client_email', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_phone" className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>전화번호</span>
              </Label>
              <Input
                id="client_phone"
                type="tel"
                placeholder="010-1234-5678"
                value={formData.client_phone}
                onChange={(e) => handleInputChange('client_phone', e.target.value)}
              />
            </div>
          </div>

          {/* 프로젝트 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-zinc-900">프로젝트 정보</h3>
            
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

            {/* 위치 */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>작업 지역</span>
              </Label>
              <Input
                id="location"
                placeholder="예: 서울, 부산, 해외 등"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>

            {/* 추가 요구사항 */}
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
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  제안 전송
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}