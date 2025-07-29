'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, X, User, AlertCircle, CheckCircle, Link as LinkIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { User as UserType } from '@/lib/types'

interface DirectLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  selectedUser: UserType | null
}

interface DancerUser {
  id: string
  name: string
  name_en: string
  email: string
  profile_image?: string
  type: string
  introduction?: string
}

export function DirectLinkModal({ isOpen, onClose, onSuccess, selectedUser }: DirectLinkModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DancerUser[]>([])
  const [selectedDancer, setSelectedDancer] = useState<DancerUser | null>(null)
  const [reason, setReason] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 검색 실행
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('검색에 실패했습니다.')
      }

      const data = await response.json()
      setSearchResults(data.users || [])
    } catch (error) {
      console.error('Search error:', error)
      toast.error('검색 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  // 검색어 변경 시 자동 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch()
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // 직접 연동 처리
  const handleDirectLink = async () => {
    if (!selectedUser || !selectedDancer) {
      toast.error('연동할 사용자와 댄서를 모두 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch('/api/admin/direct-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          dancerId: selectedDancer.id,
          reason: reason.trim() || null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '연동 처리에 실패했습니다.')
      }

      const data = await response.json()
      toast.success(data.message || '연동이 완료되었습니다.')
      
      // 모달 초기화
      setSearchQuery('')
      setSearchResults([])
      setSelectedDancer(null)
      setReason('')
      
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Direct link error:', error)
      toast.error(error.message || '연동 처리에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedDancer(null)
    setReason('')
    onClose()
  }

  if (!selectedUser) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              직접 연동 처리
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">직접 연동 처리</h4>
                <p className="text-sm text-blue-700">
                  선택한 사용자를 기존 댄서 정보와 직접 연동합니다. 신청 없이도 관리자가 직접 처리할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 선택된 사용자 정보 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">연동할 사용자</h4>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selectedUser.profile_image} />
                <AvatarFallback>
                  {selectedUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h5 className="font-medium text-gray-900">{selectedUser.name}</h5>
                <p className="text-sm text-gray-600">{selectedUser.name_en}</p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {selectedUser.type}
                </Badge>
              </div>
            </div>
          </div>

          {/* 댄서 검색 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-900 mb-2 block">
                연동할 댄서 검색
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="댄서 이름, 영문명, 이메일로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isSearching && (
                <p className="text-sm text-zinc-500 mt-2">검색 중...</p>
              )}
            </div>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-zinc-900">검색 결과</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDancer?.id === user.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                      onClick={() => setSelectedDancer(user)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.profile_image} />
                          <AvatarFallback>
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-zinc-900">{user.name}</h5>
                            <Badge variant="outline" className="text-xs">
                              {user.name_en}
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-500">{user.email}</p>
                          {user.introduction && (
                            <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
                              {user.introduction}
                            </p>
                          )}
                        </div>
                        {selectedDancer?.id === user.id && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-4">
                <p className="text-sm text-zinc-500">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>

          {/* 선택된 댄서 정보 */}
          {selectedDancer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedDancer.profile_image} />
                  <AvatarFallback>
                    {selectedDancer.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-green-900">{selectedDancer.name}</h4>
                  <p className="text-sm text-green-700">{selectedDancer.name_en}</p>
                  <p className="text-xs text-green-600">{selectedDancer.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* 연동 이유 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900">
              연동 이유 (선택사항)
            </label>
            <Textarea
              placeholder="연동을 처리하는 이유를 간단히 설명해주세요..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button
              onClick={handleDirectLink}
              disabled={!selectedDancer || isSubmitting}
            >
              {isSubmitting ? '처리 중...' : '연동 처리'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}