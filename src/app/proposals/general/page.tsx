'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, FileText, Send, Loader2, User, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { BudgetInput } from '@/components/ui/budget-input'
import { supabase } from '@/lib/supabase'

export default function GeneralProposalPage() {
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
      // 두 개의 API를 병렬로 호출
      const [proposalResponse, emailResponse] = await Promise.allSettled([
        // 기존 proposal API 호출
        fetch('/api/proposals/general', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
        }),
        
        // Google Apps Script 웹훅 호출 (Gmail 전송) - 프록시 API 사용
        fetch('/api/email-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'general_proposal',
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
      ])

      // 결과 확인
      let hasError = false
      
      if (proposalResponse.status === 'rejected' || 
          (proposalResponse.status === 'fulfilled' && !proposalResponse.value.ok)) {
        console.error('Proposal API error:', proposalResponse)
        hasError = true
      }
      
      if (emailResponse.status === 'rejected' || 
          (emailResponse.status === 'fulfilled' && !emailResponse.value.ok)) {
        console.error('Email webhook error:', emailResponse)
        // 이메일 전송 실패는 경고만 표시
        toast.warning('의뢰는 접수되었으나 이메일 전송에 실패했습니다.')
      }

      if (hasError) {
        throw new Error('의뢰 전송에 실패했습니다.')
      }
      
      toast.success('일반 의뢰가 성공적으로 전송되었습니다! 적절한 댄서나 팀이 확인 후 연락드리겠습니다.')
      router.push('/')
      
    } catch (error) {
      console.error('General proposal submission error:', error)
      toast.error(error instanceof Error ? error.message : '의뢰 전송 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">일반 의뢰</h1>
            <p className="text-zinc-600">
              특정 댄서나 팀을 지정하지 않고 프로젝트를 의뢰합니다. 
              적절한 댄서나 팀이 확인 후 연락드리겠습니다.
            </p>
          </div>

          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="w-5 h-5" />
                <span>일반 의뢰하기</span>
              </CardTitle>
              <p className="text-sm text-zinc-600">
                프로젝트 정보를 입력하시면 적절한 댄서나 팀이 확인 후 연락드립니다.
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
                  <Button type="button" variant="outline" onClick={() => router.push('/')}>
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
                        의뢰 전송
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}