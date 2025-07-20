'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { User } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function AdminPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
      return
    }

    if (profile?.type !== 'admin') {
      router.push('/')
      return
    }

    fetchPendingUsers()
    fetchAllUsers()
  }, [user, loading, profile, router])

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .not('pending_type', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('대기중인 사용자 로드 오류:', error)
        return
      }

      setPendingUsers(data || [])
    } catch (error) {
      console.error('대기중인 사용자 로드 오류:', error)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('사용자 목록 로드 오류:', error)
        return
      }

      setAllUsers(data || [])
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error)
    }
  }

  const handleApproval = async (userId: string, approved: boolean) => {
    setProcessing(userId)
    
    try {
      const user = pendingUsers.find(u => u.id === userId)
      if (!user) return

      if (approved) {
        // 승인: pending_type을 type으로 설정하고 pending_type을 null로
        const { error } = await supabase
          .from('users')
          .update({
            type: user.pending_type,
            pending_type: null,
          })
          .eq('id', userId)

        if (error) {
          console.error('승인 오류:', error)
          toast.error('승인 처리 중 오류가 발생했습니다.')
          return
        }

        toast.success(`${user.name}님의 ${getTypeLabel(user.pending_type!)} 권한이 승인되었습니다.`)
      } else {
        // 거절: pending_type만 null로
        const { error } = await supabase
          .from('users')
          .update({
            pending_type: null,
          })
          .eq('id', userId)

        if (error) {
          console.error('거절 오류:', error)
          toast.error('거절 처리 중 오류가 발생했습니다.')
          return
        }

        toast.success(`${user.name}님의 권한 신청이 거절되었습니다.`)
      }

      // 목록 새로고침
      await fetchPendingUsers()
      await fetchAllUsers()
    } catch (error) {
      console.error('권한 처리 오류:', error)
      toast.error('처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: '일반 회원',
      dancer: '댄서',
      client: '클라이언트',
      manager: '매니저',
      admin: '관리자'
    }
    return labels[type] || type
  }

  const getStatusBadge = (user: User) => {
    if (user.pending_type) {
      return <Badge variant="secondary">{getTypeLabel(user.pending_type)} 승인 대기중</Badge>
    }
    return <Badge variant="default">{getTypeLabel(user.type)}</Badge>
  }

  if (loading) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-zinc-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="animate-pulse">
              <div className="h-8 bg-zinc-200 rounded mb-4" />
              <div className="h-4 bg-zinc-200 rounded w-1/2" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user || profile?.type !== 'admin') {
    return null
  }

  return (
    <div>
      <Header />
      <main className="pt-16 min-h-screen bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">관리자 대시보드</h1>
            <p className="text-zinc-600">사용자 권한 관리 및 승인</p>
          </div>

          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                승인 대기 ({pendingUsers.length})
              </TabsTrigger>
              <TabsTrigger value="users">
                전체 사용자 ({allUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>승인 대기중인 사용자</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-zinc-600">승인 대기중인 사용자가 없습니다.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>이름</TableHead>
                          <TableHead>이메일</TableHead>
                          <TableHead>신청 권한</TableHead>
                          <TableHead>가입일</TableHead>
                          <TableHead>작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-zinc-500">{user.name_en}</div>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {getTypeLabel(user.pending_type!)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(user.created_at).toLocaleDateString('ko-KR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproval(user.id, true)}
                                  disabled={processing === user.id}
                                >
                                  {processing === user.id ? '처리중...' : '승인'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproval(user.id, false)}
                                  disabled={processing === user.id}
                                >
                                  {processing === user.id ? '처리중...' : '거절'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>전체 사용자 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>권한</TableHead>
                        <TableHead>가입일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-zinc-500">{user.name_en}</div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{getStatusBadge(user)}</TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('ko-KR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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