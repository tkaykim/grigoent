'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationDropdown } from './NotificationDropdown'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // 초기 알림 개수 로드
    loadUnreadCount()

    // 실시간 알림 구독
    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposal_notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const loadUnreadCount = async () => {
    if (!user) return

    try {
      const { count, error } = await supabase
        .from('proposal_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      setUnreadCount(count || 0)
    } catch (error) {
      console.error('알림 개수 로드 실패:', error)
    }
  }

  if (!user) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      {isDropdownOpen && (
        <NotificationDropdown 
          onClose={() => setIsDropdownOpen(false)}
          onNotificationRead={loadUnreadCount}
        />
      )}
    </div>
  )
}