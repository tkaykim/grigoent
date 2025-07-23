'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { UserDashboard } from '@/components/dashboard/UserDashboard'
import { DancerDashboard } from '@/components/dashboard/DancerDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { User, Calendar, Award, Activity, Clock, AlertCircle } from 'lucide-react'

export default function MyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyPageContent />
    </Suspense>
  )
}

function MyPageContent() {
  const { user, profile, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  // 댄서 승인 대기 상태 확인
  const isDancerPending = profile?.pending_type === 'dancer' && profile?.type === 'general'

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">
              마이페이지
            </h1>
            <p className="text-zinc-600">
              프로필과 활동을 관리하세요
            </p>
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
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UserDashboard profile={profile} />
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
    </div>
  )
} 