'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Team, TeamMember } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Users, Crown, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function TeamDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  useEffect(() => {
    fetchTeamData()
  }, [slug])

  const fetchTeamData = async () => {
    try {
      setLoading(true)
      setError('')

      // 팀 정보 가져오기
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          leader:users!teams_leader_id_fkey(id, name, name_en, profile_image),
          member_count:team_members(count)
        `)
        .eq('slug', slug)
        .eq('status', 'active')
        .single()

      if (teamError) {
        console.error('팀 데이터 로드 오류:', teamError)
        setError('팀을 찾을 수 없습니다.')
        
        // 재시도 로직
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
            fetchTeamData()
          }, 1000)
        } else if (retryCount === maxRetries) {
          // 마지막 재시도 후 1초 후 강제 새로고침
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
        return
      }

      // member_count를 숫자로 변환
      const teamWithMemberCount = {
        ...teamData,
        member_count: teamData.member_count?.[0]?.count || 0
      }

      setTeam(teamWithMemberCount)

      // 팀 멤버 정보 가져오기
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          user:users(id, name, name_en, profile_image, type)
        `)
        .eq('team_id', teamData.id)
        .order('joined_at', { ascending: true })

      if (!membersError) {
        setMembers(membersData || [])
      }

    } catch (error) {
      console.error('팀 데이터 로드 오류:', error)
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'leader':
        return '리더'
      case 'member':
        return '멤버'
      case 'invited':
        return '초대됨'
      default:
        return role
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'leader':
        return 'default'
      case 'member':
        return 'secondary'
      case 'invited':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 mx-auto mb-4"></div>
              <p className="text-zinc-600">팀 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-zinc-900 mb-4">팀을 찾을 수 없습니다</h1>
            <p className="text-zinc-600 mb-6">{error}</p>
            <Link href="/teams">
              <Button>팀 목록으로 돌아가기</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* 헤더 */}
        <div className="mb-8">
          <Link href="/teams" className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4">
            <ArrowLeft className="h-4 w-4" />
            팀 목록으로 돌아가기
          </Link>
        </div>

        {/* 팀 헤더 */}
        <div className="bg-white rounded-lg shadow-sm border border-zinc-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* 팀 로고 */}
            <Avatar className="h-24 w-24">
              <AvatarImage src={team.logo_url} alt={team.name} />
              <AvatarFallback className="bg-zinc-100 text-zinc-900 text-2xl">
                {team.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* 팀 정보 */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900 mb-2">{team.name}</h1>
                  <p className="text-lg text-zinc-600 mb-2">{team.name_en}</p>
                  {team.description && (
                    <p className="text-zinc-700 mb-4">{team.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{team.member_count}명</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(team.created_at).toLocaleDateString('ko-KR')} 생성</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline">팀 참여하기</Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="members">멤버</TabsTrigger>
            <TabsTrigger value="projects">프로젝트</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>팀 소개</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-700">
                  {team.description || '팀 소개가 없습니다.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>팀 리더</CardTitle>
              </CardHeader>
              <CardContent>
                {team.leader ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={team.leader.profile_image} alt={team.leader.name} />
                      <AvatarFallback>{team.leader.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{team.leader.name}</p>
                      <p className="text-sm text-zinc-500">{team.leader.name_en}</p>
                    </div>
                    <Badge variant="default" className="ml-auto">
                      <Crown className="w-3 h-3 mr-1" />
                      리더
                    </Badge>
                  </div>
                ) : (
                  <p className="text-zinc-500">리더 정보가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>팀 멤버 ({members.length}명)</CardTitle>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">멤버가 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border border-zinc-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.user?.profile_image} alt={member.user?.name} />
                            <AvatarFallback>{member.user?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.user?.name}</p>
                            <p className="text-sm text-zinc-500">{member.user?.name_en}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role === 'leader' && <Crown className="w-3 h-3 mr-1" />}
                            {getRoleLabel(member.role)}
                          </Badge>
                          <span className="text-xs text-zinc-400">
                            {new Date(member.joined_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>팀 프로젝트</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-500 text-center py-8">
                  프로젝트 기능은 준비 중입니다.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  )
} 