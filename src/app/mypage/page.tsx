'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { UserDashboard } from '@/components/dashboard/UserDashboard'
import { DancerDashboard } from '@/components/dashboard/DancerDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { User, Calendar, Award, Activity, Clock, AlertCircle, Link as LinkIcon, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Team, TeamMember } from '@/lib/types'
import { TeamCard } from '@/components/artists/TeamCard'
import { ClaimRequestModal } from '@/components/proposals/ClaimRequestModal'

export default function MyPage() {
  const { user, profile, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [myTeams, setMyTeams] = useState<{ team: Team; role: string }[]>([])
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)

  useEffect(() => {
    if (user && user.id) fetchMyTeams()
    // eslint-disable-next-line
  }, [user])

  // 연동 상태 변경 감지 및 데이터 새로고침
  useEffect(() => {
    if (profile?.claim_status === 'approved') {
      // 연동 승인된 경우 데이터 새로고침
      fetchMyTeams()
    }
  }, [profile?.claim_status])

  const fetchMyTeams = async () => {
    if (!user?.id) return;
    // team_members에서 내 user_id로 소속팀 목록 조회
    const { data: members } = await supabase
      .from('team_members')
      .select('role, team:teams(*)')
      .eq('user_id', user.id)
    if (members) setMyTeams(members.map(t => ({ team: Array.isArray(t.team) ? t.team[0] : t.team, role: t.role })))
  }

  // 댄서 승인 대기 상태 확인
  const isDancerPending = profile?.pending_type === 'dancer' && profile?.type === 'general'

  // 연동 신청 상태 확인
  const hasClaimRequest = profile?.claim_user_id && profile?.claim_status
  const isClaimCompleted = profile?.claim_status === 'completed'

  const getClaimStatusBadge = () => {
    if (!hasClaimRequest && !isClaimCompleted) return null
    
    const status = profile?.claim_status
    if (status === 'pending') {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          연동 신청 대기중
        </Badge>
      )
    } else if (status === 'approved') {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          연동 승인됨
        </Badge>
      )
    } else if (status === 'rejected') {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          연동 거절됨
        </Badge>
      )
    } else if (status === 'completed') {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          연동 완료
        </Badge>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-zinc-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-200 rounded w-48 mb-8" />
              <div className="space-y-4">
                <div className="h-4 bg-zinc-200 rounded w-full" />
                <div className="h-4 bg-zinc-200 rounded w-3/4" />
                <div className="h-4 bg-zinc-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-zinc-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-900 mb-4">
                로그인이 필요합니다
              </h1>
              <p className="text-zinc-600">
                마이페이지를 이용하려면 로그인해주세요.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const getRoleLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: '일반회원',
      dancer: '댄서',
      client: '클라이언트',
      manager: '매니저',
      admin: '관리자',
    }
    return labels[type] || type
  }

  const getRoleColor = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-gray-100 text-gray-800',
      dancer: 'bg-blue-100 text-blue-800',
      client: 'bg-green-100 text-green-800',
      manager: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div>
      <Header />
      <main className="pt-16 min-h-screen bg-zinc-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 페이지 헤더 */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 mb-2">
                마이페이지
              </h1>
              <p className="text-zinc-600">
                프로필과 활동을 관리하세요
              </p>
            </div>
            <Link href="/teams/create">
              <Button className="bg-white text-black rounded-lg font-semibold hover:bg-zinc-100 border border-zinc-300 shadow-sm transition-all">팀 생성</Button>
            </Link>
          </div>

          {/* 댄서 승인 대기 상태 알림 */}
          {isDancerPending && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    댄서 계정 승인 대기 중
                  </h3>
                  <p className="text-xs text-yellow-700 mt-1">
                    댄서 계정으로 권한신청이 되었고 승인 대기중입니다. 
                    승인 완료 시 댄서 전용 기능을 이용할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 연동 신청 상태 알림 */}
          {hasClaimRequest && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-blue-800">
                      기존 댄서 정보 연동 신청
                    </h3>
                    {getClaimStatusBadge()}
                  </div>
                  <p className="text-xs text-blue-700">
                    {profile?.claim_status === 'pending' && '연동 신청이 접수되었습니다. 관리자 검토 후 결과를 알려드리겠습니다.'}
                    {profile?.claim_status === 'approved' && '연동이 승인되었습니다. 프로필 정보, 경력 정보, 팀 멤버십, 제안 정보가 모두 병합되었습니다. 페이지를 새로고침하여 최신 정보를 확인하세요.'}
                    {profile?.claim_status === 'rejected' && '연동 신청이 거절되었습니다. 다른 댄서 정보로 다시 신청하거나 새로 등록해주세요.'}
                    {profile?.claim_status === 'completed' && '연동이 완료되었습니다. 기존 댄서 정보와 성공적으로 연결되었습니다.'}
                  </p>
                  {profile?.claim_status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.reload()}
                      className="mt-2"
                    >
                      페이지 새로고침
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 통합된 프로필 관리 */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5" />
                  <CardTitle>프로필 관리</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getRoleColor(profile.type)}>
                    {getRoleLabel(profile.type)}
                  </Badge>
                  {isDancerPending && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      <Clock className="w-3 h-3 mr-1" />
                      승인 대기
                    </Badge>
                  )}
                  {getClaimStatusBadge()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UserDashboard profile={profile} />
              
              {/* 연동 신청 버튼 */}
              {(profile.type === 'general' || profile.type === 'dancer') && !hasClaimRequest && !isClaimCompleted && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">기존 댄서 정보 연동</h4>
                      <p className="text-sm text-blue-700">
                        기존에 등록된 댄서 정보가 있다면 연동하여 기존 경력과 정보를 유지할 수 있습니다.
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsClaimModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <LinkIcon className="w-4 h-4 mr-2" />
                      연동 신청
                    </Button>
                  </div>
                </div>
              )}
              
              {/* 소속팀 버튼형 표시 */}
              {myTeams.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-zinc-600 font-medium">소속팀:</span>
                  {myTeams.map(t => (
                    <a
                      key={t.team.id}
                      href={`/teams/${t.team.slug}`}
                      className="inline-block px-3 py-1 rounded-lg bg-zinc-100 text-zinc-800 text-sm font-semibold hover:bg-zinc-200 transition-all border border-zinc-200"
                    >
                      {t.team.name} ({t.team.name_en})
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 탭 인터페이스 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="career" className="flex items-center space-x-2">
                <Award className="w-4 h-4" />
                <span>경력 관리</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>활동 내역</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="career" className="space-y-6">
              {profile.type === 'dancer' ? (
                <DancerDashboard profile={profile} />
              ) : isDancerPending ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                      승인 대기 중
                    </h3>
                    <p className="text-zinc-600 mb-4">
                      댄서 계정 승인 후 경력 관리 기능을 이용할 수 있습니다.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-700">
                        댄서 계정으로 권한신청이 되었고 승인 대기중입니다.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Award className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                      댄서 전용 기능
                    </h3>
                    <p className="text-zinc-600">
                      경력 관리는 댄서 회원만 이용할 수 있습니다.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                    활동 내역
                  </h3>
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                    <p className="text-zinc-600">
                      아직 활동 내역이 없습니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      
      {/* 연동 신청 모달 */}
      <ClaimRequestModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onSuccess={() => {
          // 성공 시 페이지 새로고침하여 상태 업데이트
          window.location.reload()
        }}
      />
    </div>
  )
} 