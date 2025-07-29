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
import Papa from 'papaparse';
import { Tabs as UITabs, TabsList as UITabsList, TabsTrigger as UITabsTrigger, TabsContent as UITabsContent } from '@/components/ui/tabs';
import { SEOSettingsManager } from '@/components/dashboard/SEOSettingsManager';
import { AlertTriangle, Users, UserCheck, FileText, Link } from 'lucide-react'
import { ClaimRequestModal } from '@/components/proposals/ClaimRequestModal'
import { DirectLinkModal } from '@/components/proposals/DirectLinkModal'

export default function AdminPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [processing, setProcessing] = useState<string | null>(null)
  // 가상 댄서/팀 대량 등록 상태
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvUploadResult, setCsvUploadResult] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<any[] | null>(null);
  const [inputTab, setInputTab] = useState<'csv' | 'text'>('csv');
  const [textInput, setTextInput] = useState('');
  // 대시보드 통계 상태
  const [stats, setStats] = useState({ dancers: 0, teams: 0, careers: 0, projects: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  // 검색/필터/정렬 상태
  const [userSearch, setUserSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [userSort, setUserSort] = useState<'created_at'|'name'>('created_at');
  const [userSortDir, setUserSortDir] = useState<'asc'|'desc'>('desc');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  // 직접 연동 기능 상태
  const [isDirectLinkModalOpen, setIsDirectLinkModalOpen] = useState(false);
  const [selectedUserForLink, setSelectedUserForLink] = useState<User | null>(null);
  const handleSelectUser = (id: string, checked: boolean) => {
    setSelectedUserIds(prev => checked ? [...prev, id] : prev.filter(uid => uid !== id));
  };
  const handleSelectAll = (checked: boolean, users: any[]) => {
    setSelectedUserIds(checked ? users.map(u => u.id) : []);
  };
  const handleBulkAction = async (action: 'hide'|'restore'|'delete') => {
    if (selectedUserIds.length === 0) return;
    if (action === 'delete' && !window.confirm('정말 삭제하시겠습니까? 복구할 수 없습니다.')) return;
    let update;
    if (action === 'hide') update = { is_hidden: true };
    if (action === 'restore') update = { is_hidden: false };
    if (action === 'delete') update = null;
    try {
      if (action === 'delete') {
        await supabase.from('users').delete().in('id', selectedUserIds);
      } else {
        await supabase.from('users').update(update).in('id', selectedUserIds);
      }
      toast.success('일괄 처리 완료');
      setSelectedUserIds([]);
      fetchAllUsers();
    } catch (e) {
      toast.error('처리 중 오류 발생');
    }
  };

  // 팀 관리 상태
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamSort, setTeamSort] = useState<'created_at'|'name'>('created_at');
  const [teamSortDir, setTeamSortDir] = useState<'asc'|'desc'>('desc');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const handleSelectTeam = (id: string, checked: boolean) => {
    setSelectedTeamIds(prev => checked ? [...prev, id] : prev.filter(tid => tid !== id));
  };
  const handleSelectAllTeams = (checked: boolean, teams: any[]) => {
    setSelectedTeamIds(checked ? teams.map(t => t.id) : []);
  };
  const handleBulkTeamAction = async (action: 'hide'|'restore'|'delete') => {
    if (selectedTeamIds.length === 0) return;
    if (action === 'delete' && !window.confirm('정말 삭제하시겠습니까? 복구할 수 없습니다.')) return;
    let update;
    if (action === 'hide') update = { is_hidden: true };
    if (action === 'restore') update = { is_hidden: false };
    if (action === 'delete') update = null;
    try {
      if (action === 'delete') {
        await supabase.from('teams').delete().in('id', selectedTeamIds);
      } else {
        await supabase.from('teams').update(update).in('id', selectedTeamIds);
      }
      toast.success('일괄 처리 완료');
      setSelectedTeamIds([]);
      fetchAllTeams();
    } catch (e) {
      toast.error('처리 중 오류 발생');
    }
  };
  const fetchAllTeams = async () => {
    try {
      const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
      if (error) return;
      setAllTeams(data || []);
    } catch {}
  };
  useEffect(() => { if (!loading && user && profile?.type === 'admin') fetchAllTeams(); }, [user, loading, profile]);

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

  useEffect(() => {
    if (!loading && user && profile?.type === 'admin') {
      fetchStats();
      fetchRecent();
    }
  }, [user, loading, profile]);

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

  // CSV 업로드 핸들러
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null);
    setCsvUploadResult(null);
    setCsvPreviewRows([]);
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        try {
          // 지원 컬럼: name, name_en, email, phone, profile_image, introduction, instagram_url, youtube_url, twitter_url, display_order, type, teams, careers
          const rows = results.data as any[];
          const validRows = rows.filter(r => r.name && r.name_en);
          if (validRows.length === 0) {
            setCsvError('유효한 데이터가 없습니다. (name, name_en 필수)');
            setCsvUploading(false);
            return;
          }
          // teams: ;로 분리
          validRows.forEach(r => {
            r.teamsArr = r.teams ? r.teams.split(';').map((t: string) => t.trim()).filter(Boolean) : [];
            // careers: ;로 분리 후 |로 세부 파싱 (date_type, single_date, start_date, end_date 모두 지원)
            r.careersArr = r.careers ? r.careers.split(';').map((c: string) => {
              const parts = c.split('|').map(s => s?.trim() || '');
              const [category, title, description, country, date_type, d1, d2] = parts;
              if (date_type === 'single') {
                return { category, title, description, country, date_type, single_date: d1, start_date: '', end_date: '' };
              } else if (date_type === 'range') {
                return { category, title, description, country, date_type, single_date: '', start_date: d1, end_date: d2 };
              } else {
                // 구버전 호환: start_date, end_date만 있을 때
                return { category, title, description, country, date_type: '', single_date: '', start_date: d1, end_date: d2 };
              }
            }).filter(c => c.title) : [];
          });
          setCsvPreviewRows(validRows);
          setCsvUploadResult(`${validRows.length}건의 가상 프로필을 업로드할 준비가 되었습니다.`);
        } catch (err: any) {
          setCsvError('CSV 파싱 오류: ' + (err.message || err));
        } finally {
          setCsvUploading(false);
        }
      },
      error: (err: any) => {
        setCsvError('CSV 파싱 오류: ' + (err.message || err));
        setCsvUploading(false);
      }
    });
  };

  // CSV 예시 다운로드
  const handleDownloadSample = () => {
    const sample =
      'name,name_en,email,phone,profile_image,introduction,instagram_url,youtube_url,twitter_url,display_order,type,teams,careers\n'
      + '김댄서,Kim Dancer,dancer1@example.com,010-1234-5678,https://img.com/kim.jpg,대한민국 대표 댄서,https://insta.com/kim,https://youtube.com/kim,https://twitter.com/kim,1,dancer,팀A;팀B,"choreography|아이돌 안무|K-POP 안무 제작|Korea|2020-01-01|2020-12-31;performance|콘서트|메인 댄서|Korea|2021-01-01|2021-12-31"\n'
      + '홍길동,Hong Gildong,hong@example.com,,,,,,,,,,,';
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'virtual_users_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 미리보기/등록/결과 UI 공통 컴포넌트
  function PreviewTable() {
    return (
      <div className="overflow-x-auto mt-4">
        <table className="min-w-[1200px] border text-xs">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border px-2 py-1">이름</th>
              <th className="border px-2 py-1">영문이름</th>
              <th className="border px-2 py-1">이메일</th>
              <th className="border px-2 py-1">소속팀</th>
              <th className="border px-2 py-1">경력 카테고리</th>
              <th className="border px-2 py-1">경력 제목</th>
              <th className="border px-2 py-1">경력 설명</th>
              <th className="border px-2 py-1">국가</th>
              <th className="border px-2 py-1">날짜구분</th>
              <th className="border px-2 py-1">단일날짜</th>
              <th className="border px-2 py-1">시작일</th>
              <th className="border px-2 py-1">종료일</th>
              <th className="border px-2 py-1">이미지</th>
              <th className="border px-2 py-1">소개</th>
            </tr>
          </thead>
          <tbody>
            {csvPreviewRows.map((row, i) => (
              (row.careersArr && row.careersArr.length > 0 ? row.careersArr : [{}]).map((c: any, idx: number) => (
                <tr key={i + '-' + idx}>
                  <td className="border px-2 py-1">{row.name}</td>
                  <td className="border px-2 py-1">{row.name_en}</td>
                  <td className="border px-2 py-1">{row.email}</td>
                  <td className="border px-2 py-1">{row.teamsArr?.join(', ')}</td>
                  <td className="border px-2 py-1">{c?.category || ''}</td>
                  <td className="border px-2 py-1">{c?.title || ''}</td>
                  <td className="border px-2 py-1">{c?.description || ''}</td>
                  <td className="border px-2 py-1">{c?.country || ''}</td>
                  <td className="border px-2 py-1">{c?.date_type || ''}</td>
                  <td className="border px-2 py-1">{c?.single_date || ''}</td>
                  <td className="border px-2 py-1">{c?.start_date || ''}</td>
                  <td className="border px-2 py-1">{c?.end_date || ''}</td>
                  <td className="border px-2 py-1">{row.profile_image && idx === 0 ? <img src={row.profile_image} alt="img" className="w-10 h-10 object-cover rounded" /> : ''}</td>
                  <td className="border px-2 py-1">{row.introduction && idx === 0 ? row.introduction : ''}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 mt-4">
          <Button
            type="button"
            variant="default"
            disabled={registering || csvPreviewRows.length === 0}
            onClick={async () => {
              setRegistering(true);
              setRegisterResult(null);
              try {
                const res = await fetch('/api/users/bulk', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ users: csvPreviewRows })
                });
                const text = await res.text();
                let data;
                try {
                  data = JSON.parse(text);
                } catch {
                  data = null;
                }
                if (!res.ok || !data) {
                  throw new Error(data?.error || '서버 응답이 비정상적입니다.');
                }
                setRegisterResult(data.results);
                toast.success('대량 등록이 완료되었습니다!');
              } catch (e: any) {
                setRegisterResult([{ status: 'fail', error: e.message }]);
                toast.error('등록 중 오류 발생: ' + (e.message || ''));
              } finally {
                setRegistering(false);
              }
            }}
          >
            {registering ? '등록 중...' : '대량 등록'}
          </Button>
        </div>
        {/* 등록 결과 리포트 */}
        {registerResult && (
          <div className="mt-4">
            <h4 className="font-bold mb-2">등록 결과</h4>
            <table className="min-w-[400px] border text-xs">
              <thead>
                <tr className="bg-zinc-50">
                  <th className="border px-2 py-1">이메일</th>
                  <th className="border px-2 py-1">결과</th>
                  <th className="border px-2 py-1">에러</th>
                </tr>
              </thead>
              <tbody>
                {registerResult.map((r, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{r.email}</td>
                    <td className="border px-2 py-1">{r.status === 'success' ? '성공' : '실패'}</td>
                    <td className="border px-2 py-1 text-red-500">{r.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const fetchStats = async () => {
    try {
      const [{ count: dancers }, { count: teams }, { count: careers }, { count: projects }] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('type', 'dancer'),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('career_entries').select('*', { count: 'exact', head: true }),
        supabase.from('team_projects').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        dancers: dancers || 0,
        teams: teams || 0,
        careers: careers || 0,
        projects: projects || 0,
      });
    } catch (e) {
      // ignore
    }
  };

  const fetchRecent = async () => {
    try {
      // 최근 5명(댄서), 최근 5팀, 최근 5경력, 최근 5프로젝트
      const [{ data: dancers }, { data: teams }, { data: careers }, { data: projects }] = await Promise.all([
        supabase.from('users').select('id, name, name_en, created_at').eq('type', 'dancer').order('created_at', { ascending: false }).limit(5),
        supabase.from('teams').select('id, name, name_en, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('career_entries').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('team_projects').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
      ]);
      setRecent([
        ...(dancers?.map((d: any) => ({ type: '댄서', name: d.name, name_en: d.name_en, date: d.created_at })) || []),
        ...(teams?.map((t: any) => ({ type: '팀', name: t.name, name_en: t.name_en, date: t.created_at })) || []),
        ...(careers?.map((c: any) => ({ type: '경력', name: c.title, date: c.created_at })) || []),
        ...(projects?.map((p: any) => ({ type: '프로젝트', name: p.title, date: p.created_at })) || []),
      ]);
    } catch (e) {
      // ignore
    }
  };

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
        {/* 대시보드 통계/현황 카드 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-2xl font-bold text-blue-600">{stats.dancers}</div>
            <div className="text-zinc-600">전체 댄서</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-2xl font-bold text-green-600">{stats.teams}</div>
            <div className="text-zinc-600">전체 팀</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-2xl font-bold text-purple-600">{stats.careers}</div>
            <div className="text-zinc-600">전체 경력</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-2xl font-bold text-pink-600">{stats.projects}</div>
            <div className="text-zinc-600">전체 프로젝트</div>
          </div>
        </div>
        {/* 최근 등록/수정/삭제 내역 (간단히) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2">
          <div className="bg-white rounded shadow p-4 mt-2">
            <div className="font-bold mb-2">최근 등록/수정/삭제 내역</div>
            <ul className="text-sm text-zinc-700 space-y-1">
              {recent.length === 0 && <li>최근 내역이 없습니다.</li>}
              {recent.slice(0, 10).map((r, i) => (
                <li key={i}>
                  <span className="font-semibold">[{r.type}]</span> {r.name}{r.name_en ? ` (${r.name_en})` : ''} <span className="text-zinc-400">{new Date(r.date).toLocaleString('ko-KR')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 가상 댄서/팀 대량 등록 카드 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>가상 댄서/팀 대량 등록 (CSV 업로드/직접 입력)</CardTitle>
            </CardHeader>
            <CardContent>
              <UITabs value={inputTab} onValueChange={v => setInputTab(v as 'csv' | 'text')} className="mb-4">
                <UITabsList className="mb-2">
                  <UITabsTrigger value="csv">CSV 업로드</UITabsTrigger>
                  <UITabsTrigger value="text">직접 입력</UITabsTrigger>
                  <UITabsTrigger value="dancer">댄서 대량등록</UITabsTrigger>
                  <UITabsTrigger value="team">팀 대량등록</UITabsTrigger>
                </UITabsList>
                <UITabsContent value="csv">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      disabled={csvUploading}
                      className="border rounded px-3 py-2"
                    />
                    <Button type="button" variant="outline" onClick={handleDownloadSample}>
                      예시 파일 다운로드
                    </Button>
                  </div>
                  <div className="text-xs text-zinc-500 mb-2">
                    CSV 컬럼: <b>name</b>, <b>name_en</b>, <b>email</b> (필수), phone, profile_image, introduction, instagram_url, youtube_url, twitter_url, display_order, type, teams, careers (선택)<br/>
                    <b>careers</b> 예시: <code>choreography|아이돌 안무|K-POP 안무 제작|Korea|2020-01-01|2020-12-31</code> (마지막 두 칸이 시작일/종료일, <b>YYYY-MM-DD</b> 형식, 선택사항)<br/>
                    모든 컬럼은 텍스트로만 기입해도 등록됩니다. (teams, careers 등은 예시 참고)
                  </div>
                  {csvUploading && <div className="text-blue-500 text-sm">업로드/파싱 중...</div>}
                  {csvUploadResult && <div className="text-green-600 text-sm">{csvUploadResult}</div>}
                  {csvError && <div className="text-red-500 text-sm">{csvError}</div>}
                  {csvPreviewRows.length > 0 && <PreviewTable />}
                </UITabsContent>
                <UITabsContent value="text">
                  <textarea
                    className="w-full border rounded p-2 text-sm mb-2 min-h-[120px]"
                    placeholder={"CSV와 동일한 순서로 쉼표(,)로 구분하여 한 줄에 한 명씩 입력하세요.\n예시:\n김댄서,Kim Dancer,dancer1@example.com,010-1234-5678,https://img.com/kim.jpg,대한민국 대표 댄서,https://insta.com/kim,https://youtube.com/kim,https://twitter.com/kim,1,dancer,팀A;팀B,\"choreography|아이돌 안무|K-POP 안무 제작|Korea|2020-01-01|2020-12-31;performance|콘서트|메인 댄서|Korea|2021-01-01|2021-12-31\"\n홍길동,Hong Gildong,hong@example.com,,,,,,,,,,,\n\ncareers 필드 마지막 두 칸이 시작일/종료일(YYYY-MM-DD, 선택사항)"}
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mb-2"
                    onClick={() => {
                      // 텍스트 입력 파싱: CSV와 동일 컬럼 순서
                      setCsvError(null);
                      setCsvUploadResult(null);
                      setCsvPreviewRows([]);
                      setRegisterResult(null);
                      const lines = textInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                      if (lines.length === 0) {
                        setCsvError('입력된 데이터가 없습니다.');
                        return;
                      }
                      // 첫 줄이 헤더가 아니라고 가정
                      const columns = ['name','name_en','email','phone','profile_image','introduction','instagram_url','youtube_url','twitter_url','display_order','type','teams','careers'];
                      const rows = lines.map(line => {
                        let values: string[];
                        if (line.includes('"')) {
                          values = line.match(/(?:"[^"]*"|[^,])+/g)?.map(v => v.replace(/^"|"$/g, '')) || line.split(',');
                        } else {
                          values = line.split(',');
                        }
                        const obj: any = {};
                        columns.forEach((col, i) => { obj[col] = values[i] || ''; });
                        return obj;
                      });
                      rows.forEach(r => {
                        r.teamsArr = r.teams ? r.teams.split(';').map((t: string) => t.trim()).filter(Boolean) : [];
                        r.careersArr = r.careers ? r.careers.split(';').map((c: string) => {
                          const [category, title, description, country, start_date, end_date] = c.split('|').map(s => s?.trim() || '');
                          return { category, title, description, country, start_date, end_date };
                        }).filter((c: any) => c.title) : [];
                      });
                      console.log('미리보기 rows:', rows);
                      setCsvPreviewRows(rows);
                      if (rows.length === 0) {
                        setCsvError('입력된 데이터가 없습니다.');
                      } else if (rows.some(r => !r.name || !r.name_en)) {
                        setCsvError('일부 행에 name, name_en이 비어 있습니다.');
                        setCsvUploadResult(`${rows.length}건의 데이터가 미리보기로 표시됩니다. (name, name_en이 없는 행은 등록 시 무시됩니다)`);
                      } else {
                        setCsvUploadResult(`${rows.length}건의 가상 프로필을 업로드할 준비가 되었습니다.`);
                      }
                    }}
                  >
                    미리보기
                  </Button>
                 {csvPreviewRows.length > 0 && <PreviewTable />}
                </UITabsContent>
                <UITabsContent value="dancer">
                  <textarea
                    className="w-full border rounded p-2 text-sm mb-2 min-h-[120px]"
                    placeholder={"이름,영문이름,프로필이미지\n예시:\n김댄서,Kim Dancer,https://img.com/kim.jpg\n홍길동,Hong Gildong,https://img.com/hong.jpg\n"}
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mb-2"
                    onClick={() => {
                      setCsvError(null);
                      setCsvUploadResult(null);
                      setCsvPreviewRows([]);
                      setRegisterResult(null);
                      const lines = textInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                      if (lines.length === 0) {
                        setCsvError('입력된 데이터가 없습니다.');
                        return;
                      }
                      // 댄서: 3개 컬럼 (name, name_en, profile_image)
                      const columns = ['name','name_en','profile_image'];
                      const rows = lines.map(line => {
                        let values: string[];
                        if (line.includes('"')) {
                          values = line.match(/(?:"[^"]*"|[^,])+/g)?.map(v => v.replace(/^"|"$/g, '')) || line.split(',');
                        } else {
                          values = line.split(',');
                        }
                        const obj: any = {};
                        columns.forEach((col, i) => { obj[col] = values[i] || ''; });
                        obj.type = 'dancer'; // 강제
                        obj.teamsArr = [];
                        obj.careersArr = [];
                        return obj;
                      });
                      setCsvPreviewRows(rows);
                      if (rows.length === 0) {
                        setCsvError('입력된 데이터가 없습니다.');
                      } else if (rows.some(r => !r.name || !r.name_en)) {
                        setCsvError('일부 행에 name, name_en이 비어 있습니다.');
                        setCsvUploadResult(`${rows.length}건의 데이터가 미리보기로 표시됩니다. (name, name_en이 없는 행은 등록 시 무시됩니다)`);
                      } else {
                        setCsvUploadResult(`${rows.length}건의 댄서 프로필을 업로드할 준비가 되었습니다.`);
                      }
                    }}
                  >
                    미리보기
                  </Button>
                  {csvPreviewRows.length > 0 && <PreviewTable />}
                </UITabsContent>
                <UITabsContent value="team">
                  <textarea
                    className="w-full border rounded p-2 text-sm mb-2 min-h-[120px]"
                    placeholder={"팀명,영문팀명,설명,로고URL\n예시:\n팀A,Team A,설명입니다,https://img.com/teamA.jpg\n팀B,Team B,,\n"}
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mb-2"
                    onClick={async () => {
                      setCsvError(null);
                      setCsvUploadResult(null);
                      setCsvPreviewRows([]);
                      setRegisterResult(null);
                      const lines = textInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                      if (lines.length === 0) {
                        setCsvError('입력된 데이터가 없습니다.');
                        return;
                      }
                      // 팀: 4개 컬럼 (name, name_en, description, logo_url)
                      const columns = ['name','name_en','description','logo_url'];
                      const rows = lines.map(line => {
                        let values: string[];
                        if (line.includes('"')) {
                          values = line.match(/(?:"[^"]*"|[^,])+/g)?.map(v => v.replace(/^"|"$/g, '')) || line.split(',');
                        } else {
                          values = line.split(',');
                        }
                        const obj: any = {};
                        columns.forEach((col, i) => { obj[col] = values[i] || ''; });
                        // slug는 name_en 기반 자동 생성 (소문자, 특수문자 제거)
                        obj.slug = (obj.name_en || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        return obj;
                      });
                      // slug 중복 방지: 이미 미리보기 rows 내에서 중복 slug가 있으면 -1, -2 등 붙이기
                      const slugCount: Record<string, number> = {};
                      rows.forEach((row) => {
                        let baseSlug = row.slug;
                        let slug = baseSlug;
                        let counter = 1;
                        while (rows.some(r => r !== row && r.slug === slug)) {
                          slug = `${baseSlug}-${counter++}`;
                        }
                        row.slug = slug;
                      });
                      setCsvPreviewRows(rows);
                      if (rows.length === 0) {
                        setCsvError('입력된 데이터가 없습니다.');
                      } else if (rows.some(r => !r.name || !r.name_en || !r.slug)) {
                        setCsvError('일부 행에 팀명, 영문팀명, slug가 비어 있습니다.');
                        setCsvUploadResult(`${rows.length}건의 데이터가 미리보기로 표시됩니다. (필수값이 없는 행은 등록 시 무시됩니다)`);
                      } else {
                        setCsvUploadResult(`${rows.length}건의 팀 정보를 업로드할 준비가 되었습니다.`);
                      }
                    }}
                  >
                    미리보기
                  </Button>
                  {csvPreviewRows.length > 0 && (
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-[800px] border text-xs">
                        <thead>
                          <tr className="bg-zinc-100">
                            <th className="border px-2 py-1">팀명</th>
                            <th className="border px-2 py-1">영문팀명</th>
                            <th className="border px-2 py-1">slug</th>
                            <th className="border px-2 py-1">설명</th>
                            <th className="border px-2 py-1">로고URL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreviewRows.map((row, i) => (
                            <tr key={i}>
                              <td className="border px-2 py-1">{row.name}</td>
                              <td className="border px-2 py-1">{row.name_en}</td>
                              <td className="border px-2 py-1">{row.slug}</td>
                              <td className="border px-2 py-1">{row.description}</td>
                              <td className="border px-2 py-1">{row.logo_url}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {csvPreviewRows.length > 0 && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        type="button"
                        variant="default"
                        disabled={registering || csvPreviewRows.length === 0}
                        onClick={async () => {
                          setRegistering(true);
                          setRegisterResult(null);
                          try {
                            const res = await fetch('/api/teams/bulk', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ teams: csvPreviewRows })
                            });
                            const text = await res.text();
                            let data;
                            try {
                              data = JSON.parse(text);
                            } catch {
                              data = null;
                            }
                            if (!res.ok || !data) {
                              throw new Error(data?.error || '서버 응답이 비정상적입니다.');
                            }
                            setRegisterResult(data.results);
                            toast.success('팀 대량 등록이 완료되었습니다!');
                          } catch (e: any) {
                            setRegisterResult([{ status: 'fail', error: e.message }]);
                            toast.error('등록 중 오류 발생: ' + (e.message || ''));
                          } finally {
                            setRegistering(false);
                          }
                        }}
                      >
                        {registering ? '등록 중...' : '등록'}
                      </Button>
                    </div>
                  )}
                  {/* 등록 결과 리포트 */}
                  {registerResult && (
                    <div className="mt-4">
                      <h4 className="font-bold mb-2">등록 결과</h4>
                      <table className="min-w-[400px] border text-xs">
                        <thead>
                          <tr className="bg-zinc-50">
                            <th className="border px-2 py-1">팀명</th>
                            <th className="border px-2 py-1">결과</th>
                            <th className="border px-2 py-1">에러</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registerResult.map((r, i) => (
                            <tr key={i}>
                              <td className="border px-2 py-1">{r.name}</td>
                              <td className="border px-2 py-1">{r.status === 'success' ? '성공' : '실패'}</td>
                              <td className="border px-2 py-1 text-red-500">{r.error || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </UITabsContent>
              </UITabs>
            </CardContent>
          </Card>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">관리자 대시보드</h1>
            <p className="text-zinc-600">사용자 권한 관리 및 승인</p>
          </div>

          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending">
                승인 대기 ({pendingUsers.length})
              </TabsTrigger>
              <TabsTrigger value="users">
                전체 사용자 ({allUsers.length})
              </TabsTrigger>
              <TabsTrigger value="teams">
                전체 팀 ({allTeams.length})
              </TabsTrigger>
              <TabsTrigger value="claims">
                연결 요청
              </TabsTrigger>
              <TabsTrigger value="seo">
                SEO 설정
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
                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <input
                      type="text"
                      placeholder="이름/영문이름/이메일 검색"
                      className="border rounded px-2 py-1 text-sm"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                    />
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={userTypeFilter}
                      onChange={e => setUserTypeFilter(e.target.value)}
                    >
                      <option value="all">전체 타입</option>
                      <option value="dancer">댄서</option>
                      <option value="client">클라이언트</option>
                      <option value="manager">매니저</option>
                      <option value="admin">관리자</option>
                    </select>
                    <button
                      className="ml-2 text-xs px-2 py-1 border rounded bg-zinc-100 hover:bg-zinc-200"
                      onClick={() => {
                        setUserSort('created_at');
                        setUserSortDir(userSortDir === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      가입일 {userSort === 'created_at' ? (userSortDir === 'desc' ? '▼' : '▲') : ''}
                    </button>
                    <button
                      className="text-xs px-2 py-1 border rounded bg-zinc-100 hover:bg-zinc-200"
                      onClick={() => {
                        setUserSort('name');
                        setUserSortDir(userSortDir === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      이름 {userSort === 'name' ? (userSortDir === 'desc' ? '▼' : '▲') : ''}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-2">
                    <input type="checkbox"
                      checked={selectedUserIds.length > 0 && allUsers.length > 0 && allUsers.filter(u => !u.is_hidden).every(u => selectedUserIds.includes(u.id))}
                      onChange={e => handleSelectAll(e.target.checked, allUsers.filter(u => !u.is_hidden))}
                    /> 전체 선택
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('hide')} disabled={selectedUserIds.length === 0}>일괄 숨기기</Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('restore')} disabled={selectedUserIds.length === 0}>일괄 복원</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')} disabled={selectedUserIds.length === 0}>일괄 삭제</Button>
                            </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[700px] border text-sm">
                      <thead className="sticky top-0 bg-zinc-100 z-10">
                        <tr>
                         <th className="border px-2 py-1 w-8"><input type="checkbox"
                           checked={selectedUserIds.length > 0 && allUsers.length > 0 && allUsers.filter(u => !u.is_hidden).every(u => selectedUserIds.includes(u.id))}
                           onChange={e => handleSelectAll(e.target.checked, allUsers.filter(u => !u.is_hidden))}
                         /></th>
                          <th className="border px-2 py-1">이름</th>
                          <th className="border px-2 py-1">영문이름</th>
                          <th className="border px-2 py-1">이메일</th>
                          <th className="border px-2 py-1">권한</th>
                          <th className="border px-2 py-1">가입일</th>
                          <th className="border px-2 py-1">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers
                          .filter(u =>
                            (!userSearch ||
                              u.name?.includes(userSearch) ||
                              u.name_en?.toLowerCase().includes(userSearch.toLowerCase()) ||
                              u.email?.toLowerCase().includes(userSearch.toLowerCase())
                            ) &&
                            (userTypeFilter === 'all' || u.type === userTypeFilter)
                          )
                          .sort((a, b) => {
                            if (userSort === 'created_at') {
                              return userSortDir === 'desc'
                                ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                                : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                            } else if (userSort === 'name') {
                              return userSortDir === 'desc'
                                ? b.name.localeCompare(a.name)
                                : a.name.localeCompare(b.name);
                            }
                            return 0;
                          })
                          .map((user) => (
                            <tr key={user.id} className={"hover:bg-zinc-50 transition " + (user.is_hidden ? 'bg-zinc-100 text-zinc-400' : '')}>
                              <td className="border px-2 py-1 text-center">
                                <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={e => handleSelectUser(user.id, e.target.checked)} disabled={user.is_hidden} />
                              </td>
                              <td className="border px-2 py-1 font-medium flex items-center gap-2">
                                {user.name}
                                {user.is_hidden && <span className="text-xs bg-zinc-300 rounded px-1 ml-1">숨김</span>}
                              </td>
                              <td className="border px-2 py-1 text-zinc-500">{user.name_en}</td>
                              <td className="border px-2 py-1">{user.email}</td>
                              <td className="border px-2 py-1">{getStatusBadge(user)}</td>
                              <td className="border px-2 py-1">{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
                              <td className="border px-2 py-1">
                                {!user.is_hidden && <Button size="sm" variant="outline" onClick={async () => {
                                  await supabase.from('users').update({ is_hidden: true }).eq('id', user.id);
                                  fetchAllUsers();
                                  toast.success('숨김 처리됨');
                                }}>숨기기</Button>}
                                {user.is_hidden && <Button size="sm" variant="outline" onClick={async () => {
                                  await supabase.from('users').update({ is_hidden: false }).eq('id', user.id);
                                  fetchAllUsers();
                                  toast.success('복원됨');
                                }}>복원</Button>}
                                <Button size="sm" variant="destructive" onClick={async () => {
                                  if (window.confirm('정말 삭제하시겠습니까? 복구할 수 없습니다.')) {
                                    await supabase.from('users').delete().eq('id', user.id);
                                    fetchAllUsers();
                                    toast.success('삭제됨');
                                  }
                                }}>삭제</Button>
                                <Button size="sm" variant="default" onClick={() => {
                                  setSelectedUserForLink(user);
                                  setIsDirectLinkModalOpen(true);
                                }}>연동</Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teams">
              <Card>
                <CardHeader>
                  <CardTitle>전체 팀 목록</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <input
                      type="text"
                      placeholder="팀명/영문팀명/slug 검색"
                      className="border rounded px-2 py-1 text-sm"
                      value={teamSearch}
                      onChange={e => setTeamSearch(e.target.value)}
                    />
                    <button
                      className="ml-2 text-xs px-2 py-1 border rounded bg-zinc-100 hover:bg-zinc-200"
                      onClick={() => {
                        setTeamSort('created_at');
                        setTeamSortDir(teamSortDir === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      생성일 {teamSort === 'created_at' ? (teamSortDir === 'desc' ? '▼' : '▲') : ''}
                    </button>
                    <button
                      className="text-xs px-2 py-1 border rounded bg-zinc-100 hover:bg-zinc-200"
                      onClick={() => {
                        setTeamSort('name');
                        setTeamSortDir(teamSortDir === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      팀명 {teamSort === 'name' ? (teamSortDir === 'desc' ? '▼' : '▲') : ''}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-2">
                    <input type="checkbox"
                      checked={selectedTeamIds.length > 0 && allTeams.length > 0 && allTeams.filter(t => !t.is_hidden).every(t => selectedTeamIds.includes(t.id))}
                      onChange={e => handleSelectAllTeams(e.target.checked, allTeams.filter(t => !t.is_hidden))}
                    /> 전체 선택
                    <Button size="sm" variant="outline" onClick={() => handleBulkTeamAction('hide')} disabled={selectedTeamIds.length === 0}>일괄 숨기기</Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkTeamAction('restore')} disabled={selectedTeamIds.length === 0}>일괄 복원</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleBulkTeamAction('delete')} disabled={selectedTeamIds.length === 0}>일괄 삭제</Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[700px] border text-sm">
                      <thead className="sticky top-0 bg-zinc-100 z-10">
                        <tr>
                         <th className="border px-2 py-1 w-8"><input type="checkbox"
                           checked={selectedTeamIds.length > 0 && allTeams.length > 0 && allTeams.filter(t => !t.is_hidden).every(t => selectedTeamIds.includes(t.id))}
                           onChange={e => handleSelectAllTeams(e.target.checked, allTeams.filter(t => !t.is_hidden))}
                         /></th>
                         <th className="border px-2 py-1">팀명</th>
                         <th className="border px-2 py-1">영문팀명</th>
                         <th className="border px-2 py-1">slug</th>
                         <th className="border px-2 py-1">설명</th>
                         <th className="border px-2 py-1">생성일</th>
                         <th className="border px-2 py-1">관리</th>
                       </tr>
                     </thead>
                     <tbody>
                       {allTeams
                         .filter(t =>
                           (!teamSearch ||
                             t.name?.includes(teamSearch) ||
                             t.name_en?.toLowerCase().includes(teamSearch.toLowerCase()) ||
                             t.slug?.toLowerCase().includes(teamSearch.toLowerCase())
                           )
                         )
                         .sort((a, b) => {
                           if (teamSort === 'created_at') {
                             return teamSortDir === 'desc'
                               ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                               : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                           } else if (teamSort === 'name') {
                             return teamSortDir === 'desc'
                               ? b.name.localeCompare(a.name)
                               : a.name.localeCompare(b.name);
                           }
                           return 0;
                         })
                         .map((team) => (
                           <tr key={team.id} className={"hover:bg-zinc-50 transition " + (team.is_hidden ? 'bg-zinc-100 text-zinc-400' : '')}>
                             <td className="border px-2 py-1 text-center">
                               <input type="checkbox" checked={selectedTeamIds.includes(team.id)} onChange={e => handleSelectTeam(team.id, e.target.checked)} disabled={team.is_hidden} />
                             </td>
                             <td className="border px-2 py-1 font-medium flex items-center gap-2">
                               {team.name}
                               {team.is_hidden && <span className="text-xs bg-zinc-300 rounded px-1 ml-1">숨김</span>}
                             </td>
                             <td className="border px-2 py-1 text-zinc-500">{team.name_en}</td>
                             <td className="border px-2 py-1">{team.slug}</td>
                             <td className="border px-2 py-1">{team.description}</td>
                             <td className="border px-2 py-1">{new Date(team.created_at).toLocaleDateString('ko-KR')}</td>
                             <td className="border px-2 py-1 flex gap-1">
                               {!team.is_hidden && <Button size="sm" variant="outline" onClick={async () => {
                                 await supabase.from('teams').update({ is_hidden: true }).eq('id', team.id);
                                 fetchAllTeams();
                                 toast.success('숨김 처리됨');
                               }}>숨기기</Button>}
                               {team.is_hidden && <Button size="sm" variant="outline" onClick={async () => {
                                 await supabase.from('teams').update({ is_hidden: false }).eq('id', team.id);
                                 fetchAllTeams();
                                 toast.success('복원됨');
                               }}>복원</Button>}
                               <Button size="sm" variant="destructive" onClick={async () => {
                                 if (window.confirm('정말 삭제하시겠습니까? 복구할 수 없습니다.')) {
                                   await supabase.from('teams').delete().eq('id', team.id);
                                   fetchAllTeams();
                                   toast.success('삭제됨');
                                 }
                               }}>삭제</Button>
                               <Button size="sm" variant="default" onClick={() => router.push(`/teams/${team.slug}`)}>멤버 관리</Button>
                             </td>
                           </tr>
                         ))}
                     </tbody>
                   </table>
                 </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="claims">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    연결 요청 관리
                  </CardTitle>
                  <p className="text-sm text-zinc-600">
                    신규 회원의 기존 댄서 정보 연결 요청을 관리하세요
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900 mb-2">연결 요청 관리</h3>
                    <p className="text-zinc-600 mb-6">
                      신규 회원이 기존 댄서 정보에 연결을 요청한 내역을 확인하고 관리할 수 있습니다.
                    </p>
                    <Button 
                      onClick={() => router.push('/admin/claims')}
                      className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      연결 요청 관리 페이지로 이동
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo">
              <SEOSettingsManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      
      {/* 직접 연동 모달 */}
      <DirectLinkModal
        isOpen={isDirectLinkModalOpen}
        onClose={() => setIsDirectLinkModalOpen(false)}
        onSuccess={() => {
          // 성공 시 사용자 목록 새로고침
          fetchAllUsers()
        }}
        selectedUser={selectedUserForLink}
      />
    </div>
  )
} 