'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface PermissionRecord {
  id: string
  user_id: string
  original_owner_id: string
  data_type: 'career' | 'profile'
  access_level: 'read' | 'write' | 'admin'
  users?: { id: string; email: string | null; name: string }
}

interface PermissionManagerModalProps {
  open: boolean
  artistId: string
  onClose: () => void
}

export function PermissionManagerModal({ open, artistId, onClose }: PermissionManagerModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string | null; name: string }>>([])
  const [records, setRecords] = useState<PermissionRecord[]>([])

  const grouped = useMemo(() => {
    const map: Record<string, { userId: string; name: string; email: string; career: boolean; profile: boolean; recordIds: string[] }> = {}
    records.forEach(r => {
      const key = r.user_id
      const name = r.users?.name || 'Unknown'
      const mail = r.users?.email || ''
      if (!map[key]) map[key] = { userId: key, name, email: mail, career: false, profile: false, recordIds: [] }
      if (r.data_type === 'career') map[key].career = true
      if (r.data_type === 'profile') map[key].profile = true
      map[key].recordIds.push(r.id)
    })
    return Object.values(map)
  }, [records])

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('data_access_permissions')
      .select('id,user_id,original_owner_id,data_type,access_level,users:user_id(id,email,name)')
      .eq('original_owner_id', artistId)
    if (error) {
      console.error(error)
      toast.error('권한 목록을 불러오지 못했습니다')
      return
    }
    setRecords((data as unknown) as PermissionRecord[])
  }

  useEffect(() => {
    if (open) fetchPermissions()
  }, [open])

  // 이메일 입력 기반 간단 검색 (이름/이메일)
  useEffect(() => {
    let active = true
    const run = async () => {
      const term = email.trim()
      if (!term) {
        setSearchResults([])
        return
      }
      try {
        setSearching(true)
        const { data, error } = await supabase
          .from('users')
          .select('id,email,name')
          .or(`email.ilike.%${term}%,name.ilike.%${term}%`)
          .limit(5)
        if (!active) return
        if (error) {
          console.error('검색 오류:', error)
          setSearchResults([])
          return
        }
        setSearchResults((data || []) as any)
      } catch (e) {
        console.error('검색 예외:', e)
        setSearchResults([])
      } finally {
        if (active) setSearching(false)
      }
    }
    const t = setTimeout(run, 300)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [email])

  const addPermission = async () => {
    setLoading(true)
    try {
      // 이메일로 사용자 조회
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id,email,name')
        .eq('email', email)
        .single()
      if (userErr || !user) throw new Error('해당 이메일의 사용자를 찾을 수 없습니다')

      // career/profile 두 개 권한 insert (중복은 on conflict 정책으로 무시됨)
      const inserts = [
        { user_id: user.id, original_owner_id: artistId, data_type: 'career', access_level: 'write' as const },
        { user_id: user.id, original_owner_id: artistId, data_type: 'profile', access_level: 'write' as const },
      ]
      const { error } = await supabase.from('data_access_permissions').insert(inserts)
      if (error) throw error
      toast.success('권한이 부여되었습니다')
      setEmail('')
      fetchPermissions()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '권한 부여 실패')
    } finally {
      setLoading(false)
    }
  }

  const revokePermission = async (userId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('data_access_permissions')
        .delete()
        .eq('original_owner_id', artistId)
        .eq('user_id', userId)
        .in('data_type', ['career', 'profile'])
      if (error) throw error
      toast.success('권한이 회수되었습니다')
      fetchPermissions()
    } catch (e) {
      toast.error('권한 회수 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-xl bg-black text-white border border-white/20">
        <DialogHeader>
          <DialogTitle>수정 권한 관리</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-1">이메일로 사용자 추가</label>
            <div className="flex gap-2">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="bg-black/50 text-white border-white/30" />
              <Button onClick={addPermission} disabled={loading || !email} className="bg-white text-black hover:bg-gray-100 border border-white">추가</Button>
            </div>
            {/* 검색 프리뷰 */}
            <div className="mt-2 space-y-2">
              {searching && <div className="text-xs text-gray-400">검색 중...</div>}
              {!searching && email && searchResults.length === 0 && (
                <div className="text-xs text-gray-400">일치하는 사용자가 없습니다.</div>
              )}
              {searchResults.length > 0 && (
                <div className="space-y-1">
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center justify-between px-2 py-1 rounded border border-white/20">
                      <div>
                        <div className="text-sm">{u.name || '(이름 없음)'}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                      <Button size="sm" variant="outline" className="bg-black/50 text-white border-white/30 hover:bg-black/70"
                        onClick={() => setEmail(u.email || '')}
                      >선택</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-300 mb-2">권한 보유자</div>
            <div className="space-y-2">
              {grouped.length === 0 && <div className="text-sm text-gray-400">권한을 보유한 사용자가 없습니다.</div>}
              {grouped.map(g => (
                <div key={g.userId} className="flex items-center justify-between p-3 border border-white/20 rounded-lg">
                  <div>
                    <div className="font-medium">{g.name || '(이름 없음)'}</div>
                    <div className="text-xs text-gray-400">{g.email}</div>
                    <div className="text-xs text-gray-300 mt-1">프로필: {g.profile ? '✓' : '✗'} · 경력: {g.career ? '✓' : '✗'}</div>
                  </div>
                  <Button variant="outline" onClick={() => revokePermission(g.userId)} className="bg-black/50 text-white border-white/30 hover:bg-black/70">권한 회수</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="bg-black text-white border-white/40 hover:bg-black/70">닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

