'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProjectStatusBadge } from '@/components/proposals/ProjectStatusBadge'
import { ProjectStatusUpdate } from '@/components/proposals/ProjectStatusUpdate'
import { ProjectTimeline } from '@/components/proposals/ProjectTimeline'
import { ProjectMessages } from '@/components/proposals/ProjectMessages'
import { 
  Inbox, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  X,
  FileText,
  DollarSign,
  MapPin,
  Calendar
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Proposal {
  id: string
  title: string
  description: string
  project_type: string
  budget_min?: number
  budget_max?: number
  start_date?: string
  end_date?: string
  location?: string
  requirements?: string
  status: string
  created_at: string
  updated_at: string
  client?: {
    id: string
    name: string
    name_en: string
    profile_image?: string
  }
  dancer?: {
    id: string
    name: string
    name_en: string
    profile_image?: string
  }
}

export default function ProposalsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('received')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<Proposal | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    fetchProposals()
  }, [user, activeTab])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProposals = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch(`/api/proposals?type=${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('제안을 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      setProposals(data.proposals || [])
    } catch (error) {
      console.error('Proposal fetch error:', error)
      toast.error('제안을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (proposalId: string, newStatus: string, message?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      console.log('Status update request:', { proposalId, newStatus, message })

      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          message: message
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Status update response error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        throw new Error(`상태 업데이트에 실패했습니다. (${response.status}: ${errorData.error || response.statusText})`)
      }

      const result = await response.json()
      console.log('Status update success:', result)

      toast.success('프로젝트 상태가 업데이트되었습니다.')
      
      // 목록 새로고침
      fetchProposals()
      
      // 상세 모달이 열려있다면 제안 정보도 업데이트
      if (selectedProposalForDetail && selectedProposalForDetail.id === proposalId) {
        const updatedProposal = { ...selectedProposalForDetail, status: newStatus }
        setSelectedProposalForDetail(updatedProposal)
      }
    } catch (error) {
      console.error('Status update error:', error)
      toast.error(error instanceof Error ? error.message : '상태 업데이트에 실패했습니다.')
      throw error
    }
  }

  const openDetailModal = (proposal: Proposal) => {
    setSelectedProposalForDetail(proposal)
    setDetailModalOpen(true)
  }

  const getProjectTypeLabel = (type: string) => {
    const typeLabels: { [key: string]: string } = {
      'choreography': '안무',
      'performance': '공연',
      'advertisement': '광고',
      'tv': 'TV',
      'workshop': '워크샵',
      'other': '기타'
    }
    return typeLabels[type] || type
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const formatBudget = (min?: number, max?: number) => {
    if (min && max) {
      return `${min.toLocaleString()}원 ~ ${max.toLocaleString()}원`
    } else if (min) {
      return `${min.toLocaleString()}원 이상`
    } else if (max) {
      return `${max.toLocaleString()}원 이하`
    }
    return '협의'
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">프로젝트 관리</h1>
            <p className="text-zinc-600">
              보낸 제안과 받은 제안을 관리하고 프로젝트 진행 상황을 추적하세요
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received" className="flex items-center space-x-2">
                <Inbox className="w-4 h-4" />
                <span>받은 제안</span>
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span>보낸 제안</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="mt-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
                    <p className="mt-2 text-zinc-600">제안을 불러오는 중...</p>
                  </div>
                ) : proposals.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Inbox className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-zinc-900 mb-2">받은 제안이 없습니다</h3>
                      <p className="text-zinc-600">아직 받은 제안이 없습니다.</p>
                    </CardContent>
                  </Card>
                ) : (
                  proposals.map((proposal) => (
                    <Card key={proposal.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={proposal.client?.profile_image} />
                              <AvatarFallback>
                                {proposal.client?.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-zinc-900">{proposal.title}</h3>
                              <p className="text-sm text-zinc-600">
                                {proposal.client?.name || '익명'}님이 보낸 제안
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ProjectStatusBadge status={proposal.status} />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetailModal(proposal)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-3">
                          <p className="text-zinc-700 line-clamp-2">{proposal.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-zinc-500" />
                              <span className="text-zinc-600">
                                {getProjectTypeLabel(proposal.project_type)}
                              </span>
                            </div>
                            
                            {proposal.budget_min || proposal.budget_max ? (
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4 text-zinc-500" />
                                <span className="text-zinc-600">
                                  {formatBudget(proposal.budget_min, proposal.budget_max)}
                                </span>
                              </div>
                            ) : null}
                            
                            {proposal.location && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-zinc-500" />
                                <span className="text-zinc-600">{proposal.location}</span>
                              </div>
                            )}
                            
                            {proposal.start_date && (
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-zinc-500" />
                                <span className="text-zinc-600">
                                  {formatDate(proposal.start_date)}
                                  {proposal.end_date && ` ~ ${formatDate(proposal.end_date)}`}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t">
                            <span className="text-xs text-zinc-500">
                              {formatDate(proposal.created_at)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="sent" className="mt-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
                    <p className="mt-2 text-zinc-600">제안을 불러오는 중...</p>
                  </div>
                ) : proposals.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Send className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-zinc-900 mb-2">보낸 제안이 없습니다</h3>
                      <p className="text-zinc-600">아직 보낸 제안이 없습니다.</p>
                    </CardContent>
                  </Card>
                ) : (
                  proposals.map((proposal) => (
                    <Card key={proposal.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={proposal.dancer?.profile_image} />
                              <AvatarFallback>
                                {proposal.dancer?.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-zinc-900">{proposal.title}</h3>
                              <p className="text-sm text-zinc-600">
                                {proposal.dancer?.name || '팀'}에게 보낸 제안
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ProjectStatusBadge status={proposal.status} />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetailModal(proposal)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-3">
                          <p className="text-zinc-700 line-clamp-2">{proposal.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-zinc-500" />
                              <span className="text-zinc-600">
                                {getProjectTypeLabel(proposal.project_type)}
                              </span>
                            </div>
                            
                            {proposal.budget_min || proposal.budget_max ? (
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4 text-zinc-500" />
                                <span className="text-zinc-600">
                                  {formatBudget(proposal.budget_min, proposal.budget_max)}
                                </span>
                              </div>
                            ) : null}
                            
                            {proposal.location && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-zinc-500" />
                                <span className="text-zinc-600">{proposal.location}</span>
                              </div>
                            )}
                            
                            {proposal.start_date && (
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-zinc-500" />
                                <span className="text-zinc-600">
                                  {formatDate(proposal.start_date)}
                                  {proposal.end_date && ` ~ ${formatDate(proposal.end_date)}`}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t">
                            <span className="text-xs text-zinc-500">
                              {formatDate(proposal.created_at)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* 프로젝트 상세 모달 */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>프로젝트 상세</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedProposalForDetail && (
            <div className="space-y-6">
              {/* 프로젝트 정보 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{selectedProposalForDetail.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <ProjectStatusBadge status={selectedProposalForDetail.status} />
                      <ProjectStatusUpdate
                        proposalId={selectedProposalForDetail.id}
                        currentStatus={selectedProposalForDetail.status}
                        onStatusUpdate={handleStatusUpdate}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">프로젝트 설명</h4>
                      <p className="text-zinc-700 whitespace-pre-wrap">
                        {selectedProposalForDetail.description}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">프로젝트 정보</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-zinc-500" />
                            <span>유형: {getProjectTypeLabel(selectedProposalForDetail.project_type)}</span>
                          </div>
                          
                          {(selectedProposalForDetail.budget_min || selectedProposalForDetail.budget_max) && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-zinc-500" />
                              <span>예산: {formatBudget(selectedProposalForDetail.budget_min, selectedProposalForDetail.budget_max)}</span>
                            </div>
                          )}
                          
                          {selectedProposalForDetail.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-zinc-500" />
                              <span>위치: {selectedProposalForDetail.location}</span>
                            </div>
                          )}
                          
                          {selectedProposalForDetail.start_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-zinc-500" />
                              <span>
                                기간: {formatDate(selectedProposalForDetail.start_date)}
                                {selectedProposalForDetail.end_date && ` ~ ${formatDate(selectedProposalForDetail.end_date)}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">참여자</h4>
                        <div className="space-y-2">
                          {selectedProposalForDetail.client && (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={selectedProposalForDetail.client.profile_image} />
                                <AvatarFallback>
                                  {selectedProposalForDetail.client.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{selectedProposalForDetail.client.name} (클라이언트)</span>
                            </div>
                          )}
                          
                          {selectedProposalForDetail.dancer && (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={selectedProposalForDetail.dancer.profile_image} />
                                <AvatarFallback>
                                  {selectedProposalForDetail.dancer.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{selectedProposalForDetail.dancer.name} (댄서/팀)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 프로젝트 타임라인 */}
              <ProjectTimeline 
                proposalId={selectedProposalForDetail.id}
                proposal={selectedProposalForDetail}
              />

              {/* 프로젝트 메시지 */}
              <ProjectMessages 
                proposalId={selectedProposalForDetail.id}
                proposal={selectedProposalForDetail}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  )
}