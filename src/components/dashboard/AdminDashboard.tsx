'use client'

import { useState } from 'react'
import { User } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { Check, X, Eye, ArrowRight } from 'lucide-react'
import { ArtistTeamOrderManager } from '@/components/artists/ArtistTeamOrderManager'

interface AdminDashboardProps {
  pendingUsers: User[]
  allUsers: User[]
  onUserUpdate: () => void
}

export function AdminDashboard({ pendingUsers, allUsers, onUserUpdate }: AdminDashboardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [displayOrder, setDisplayOrder] = useState<Record<string, number>>({})
  const [showOrderManager, setShowOrderManager] = useState(false)

  const handleApprove = async (userId: string, pendingType: string) => {
    setLoading(userId)
    setMessage('')

    try {
      const { error } = await supabase
        .from('users')
        .update({
          type: pendingType,
          pending_type: null
        })
        .eq('id', userId)

      if (error) throw error

      setMessage('사용자가 성공적으로 승인되었습니다.')
      onUserUpdate()
    } catch (error: unknown) {
      setMessage('승인 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async (userId: string) => {
    setLoading(userId)
    setMessage('')

    try {
      const { error } = await supabase
        .from('users')
        .update({
          pending_type: null
        })
        .eq('id', userId)

      if (error) throw error

      setMessage('승인이 거절되었습니다.')
      onUserUpdate()
    } catch (error: unknown) {
      setMessage('거절 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateDisplayOrder = async (userId: string, order: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_order: order
        })
        .eq('id', userId)

      if (error) throw error

      setMessage('노출 순서가 업데이트되었습니다.')
      onUserUpdate()
    } catch (error: unknown) {
      setMessage('노출 순서 업데이트 중 오류가 발생했습니다.')
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: '일반',
      dancer: '댄서',
      client: '클라이언트',
      manager: '매니저',
      admin: '관리자'
    }
    return labels[type] || type
  }

  if (showOrderManager) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowOrderManager(false)}
          >
            ← 대시보드로 돌아가기
          </Button>
          <h2 className="text-2xl font-bold">아티스트 순서 관리</h2>
        </div>
        <ArtistTeamOrderManager />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-md ${
          message.includes('성공') || message.includes('업데이트')
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* 승인 대기 사용자들 */}
      <Card>
        <CardHeader>
          <CardTitle>승인 대기 사용자</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-600">승인 대기 중인 사용자가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-zinc-600">{user.email}</p>
                    <p className="text-sm text-zinc-600">{user.name_en}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        {getTypeLabel(user.type)}
                      </Badge>
                      <Badge variant="secondary">
                        {user.pending_type === 'dancer' ? '댄서' : '클라이언트'} 승인 요청
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(user.id, user.pending_type!)}
                      disabled={loading === user.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      승인
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(user.id)}
                      disabled={loading === user.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      거절
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 아티스트 순서 관리 */}
      <Card>
        <CardHeader>
          <CardTitle>아티스트 순서 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-600">
                드래그 앤 드롭으로 아티스트 순서를 변경할 수 있습니다.
              </p>
              <Button
                onClick={() => setShowOrderManager(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                순서 관리하기
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            
            {/* 간단한 순서 미리보기 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allUsers
                .filter(user => user.type === 'dancer')
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .slice(0, 6)
                .map((user, index) => (
                  <div key={user.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {user.display_order || index + 1}
                      </Badge>
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <p className="text-sm text-zinc-600 mt-1">{user.name_en}</p>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기존 수동 순서 관리 (간소화) */}
      <Card>
        <CardHeader>
          <CardTitle>수동 순서 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allUsers
              .filter(user => user.type === 'dancer')
              .map((user) => (
                <div key={user.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-zinc-600">{user.name_en}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">댄서</Badge>
                      {user.display_order && (
                        <Badge variant="secondary">
                          순서: {user.display_order}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="순서"
                      value={displayOrder[user.id] || user.display_order || ''}
                      onChange={(e) => setDisplayOrder(prev => ({
                        ...prev,
                        [user.id]: parseInt(e.target.value) || 0
                      }))}
                      className="w-20"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateDisplayOrder(user.id, displayOrder[user.id] || 0)}
                    >
                      업데이트
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 통계 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-zinc-900">
              {allUsers.filter(u => u.type === 'dancer').length}
            </div>
            <p className="text-zinc-600">전체 댄서</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-zinc-900">
              {allUsers.filter(u => u.type === 'client').length}
            </div>
            <p className="text-zinc-600">전체 클라이언트</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-zinc-900">
              {allUsers.filter(u => u.type === 'general').length}
            </div>
            <p className="text-zinc-600">일반 회원</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 