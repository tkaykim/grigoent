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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Crown, Calendar } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from '@/components/ui/input';
import { ProfileImageUpload } from '@/components/ui/profile-image-upload';
import { toast } from 'sonner';
import { useRef } from 'react';
import { X as CloseIcon } from 'lucide-react';

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', name_en: '', description: '', logo_url: '' });
  const [editLoading, setEditLoading] = useState(false);
  // DB profile 상태
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    if (user?.id) {
      supabase.from('users').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data));
    }
  }, [user]);

  const isAdmin = profile?.type === 'admin';
  const isLeader = team && profile && team.leader_id === profile.id;

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

  useEffect(() => {
    if (team) setEditForm({ name: team.name, name_en: team.name_en, description: team.description || '', logo_url: team.logo_url || '' });
  }, [team]);

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

  // 여러 명 선택 상태
  const [inviteSelectedUsers, setInviteSelectedUsers] = useState<any[]>([]);

  // 팀 멤버 여러 명 추가 (선택된 inviteSelectedUsers 기준)
  const handleInvite = async () => {
    setInviteError('');
    if (!team || inviteSelectedUsers.length === 0) return;
    let successCount = 0;
    let failCount = 0;
    let lastError = '';
    for (const userObj of inviteSelectedUsers) {
      const userId = userObj.id || userObj.name || userObj.email;
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
        successCount++;
      } catch (e: any) {
        failCount++;
        lastError = e.message || '초대 실패';
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount}명 초대 완료!`);
      setInviteModalOpen(false);
      setInviteInput('');
      setSelectedUser(null);
      setSearchResults([]);
      setInviteSelectedUsers([]);
      fetchTeamData();
    }
    if (failCount > 0) {
      setInviteError(`${failCount}명 초대 실패: ${lastError}`);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const handleLogoUpload = async (imageUrl: string) => {
    setUploading(true);
    try {
      // Blob URL을 File로 변환
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      
      const fileExt = 'jpg';
      const fileName = `${team?.id || 'team-logo'}-${Date.now()}.${fileExt}`;
      const filePath = fileName;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      setEditForm(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('이미지가 성공적으로 업로드되었습니다.');
    } catch (error) {
      const err = error as any;
      toast.error('이미지 업로드 실패: ' + (err.message || err));
    } finally {
      setUploading(false);
    }
  };
  const removeLogo = () => {
    setEditForm(prev => ({ ...prev, logo_url: '' }));
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
            <div className="h-24 w-24 border border-zinc-200 rounded-lg overflow-hidden">
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
                  <span className="text-zinc-600 text-2xl font-medium">
                    {team.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
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
                  {(isLeader || isAdmin) && (
                    <>
                      <Button variant="default" onClick={() => setInviteModalOpen(true)}>
                        팀원 초대하기
                      </Button>
                      <Button variant="outline" className="ml-2" onClick={() => setEditModalOpen(true)}>팀 정보 수정</Button>
                      <Button variant="destructive" className="ml-2" onClick={async () => {
                        if (window.confirm('정말 팀을 삭제하시겠습니까? 복구할 수 없습니다.')) {
                          await supabase.from('teams').delete().eq('id', team.id);
                          toast.success('팀이 삭제되었습니다.');
                          window.location.href = '/teams';
                        }
                      }}>팀 삭제</Button>
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
                          <div className="h-10 w-10 border border-zinc-200 rounded-lg overflow-hidden">
                            {member.user?.profile_image ? (
                              <img
                                src={member.user.profile_image}
                                alt={member.user.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
                                <span className="text-zinc-600 text-sm font-medium">
                                  {member.user?.name?.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
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
                          {/* 관리자/리더: 멤버 삭제, 역할변경, 리더 임명 */}
                          {(isLeader || isAdmin) && member.role !== 'leader' && (
                            <>
                              <Button size="sm" variant="outline" onClick={async () => {
                                // 역할변경: 멤버 <-> 리더
                                if (!team) return;
                                if (!window.confirm('이 멤버를 리더로 임명하시겠습니까? (기존 리더는 멤버로 변경)')) return;
                                // 1. 기존 리더를 멤버로 변경
                                const leaderMember = members.find(m => m.role === 'leader');
                                if (leaderMember) {
                                  await supabase.from('team_members').update({ role: 'member' }).eq('id', leaderMember.id);
                                }
                                // 2. 선택 멤버를 리더로 변경
                                await supabase.from('team_members').update({ role: 'leader' }).eq('id', member.id);
                                // 3. teams 테이블의 leader_id도 변경
                                await supabase.from('teams').update({ leader_id: member.user_id }).eq('id', team.id);
                                toast.success('리더가 변경되었습니다.');
                                fetchTeamData();
                              }}>리더 임명</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(member.user_id)}>
                                삭제
                              </Button>
                            </>
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
                    {searchResults.map(user => {
                      const alreadySelected = inviteSelectedUsers.some(u => u.id === user.id);
                      return (
                        <div
                          key={user.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-zinc-100 flex items-center justify-between ${alreadySelected ? 'bg-green-100' : ''}`}
                          onClick={() => {
                            if (!alreadySelected) setInviteSelectedUsers(prev => [...prev, user]);
                          }}
                        >
                          <div>
                            <span className="font-semibold">{user.name}</span>
                            {user.name_en && <span className="ml-2 text-xs text-zinc-500">{user.name_en}</span>}
                            <span className="ml-2 text-xs text-zinc-400">{user.email}</span>
                          </div>
                          {alreadySelected && <span className="text-green-600 font-bold ml-2">✔</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* 직접입력 안내 */}
                {inviteInput && searchResults.length === 0 && !searchLoading && (
                  <div className="text-xs text-zinc-400 mt-2">등록되지 않은 계정은 입력한 정보로 초대됩니다. (직접 입력 후 아래 + 버튼 클릭)</div>
                )}
                {/* 직접 입력 추가 버튼 */}
                {inviteInput && (
                  <Button size="sm" className="mt-2" onClick={() => {
                    // 쉼표, 세미콜론, 줄바꿈 등으로 여러 명 분리
                    const rawList = inviteInput.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
                    for (const name of rawList) {
                      if (!inviteSelectedUsers.some(u => u.name === name)) {
                        setInviteSelectedUsers(prev => [...prev, { name }]);
                      }
                    }
                    setInviteInput('');
                  }}>+ 추가</Button>
                )}
                {/* 선택된 유저 리스트 */}
                {inviteSelectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {inviteSelectedUsers.map((u, idx) => (
                      <div key={u.id || u.name || idx} className="flex items-center bg-green-50 border border-green-200 rounded px-2 py-1 text-sm">
                        <span>{u.name || u.email || u.id}</span>
                        <button className="ml-1 text-red-500" onClick={() => setInviteSelectedUsers(prev => prev.filter(x => x !== u))}>×</button>
                      </div>
                    ))}
                  </div>
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
      {/* 팀 정보 수정 모달 */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw] w-full sm:w-[400px]">
            <h2 className="text-xl font-bold mb-4">팀 정보 수정</h2>
            <div className="space-y-3">
              <label className="font-medium">로고 이미지</label>
                             <ProfileImageUpload
                 currentImage={editForm.logo_url}
                 onImageChange={handleLogoUpload}
                 onImageRemove={removeLogo}
                 size="sm"
                 cropShape="square"
                 disabled={editLoading}
                 uploading={uploading}
               />
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="팀명" />
              <Input value={editForm.name_en} onChange={e => setEditForm(f => ({ ...f, name_en: e.target.value }))} placeholder="영문팀명" />
              <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="설명" />
              <Input value={editForm.logo_url} onChange={e => setEditForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="로고 이미지 URL" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>닫기</Button>
              <Button variant="default" disabled={editLoading} onClick={async () => {
                setEditLoading(true);
                await supabase.from('teams').update({
                  name: editForm.name,
                  name_en: editForm.name_en,
                  description: editForm.description,
                  logo_url: editForm.logo_url
                }).eq('id', team.id);
                setEditLoading(false);
                setEditModalOpen(false);
                toast.success('팀 정보가 수정되었습니다.');
                fetchTeamData();
              }}>{editLoading ? '저장 중...' : '저장'}</Button>
            </div>
          </div>
        </div>
      )}
      </main>
      <Footer />
    </div>
  );
} 