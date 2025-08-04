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
import { TeamProposalButton } from '@/components/proposals/TeamProposalButton'

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

  // 대량 경력 등록 모달 상태
  const [bulkCareerModalOpen, setBulkCareerModalOpen] = useState(false);
  const [bulkCareerLoading, setBulkCareerLoading] = useState(false);
  const [csvData, setCsvData] = useState<string>('');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkError, setBulkError] = useState<string>('');

  // CSV 템플릿 다운로드
  const downloadCsvTemplate = () => {
    const csvContent = `멤버ID,멤버이름,제목,설명,카테고리,국가,일정유형,시작일,종료일,단일일자,영상URL,포스터URL,대표작
user_id,멤버이름,예시 안무,댄스 영상 제작,choreography,한국,range,2024-01-01,2024-01-31,,https://youtube.com/watch?v=example,https://example.com/poster.jpg,true
user_id,멤버이름,예시 공연,무대 공연,performance,미국,single,,,2024-02-01,https://youtube.com/watch?v=example2,https://example.com/poster2.jpg,false`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'team_career_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 카테고리 매핑 함수
  const mapCategoryToDbValue = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      '안무': 'choreography',
      '안무제작': 'choreography',
      'choreography': 'choreography',
      '공연': 'performance',
      '댄서참여': 'performance',
      'performance': 'performance',
      '광고': 'advertisement',
      '광고진행': 'advertisement',
      'advertisement': 'advertisement',
      '방송': 'tv',
      'TV프로그램': 'tv',
      'tv': 'tv',
      '워크샵': 'workshop',
      'workshop': 'workshop',
      '뮤직비디오': 'performance', // 뮤직비디오는 performance로 매핑
      'MV': 'performance',
      '음악방송': 'tv',
      '예능': 'tv'
    };
    
    return categoryMap[category] || 'performance'; // 기본값은 performance
  };

  // CSV 데이터 파싱
  const parseCsvData = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }
    
    return data;
  };

  // 대량 등록 미리보기
  const handleBulkPreview = () => {
    if (!csvData.trim()) {
      setBulkError('CSV 데이터를 입력해주세요.');
      return;
    }

    setBulkCareerLoading(true);
    try {
      const parsedData = parseCsvData(csvData);
      setBulkPreview(parsedData);
      setBulkError('');
    } catch (error) {
      setBulkError('CSV 파싱 오류: ' + error);
    } finally {
      setBulkCareerLoading(false);
    }
  };

  // 대량 경력 등록
  const handleBulkCareerSave = async () => {
    if (!team || bulkPreview.length === 0) return;
    
    setBulkCareerLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const item of bulkPreview) {
        try {
          // 멤버 ID로 사용자 찾기
          const memberId = item['멤버ID'];
          const member = members.find(m => m.user_id === memberId);
          
          if (!member) {
            console.error('멤버를 찾을 수 없습니다:', memberId);
            errorCount++;
            continue;
          }
          
          const careerData: any = {
            title: item['제목'],
            description: item['설명'],
            category: mapCategoryToDbValue(item['카테고리']),
            country: item['국가'],
            video_url: item['영상URL'],
            poster_url: item['포스터URL'],
            is_featured: item['대표작'] === 'true',
            user_id: member.user_id
          };
          
          // 일정 유형에 따른 처리
          if (item['일정유형'] === 'single') {
            careerData.date_type = 'single';
            careerData.single_date = item['단일일자'];
            careerData.start_date = null;
            careerData.end_date = null;
          } else {
            careerData.date_type = 'range';
            careerData.start_date = item['시작일'];
            careerData.end_date = item['종료일'];
            careerData.single_date = null;
          }
          
          console.log('저장할 경력 데이터:', careerData);
          
          const { error } = await supabase.from('career_entries').insert(careerData);
          if (error) {
            console.error('Supabase 오류:', error);
            throw error;
          }
          successCount++;
        } catch (error) {
          console.error('경력 등록 실패:', item, error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount}개의 경력이 성공적으로 등록되었습니다.`);
        if (errorCount > 0) {
          toast.error(`${errorCount}개의 경력 등록에 실패했습니다.`);
        }
        setBulkCareerModalOpen(false);
        setCsvData('');
        setBulkPreview([]);
      } else {
        toast.error('모든 경력 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('대량 등록 오류:', error);
      toast.error('대량 등록 중 오류가 발생했습니다.');
    } finally {
      setBulkCareerLoading(false);
    }
  };
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
        {/* 팀 헤더 - 배경 이미지가 꽉 찬 디자인 */}
        <div className="relative h-[60vh] min-h-[400px] rounded-lg overflow-hidden mb-8">
          {/* 배경 이미지 */}
          <div className="absolute inset-0">
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt={team.name}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <span className="text-white text-6xl font-bold opacity-20">
                  {team.name.charAt(0)}
                </span>
              </div>
            )}
            {/* 오버레이 */}
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
          
          {/* 콘텐츠 오버레이 */}
          <div className="relative z-10 h-full flex flex-col justify-between p-8">
            {/* 상단 정보 */}
            <div className="flex items-start justify-between">
              <div className="text-white">
                <h1 className="text-4xl md:text-5xl font-bold mb-2">{team.name}</h1>
                <p className="text-xl md:text-2xl text-zinc-200 mb-4">{team.name_en}</p>
                {team.description && (
                  <p className="text-lg text-zinc-300 max-w-2xl">{team.description}</p>
                )}
              </div>
              
              {/* 우측 버튼들 */}
              <div className="flex flex-col gap-2">
                <TeamProposalButton
                  teamId={team.id}
                  teamName={team.name}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                />
                
                {(isLeader || isAdmin) && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setInviteModalOpen(true)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      팀원 초대하기
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditModalOpen(true)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      팀 정보 수정
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={async () => {
                        if (window.confirm('정말 팀을 삭제하시겠습니까? 복구할 수 없습니다.')) {
                          await supabase.from('teams').delete().eq('id', team.id);
                          toast.success('팀이 삭제되었습니다.');
                          window.location.href = '/teams';
                        }
                      }}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-200 border-red-300/30"
                    >
                      팀 삭제
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* 하단 정보 */}
            <div className="flex items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="text-lg">{team.member_count}명</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="text-lg">{new Date(team.created_at).toLocaleDateString("ko-KR")} 생성</span>
              </div>
            </div>
          </div>
        </div>
        {/* 탭 컨텐츠 */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="careers">경력 관리</TabsTrigger>
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
          <TabsContent value="careers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>팀 멤버 경력 관리</CardTitle>
                  {(isLeader || isAdmin) && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setBulkCareerModalOpen(true)}>
                        대량 경력 등록
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-zinc-600 mb-4">
                    팀 멤버들의 경력을 대량으로 관리할 수 있습니다. CSV 파일을 통해 여러 멤버의 경력을 한 번에 등록할 수 있습니다.
                  </p>
                  
                  {/* 팀 멤버 목록 */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">팀 멤버 ({members.length}명)</h3>
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 border border-zinc-200 rounded-lg overflow-hidden">
                            {member.user?.profile_image ? (
                              <img
                                src={member.user.profile_image}
                                alt={member.user.name}
                                className="w-full h-full object-cover object-top"
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
      {/* 대량 경력 등록 모달 */}
      {bulkCareerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw] w-full sm:w-[400px]">
            <h2 className="text-xl font-bold mb-4">대량 경력 등록</h2>
            <div className="space-y-3">
              <label className="font-medium">CSV 파일 업로드</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setCsvData(event.target.result as string);
                      }
                    };
                    reader.readAsText(e.target.files[0]);
                  }
                }}
                className="block w-full text-sm text-zinc-900 border border-zinc-300 rounded-lg cursor-pointer bg-zinc-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-200 file:text-zinc-700 hover:file:bg-zinc-300"
              />
              <Button variant="outline" onClick={downloadCsvTemplate} className="w-full">CSV 템플릿 다운로드</Button>
              <textarea
                rows={10}
                value={csvData}
                onChange={e => setCsvData(e.target.value)}
                placeholder="CSV 형식으로 멤버별 경력 데이터를 입력해주세요."
                className="w-full p-2 border border-zinc-300 rounded-lg"
              />
              {bulkError && <div className="text-red-500 text-sm">{bulkError}</div>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBulkCareerModalOpen(false)}>닫기</Button>
                <Button variant="default" disabled={bulkCareerLoading} onClick={handleBulkPreview}>미리보기</Button>
                <Button variant="default" disabled={bulkCareerLoading || bulkPreview.length === 0} onClick={handleBulkCareerSave}>
                  {bulkCareerLoading ? '등록 중...' : '대량 등록'}
                </Button>
              </div>
            </div>
            {bulkPreview.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-lg font-semibold">미리보기</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50">
                      <tr>
                        {Object.keys(bulkPreview[0]).map(key => (
                          <th key={key} className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                      {bulkPreview.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, vIndex) => (
                            <td key={vIndex} className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </main>
      <Footer />
    </div>
  );
} 