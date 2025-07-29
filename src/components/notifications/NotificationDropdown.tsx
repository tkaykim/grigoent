'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  proposal_id: string
}

interface NotificationDropdownProps {
  onClose: () => void
  onNotificationRead: () => void
}

export function NotificationDropdown({ onClose, onNotificationRead }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    loadNotifications()
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('proposal_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('알림 로드 실패:', error)
      toast.error('알림을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('proposal_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      )

      onNotificationRead()
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('proposal_notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false)

      if (error) throw error

      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      )

      onNotificationRead()
      toast.success('모든 알림을 읽음 처리했습니다.')
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error)
      toast.error('읽음 처리에 실패했습니다.')
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // 읽음 처리
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // 프로젝트 관리 페이지로 이동
    router.push('/proposals')
    onClose()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_proposal':
        return <MessageSquare className="w-4 h-4" />
      case 'proposal_accepted':
        return <CheckCircle className="w-4 h-4" />
      case 'proposal_rejected':
        return <XCircle className="w-4 h-4" />
      case 'new_message':
        return <MessageSquare className="w-4 h-4" />
      case 'status_updated':
        return <AlertCircle className="w-4 h-4" />
      case 'project_started':
        return <CheckCircle className="w-4 h-4" />
      case 'project_completed':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_proposal':
        return 'text-blue-600'
      case 'proposal_accepted':
        return 'text-green-600'
      case 'proposal_rejected':
        return 'text-red-600'
      case 'new_message':
        return 'text-blue-600'
      case 'status_updated':
        return 'text-purple-600'
      case 'project_started':
        return 'text-green-600'
      case 'project_completed':
        return 'text-emerald-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return '방금 전'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}시간 전`
    } else {
      return date.toLocaleDateString('ko-KR')
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="absolute right-0 top-full mt-2 w-80 z-50">
      <Card className="shadow-lg border">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-medium">알림</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  모두 읽음
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-96">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>알림이 없습니다</p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      notification.is_read 
                        ? 'hover:bg-gray-50' 
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm line-clamp-1">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <Badge variant="destructive" className="text-xs">
                              새
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(notification.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}