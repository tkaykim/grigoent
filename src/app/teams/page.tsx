'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Team } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoginStatus } from '@/components/auth/LoginStatus'
import { Users, Plus, Search } from 'lucide-react'
import Link from 'next/link'

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          leader:users!teams_leader_id_fkey(id, name, name_en, profile_image),
          member_count:team_members(count)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('팀 목록 로드 오류:', error)
        setError('팀 목록을 불러오는 중 오류가 발생했습니다.')
        
        // 재시도 로직
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
            fetchTeams()
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
      const teamsWithMemberCount = data?.map(team => ({
        ...team,
        member_count: team.member_count?.[0]?.count || 0
      })) || []

      setTeams(teamsWithMemberCount)
    } catch (error) {
      console.error('팀 목록 로드 오류:', error)
      setError('팀 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 검색 필터링
  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 mx-auto mb-4"></div>
              <p className="text-zinc-600">팀 목록을 불러오는 중...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 mb-2">팀 목록</h1>
              <p className="text-zinc-600">댄스 팀들을 탐색하고 협업하세요</p>
            </div>
            <div className="flex gap-2">
              <Link href="/teams/create">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  팀 생성
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 검색 바 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
            <input
              type="text"
              placeholder="팀 이름이나 설명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 팀 목록 */}
        {filteredTeams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-2">
              {searchTerm ? '검색 결과가 없습니다' : '아직 팀이 없습니다'}
            </h3>
            <p className="text-zinc-600 mb-4">
              {searchTerm 
                ? '다른 검색어를 시도해보세요' 
                : '첫 번째 팀을 만들어보세요!'
              }
            </p>
            {!searchTerm && (
              <Link href="/teams/create">
                <Button>팀 생성하기</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={team.logo_url} alt={team.name} />
                        <AvatarFallback className="bg-zinc-100 text-zinc-900">
                          {team.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <p className="text-sm text-zinc-500">{team.name_en}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {team.member_count}명
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {team.description && (
                    <p className="text-zinc-600 text-sm mb-4 line-clamp-2">
                      {team.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={team.leader?.profile_image} alt={team.leader?.name} />
                        <AvatarFallback className="text-xs bg-zinc-100">
                          {team.leader?.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-zinc-500">
                        리더: {team.leader?.name}
                      </span>
                    </div>
                    <Link href={`/teams/${team.slug}`}>
                      <Button variant="outline" size="sm">
                        상세보기
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
} 