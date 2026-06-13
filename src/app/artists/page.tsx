'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Team, TeamMember } from '@/lib/types'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArtistSearch } from '@/components/artists/ArtistSearch'
import Link from 'next/link'
import { TeamCard } from '@/components/artists/TeamCard'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { ArtistTeamOrderManager } from '@/components/artists/ArtistTeamOrderManager'

export default function ArtistsPage() {
  const { profile } = useAuth()
  const [allArtists, setAllArtists] = useState<User[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [orderedItems, setOrderedItems] = useState<Array<{type: 'artist' | 'team', data: User | Team}>>([])
  const [artistTeamsMap, setArtistTeamsMap] = useState<Record<string, { name: string; name_en: string }[]>>({})
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [tab, setTab] = useState<'all' | 'artist' | 'team' | 'order'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line
  }, [])

  // 4개 쿼리를 1회 병렬 왕복으로 — 기존 3단계 순차(순서표 → 유저·팀 → 팀멤버) 대비 모바일 체감 개선 (2026-06-13)
  const fetchAll = async () => {
    setLoading(true)
    setRetryCount(0)
    try {
      const [orderRes, artistsRes, teamsRes, membersRes] = await Promise.all([
        supabase
          .from('display_order_items')
          .select('*')
          .order('display_order', { ascending: true }),
        supabase
          .from('users')
          .select('*')
          .eq('type', 'dancer')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('teams')
          .select('*')
          .eq('status', 'active')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('team_members')
          .select('user_id, team:teams!inner(id, name, name_en, status)')
          .eq('team.status', 'active') as unknown as Promise<{ data: any[] }>,
      ])

      const artists = (artistsRes as any).data ?? []
      const teams = (teamsRes as any).data ?? []
      const orderItems = (orderRes as any).error ? [] : ((orderRes as any).data ?? [])
      const members = (membersRes as any).data ?? []

      // 아티스트별 소속팀 맵
      const artistTeamsMap: Record<string, { name: string; name_en: string }[]> = {}
      for (const m of members) {
        if (!artistTeamsMap[m.user_id]) artistTeamsMap[m.user_id] = []
        if (Array.isArray(m.team)) {
          artistTeamsMap[m.user_id].push(...(m.team.map((t: any) => ({ name: t.name, name_en: t.name_en })) as { name: string; name_en: string }[]))
        } else if (m.team) {
          artistTeamsMap[m.user_id].push({ name: m.team.name, name_en: m.team.name_en } as { name: string; name_en: string })
        }
      }

      if (orderItems.length > 0) {
        // 순서 테이블 기준 정렬
        const orderedArtists: User[] = []
        const orderedTeams: Team[] = []
        const ordered: Array<{type: 'artist' | 'team', data: User | Team}> = []
        orderItems.forEach((orderItem: any) => {
          if (orderItem.item_type === 'artist') {
            const artist = artists.find((a: User) => a.id === orderItem.item_id)
            if (artist) {
              orderedArtists.push(artist)
              ordered.push({ type: 'artist', data: artist })
            }
          } else if (orderItem.item_type === 'team') {
            const team = teams.find((t: Team) => t.id === orderItem.item_id)
            if (team) {
              orderedTeams.push(team)
              ordered.push({ type: 'team', data: team })
            }
          }
        })
        setAllArtists(orderedArtists)
        setAllTeams(orderedTeams)
        setOrderedItems(ordered)
      } else {
        // 순서 테이블이 없거나 비었으면 기본 정렬 그대로
        setAllArtists(artists)
        setAllTeams(teams)
        setOrderedItems([])
      }
      setArtistTeamsMap(artistTeamsMap)
    } catch (e) {
      console.error('아티스트 목록 로드 오류:', e)
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  // 검색/필터
  const filteredArtists = allArtists.filter(artist => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      artist.name.toLowerCase().includes(q) ||
      artist.name_en.toLowerCase().includes(q) ||
      (artist.introduction && artist.introduction.toLowerCase().includes(q))
    )
  })
  const filteredTeams = allTeams.filter(team => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      team.name.toLowerCase().includes(q) ||
      team.name_en.toLowerCase().includes(q) ||
      (team.description && team.description.toLowerCase().includes(q))
    )
  })

  // 통합 순서 아이템 필터링
  const filteredOrderedItems = orderedItems.filter(item => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    
    if (item.type === 'artist') {
      const artist = item.data as User
      return (
        artist.name.toLowerCase().includes(q) ||
        artist.name_en.toLowerCase().includes(q) ||
        (artist.introduction && artist.introduction.toLowerCase().includes(q))
      )
    } else {
      const team = item.data as Team
      return (
        team.name.toLowerCase().includes(q) ||
        team.name_en.toLowerCase().includes(q) ||
        (team.description && team.description.toLowerCase().includes(q))
      )
    }
  })

  // 관리자용 순서 관리 탭 표시 여부
  const isAdmin = profile?.type === 'admin'

  if (loading) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Our Artists
              </h1>
              <p className="text-xl text-white/60">
                최고의 댄서들과 팀을 만나보세요
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-4 md:p-6 animate-pulse">
                  <div className="w-full h-48 md:h-56 bg-white/10 rounded-lg mb-4"></div>
                  <div className="h-4 bg-white/10 rounded mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-2/3"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2 mt-2"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // 순서 관리 탭이 선택된 경우
  if (tab === 'order') {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-white">
          <ArtistTeamOrderManager />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div>
      <Header />
              <main className="pt-16 min-h-screen bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Our Artists
              </h1>
              <p className="text-xl text-white/60">
              최고의 댄서들과 팀을 만나보세요
              </p>
          </div>

          {/* 탭/필터 */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Tabs value={tab} onValueChange={v => setTab(v as any)}>
                <TabsList className="bg-white/10 border-white/20">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-transparent data-[state=inactive]:text-white/60"
                  >
                    전체
                  </TabsTrigger>
                  <TabsTrigger
                    value="artist"
                    className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-transparent data-[state=inactive]:text-white/60"
                  >
                    개인
                  </TabsTrigger>
                  <TabsTrigger
                    value="team"
                    className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-transparent data-[state=inactive]:text-white/60"
                  >
                    팀
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger
                      value="order"
                      className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-transparent data-[state=inactive]:text-white/60"
                    >
                      순서 관리
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
              {profile?.type === 'admin' && (
                <Link href="/teams/create">
                  <Button className="ml-2 bg-white text-black rounded-lg font-semibold hover:bg-zinc-100 border border-white/30 shadow-sm transition-all">팀 생성</Button>
                </Link>
              )}
            </div>
            <input
              type="text"
              placeholder="이름, 설명 등으로 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full md:w-64 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>

          {/* 리스트 */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6">
            {/* 전체 탭: 통합 순서 사용 */}
            {tab === 'all' && filteredOrderedItems.map((item, index) => (
              <div key={`${item.type}-${item.data.id}`} className="group bg-white/5 rounded-lg p-4 md:p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                <Link href={item.type === 'artist' ? `/${(item.data as User).slug}` : `/teams/${(item.data as Team).slug}`} className="block">
                  <div className="relative mb-4">
                    {item.type === 'artist' ? (
                      // 아티스트 카드
                      <>
                        {(item.data as User).profile_image ? (
                          <img
                            src={(item.data as User).profile_image}
                            alt={(item.data as User).name}
                            className="w-full h-48 md:h-56 object-cover object-top rounded-lg"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-48 md:h-56 bg-white/10 rounded-lg flex items-center justify-center">
                            <span className="text-white/40 text-2xl">🎭</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 rounded-lg"></div>
                      </>
                    ) : (
                      // 팀 카드
                      <>
                        {(item.data as Team).logo_url ? (
                          <img
                            src={(item.data as Team).logo_url}
                            alt={(item.data as Team).name}
                            className="w-full h-48 md:h-56 object-cover object-top rounded-lg"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-48 md:h-56 bg-white/10 rounded-lg flex items-center justify-center">
                            <span className="text-white/40 text-2xl">👥</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 rounded-lg"></div>
                      </>
                    )}
                  </div>
                  
                  <h3 className="text-lg md:text-xl font-bold mb-2 text-white group-hover:text-white/80 transition-colors">
                    {item.type === 'artist' ? (item.data as User).name : (item.data as Team).name}
                  </h3>
                  
                  {item.type === 'artist' ? (
                    // 아티스트 정보
                    <>
                      {(item.data as User).name_en && (
                        <p className="text-sm md:text-base text-white/60 mb-2">
                          {(item.data as User).name_en}
                        </p>
                      )}
                      {(item.data as User).introduction && (
                        <p className="text-sm text-white/80 line-clamp-2">
                          {(item.data as User).introduction}
                        </p>
                      )}
                      {/* 소속팀 간소화 표시 */}
                      {artistTeamsMap[(item.data as User).id] && artistTeamsMap[(item.data as User).id].length > 0 && (
                        <p className="text-xs text-white/60 mt-2">
                          <span className="font-medium">소속팀:</span> {artistTeamsMap[(item.data as User).id].map(t => `${t.name} (${t.name_en})`).join(', ')}
                        </p>
                      )}
                    </>
                  ) : (
                    // 팀 정보
                    <>
                      {(item.data as Team).name_en && (
                        <p className="text-sm md:text-base text-white/60 mb-2">
                          {(item.data as Team).name_en}
                        </p>
                      )}
                      {(item.data as Team).description && (
                        <p className="text-sm text-white/80 line-clamp-2">
                          {(item.data as Team).description}
                        </p>
                      )}
                    </>
                  )}
                </Link>
              </div>
            ))}
            
            {/* 개인 탭: 기존 아티스트 표시 */}
            {tab === 'artist' && filteredArtists.map(artist => (
              <div key={artist.id} className="group bg-white/5 rounded-lg p-4 md:p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                <Link href={`/${artist.slug}`} className="block">
                  <div className="relative mb-4">
                    {artist.profile_image ? (
                      <img
                        src={artist.profile_image}
                        alt={artist.name}
                        className="w-full h-48 md:h-56 object-cover object-top rounded-lg"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 md:h-56 bg-white/10 rounded-lg flex items-center justify-center">
                        <span className="text-white/40 text-2xl">🎭</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 rounded-lg"></div>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 text-white group-hover:text-white/80 transition-colors">
                    {artist.name}
                  </h3>
                  {artist.name_en && (
                    <p className="text-sm md:text-base text-white/60 mb-2">
                      {artist.name_en}
                    </p>
                  )}
                  {artist.introduction && (
                    <p className="text-sm text-white/80 line-clamp-2">
                      {artist.introduction}
                    </p>
                  )}
                  {/* 소속팀 간소화 표시 */}
                  {artistTeamsMap[artist.id] && artistTeamsMap[artist.id].length > 0 && (
                    <p className="text-xs text-white/60 mt-2">
                      <span className="font-medium">소속팀:</span> {artistTeamsMap[artist.id].map(t => `${t.name} (${t.name_en})`).join(', ')}
                    </p>
                  )}
                </Link>
              </div>
            ))}
            
            {/* 팀 탭: 기존 팀 표시 */}
            {(tab === 'team') && filteredTeams.map(team => (
              <TeamCard key={team.id} team={team} members={[]} />
            ))}
          </div>

          {/* 결과 없음 */}
          {tab === 'artist' && filteredArtists.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/60 text-lg">등록된 댄서가 없습니다.</p>
            </div>
          )}
          {tab === 'team' && filteredTeams.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/60 text-lg">등록된 팀이 없습니다.</p>
            </div>
          )}
          {tab === 'all' && filteredOrderedItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/60 text-lg">등록된 아티스트와 팀이 없습니다.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
} 