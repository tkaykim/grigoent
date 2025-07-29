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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Search, 
  User, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  name_en: string
  email: string
  profile_image?: string
  type: string
  introduction?: string
}

export default function ClaimPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [claimReason, setClaimReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [claimStatus, setClaimStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        // 현재 사용자의 연결 요청 상태 확인
        const { data: userData } = await supabase
          .from('users')
          .select('claim_status')
          .eq('id', user.id)
          .single()

        if (userData?.claim_status) {
          setClaimStatus(userData.claim_status)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const searchUsers = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('사용자 검색에 실패했습니다.')
      }

      const data = await response.json()
      setSearchResults(data.users || [])
    } catch (error) {
      console.error('User search error:', error)
      toast.error('사용자 검색에 실패했습니다.')
    } finally {
      setSearching(false)
    }
  }

  const submitClaim = async () => {
    if (!selectedUser || !claimReason.trim()) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch('/api/users/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          claim_user_id: selectedUser.id,
          claim_reason: claimReason.trim()
        }),
      })

      if (!response.ok) {
        throw new Error('연결 요청에 실패했습니다.')
      }

      toast.success('연결 요청이 제출되었습니다. 관리자 검토 후 결과를 알려드리겠습니다.')
      setClaimStatus('pending')
      setSelectedUser(null)
      setClaimReason('')
      setSearchResults([])
      setSearchQuery('')
    } catch (error) {
      console.error('Claim submission error:', error)
      toast.error('연결 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '검토 중', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">기존 댄서 정보 연결</h1>
            <p className="text-zinc-600">
              기존에 등록된 댄서 정보와 연결하여 계정을 통합할 수 있습니다.
            </p>
          </div>

          {/* 현재 상태 표시 */}
          {claimStatus && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <h3 className="font-medium">연결 요청 상태</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(claimStatus)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 검색 폼 */}
          {!claimStatus && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>기존 댄서 검색</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="search">이름 또는 이메일로 검색</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="댄서 이름 또는 이메일을 입력하세요"
                        onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                      />
                      <Button onClick={searchUsers} disabled={searching || !searchQuery.trim()}>
                        {searching ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 검색 결과 */}
                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium">검색 결과</h3>
                      {searchResults.map((result) => (
                        <Card key={result.id} className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => setSelectedUser(result)}>
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={result.profile_image} />
                                <AvatarFallback>
                                  {result.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h4 className="font-medium">{result.name}</h4>
                                <p className="text-sm text-zinc-600">{result.name_en}</p>
                                <p className="text-sm text-zinc-500">{result.email}</p>
                              </div>
                              <Badge variant="outline">{result.type}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 선택된 사용자 정보 및 연결 요청 폼 */}
          {selectedUser && !claimStatus && (
            <Card>
              <CardHeader>
                <CardTitle>연결 요청</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 선택된 사용자 정보 */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">선택된 댄서 정보</h3>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={selectedUser.profile_image} />
                        <AvatarFallback>
                          {selectedUser.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{selectedUser.name}</h4>
                        <p className="text-sm text-zinc-600">{selectedUser.name_en}</p>
                        <p className="text-sm text-zinc-500">{selectedUser.email}</p>
                        <Badge variant="outline">{selectedUser.type}</Badge>
                      </div>
                    </div>
                    {selectedUser.introduction && (
                      <p className="text-sm text-zinc-700 mt-3">
                        {selectedUser.introduction}
                      </p>
                    )}
                  </div>

                  {/* 연결 이유 입력 */}
                  <div>
                    <Label htmlFor="claim-reason">연결 이유</Label>
                    <Textarea
                      id="claim-reason"
                      value={claimReason}
                      onChange={(e) => setClaimReason(e.target.value)}
                      placeholder="이 계정과 연결하고 싶은 이유를 설명해주세요..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(null)
                        setClaimReason('')
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={submitClaim}
                      disabled={!claimReason.trim() || loading}
                    >
                      {loading ? '제출 중...' : '연결 요청 제출'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}