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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  User as UserIcon, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  X,
  AlertTriangle
} from 'lucide-react'

interface ClaimRequest {
  id: string
  name: string
  name_en: string
  email: string
  profile_image?: string
  created_at: string
  claim_user_id: string
  claim_status: 'pending' | 'approved' | 'rejected'
  claim_reason?: string
  claimed_user?: {
    id: string
    name: string
    name_en: string
    email: string
    profile_image?: string
    type: string
  }
}

export default function AdminClaimsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [claims, setClaims] = useState<ClaimRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        // 관리자 권한 확인
        const { data: userData } = await supabase
          .from('users')
          .select('type')
          .eq('id', user.id)
          .single()

        if (userData?.type !== 'admin') {
          toast.error('관리자만 접근할 수 있습니다.')
          router.push('/')
          return
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (user) {
      fetchClaims()
    }
  }, [user])

  const fetchClaims = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch('/api/admin/claims', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('연결 요청을 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      setClaims(data.claims || [])
    } catch (error) {
      console.error('Claims fetch error:', error)
      toast.error('연결 요청을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimResponse = async (claimId: string, status: 'approved' | 'rejected') => {
    if (!selectedClaim) return

    setProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch(`/api/admin/claims/${claimId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status,
          message: responseMessage.trim() || undefined
        }),
      })

      if (!response.ok) {
        throw new Error('요청 처리에 실패했습니다.')
      }

      toast.success(`연결 요청이 ${status === 'approved' ? '승인' : '거절'}되었습니다.`)
      setDetailModalOpen(false)
      setSelectedClaim(null)
      setResponseMessage('')
      fetchClaims() // 목록 새로고침
    } catch (error) {
      console.error('Claim response error:', error)
      toast.error('요청 처리에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const openDetailModal = (claim: ClaimRequest) => {
    setSelectedClaim(claim)
    setDetailModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: '승인됨', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: '거절됨', color: 'bg-red-100 text-red-800', icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">연결 요청 관리</h1>
            <p className="text-zinc-600">
              신규 회원의 기존 댄서 정보 연결 요청을 관리하세요
            </p>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
                <p className="mt-2 text-zinc-600">연결 요청을 불러오는 중...</p>
              </div>
            ) : claims.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-900 mb-2">연결 요청이 없습니다</h3>
                  <p className="text-zinc-600">처리할 연결 요청이 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              claims.map((claim) => (
                <Card key={claim.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={claim.profile_image} />
                          <AvatarFallback>
                            {claim.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-zinc-900">{claim.name}</h5>
                            <Badge variant="outline" className="text-xs">
                              {claim.name_en}
                            </Badge>
                            {claim.claimed_user && claim.name === claim.claimed_user.name && (
                              <Badge variant="secondary" className="text-xs">
                                동일 인물
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-500">{claim.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(claim.claim_status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailModal(claim)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      {claim.claim_reason && (
                        <p className="text-zinc-700 text-sm">
                          <strong>연결 이유:</strong> {claim.claim_reason}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-xs text-zinc-500">
                          요청일: {formatDate(claim.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      {/* 상세 모달 */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>연결 요청 상세</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedClaim && (
            <div className="space-y-6">
              {/* 신규 회원 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    신규 회원 정보
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={selectedClaim.profile_image} />
                      <AvatarFallback>
                        {selectedClaim.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedClaim.name}</h3>
                      <p className="text-sm text-zinc-600">{selectedClaim.name_en}</p>
                      <p className="text-sm text-zinc-500">{selectedClaim.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 기존 댄서 정보 */}
              {selectedClaim.claimed_user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      기존 댄서 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={selectedClaim.claimed_user.profile_image} />
                        <AvatarFallback>
                          {selectedClaim.claimed_user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{selectedClaim.claimed_user.name}</h3>
                        <p className="text-sm text-zinc-600">{selectedClaim.claimed_user.name_en}</p>
                        <p className="text-sm text-zinc-500">{selectedClaim.claimed_user.email}</p>
                        <Badge variant="outline">{selectedClaim.claimed_user.type}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 연결 이유 */}
              {selectedClaim.claim_reason && (
                <Card>
                  <CardHeader>
                    <CardTitle>연결 이유</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-700 whitespace-pre-wrap">
                      {selectedClaim.claim_reason}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* 응답 메시지 */}
              {selectedClaim.claim_status === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="response-message">응답 메시지 (선택사항)</Label>
                  <Textarea
                    id="response-message"
                    placeholder="승인/거절 이유를 입력하세요..."
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* 액션 버튼 */}
              {selectedClaim.claim_status === 'pending' && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDetailModalOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => handleClaimResponse(selectedClaim.id, 'rejected')}
                    disabled={processing}
                  >
                    {processing ? '처리 중...' : '거절'}
                  </Button>
                  <Button
                    onClick={() => handleClaimResponse(selectedClaim.id, 'approved')}
                    disabled={processing}
                  >
                    {processing ? '처리 중...' : '승인'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}