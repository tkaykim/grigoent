"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Team, TeamMember } from "@/lib/types";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Crown, Calendar } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function TeamDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // 아티스트 자동완성 검색
  useEffect(() => {
    if (!inviteModalOpen || !inviteInput.trim()) {
      setSearchResults([]);
      return;
    }
    let ignore = false;
    setSearchLoading(true);
    fetch(`/api/users?type=dancer&search=${encodeURIComponent(inviteInput.trim())}`)
      .then(res => res.json())
      .then(data => {
        if (!ignore) setSearchResults(data.filter((u: any) => u.name.includes(inviteInput) || u.name_en?.includes(inviteInput)));
      })
      .catch(() => setSearchResults([]))
      .finally(() => { if (!ignore) setSearchLoading(false); });
    return () => { ignore = true; };
  }, [inviteInput, inviteModalOpen]);

  useEffect(() => {
    fetchTeamData();
    // eslint-disable-next-line
  }, [slug]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError("");

      // 팀 정보 가져오기
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select(`
          *,
          leader:users!teams_leader_id_fkey(id, name, name_en, profile_image),
          member_count:team_members(count)
        `)
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      if (teamError) {
        setError("팀을 찾을 수 없습니다.");
        // 재시도 로직
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            fetchTeamData();
          }, 1000);
        } else if (retryCount === maxRetries) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
        return;
      }

      // member_count를 숫자로 변환
      const teamWithMemberCount = {
        ...teamData,
        member_count: teamData.member_count?.[0]?.count || 0,
      };

      setTeam(teamWithMemberCount);

      // 팀 멤버 정보 가져오기
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select(`
          *,
          user:users(id, name, name_en, profile_image, type)
        `)
        .eq("team_id", teamData.id)
        .order("joined_at", { ascending: true });

      if (!membersError) {
        setMembers(membersData || []);
      }
    } catch (error) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isLeader = user && team && team.leader && user.id === team.leader.id;

  // 팀 멤버 추가
  const handleInvite = async () => {
    setInviteError('');
    if (!inviteInput.trim() || !team) return;
    let userId = selectedUser?.id;
    let inviteName = inviteInput.trim();
    // 등록된 유저가 아니면, 임시로 이메일/이름을 user_id로 사용 (실제 서비스에서는 별도 처리 필요)
    if (!userId) {
      userId = inviteName;
    }
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, role: 'member' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '초대 실패');
      toast.success('팀원 초대 완료!');
      setInviteModalOpen(false);
      setInviteInput('');
      setSelectedUser(null);
      setSearchResults([]);
      fetchTeamData();
    } catch (e: any) {
      setInviteError(e.message || '초대 실패');
    }
  };

  // 팀 멤버 삭제
  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;
    if (!window.confirm('정말로 이 멤버를 팀에서 삭제하시겠습니까?')) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제 실패');
      toast.success('팀원 삭제 완료!');
      fetchTeamData();
    } catch (e: any) {
      toast.error(e.message || '삭제 실패');
    }
  };

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
    );
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
    );
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
                  {team.description && <p className="text-zinc-700 mb-4">{team.description}</p>}
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{team.member_count}명</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(team.created_at).toLocaleDateString("ko-KR")} 생성</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isLeader && (
                    <>
                      <Button variant="default" onClick={() => setInviteModalOpen(true)}>
                        팀원 초대하기
                      </Button>
                      <Button variant="outline" className="ml-2">팀 정보 수정</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 탭 컨텐츠 */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="projects">프로젝트</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>팀 소개</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-700">{team.description || "팀 소개가 없습니다."}</p>
              </CardContent>
            </Card>
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
                            <p className="font-medium">{member.user?.name || member.user_id}</p>
                            <p className="text-sm text-zinc-500">{member.user?.name_en}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role === "leader" && (
                            <Badge variant="default">
                              <Crown className="w-3 h-3 mr-1" />리더
                            </Badge>
                          )}
                          {member.role !== "leader" && <Badge variant="secondary">멤버</Badge>}
                          <span className="text-xs text-zinc-400">{new Date(member.joined_at).toLocaleDateString("ko-KR")}</span>
                         {/* 리더만 삭제 가능, 리더 자신은 삭제 불가 */}
                         {isLeader && member.role !== 'leader' && (
                           <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(member.user_id)}>
                             삭제
                           </Button>
                         )}
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
                <p className="text-zinc-500 text-center py-8">프로젝트 기능은 준비 중입니다.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* 팀원 초대 모달 (구현 예정) */}
        {inviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw] w-full sm:w-[400px]">
              <h2 className="text-xl font-bold mb-4">팀원 초대하기</h2>
              <div className="mb-4">
                <Input
                  placeholder="아티스트 이름, 영어이름 또는 이메일 입력..."
                  value={inviteInput}
                  onChange={e => {
                    setInviteInput(e.target.value);
                    setSelectedUser(null);
                    setInviteError('');
                  }}
                  className="mb-2"
                  autoFocus
                />
                {/* 자동완성 리스트 */}
                {searchLoading && <div className="text-xs text-zinc-500">검색 중...</div>}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="border rounded bg-zinc-50 max-h-40 overflow-y-auto shadow-sm">
                    {searchResults.map(user => (
                      <div
                        key={user.id}
                        className={`px-3 py-2 cursor-pointer hover:bg-zinc-100 ${selectedUser?.id === user.id ? 'bg-zinc-200' : ''}`}
                        onClick={() => { setSelectedUser(user); setInviteInput(user.name); setInviteError(''); }}
                      >
                        <span className="font-semibold">{user.name}</span>
                        {user.name_en && <span className="ml-2 text-xs text-zinc-500">{user.name_en}</span>}
                        <span className="ml-2 text-xs text-zinc-400">{user.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* 직접입력 안내 */}
                {inviteInput && searchResults.length === 0 && !searchLoading && (
                  <div className="text-xs text-zinc-400 mt-2">등록되지 않은 계정은 입력한 정보로 초대됩니다.</div>
                )}
              </div>
              {inviteError && <div className="text-red-500 text-sm mb-2">{inviteError}</div>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInviteModalOpen(false)}>닫기</Button>
                <Button
                  variant="default"
                  disabled={!inviteInput.trim()}
                  onClick={handleInvite}
                >
                  초대
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
} 