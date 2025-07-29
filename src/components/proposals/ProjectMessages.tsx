'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Send, User, Users, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface Message {
  id: string
  message: string
  created_at: string
  sender_id: string
  is_read: boolean
  users?: {
    name: string
    type: string
    profile_image?: string
  }
}

interface ProjectMessagesProps {
  proposalId: string
  proposal: any
}

export function ProjectMessages({ proposalId, proposal }: ProjectMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    loadMessages()
    
    // 실시간 메시지 구독
    const channel = supabase
      .channel(`proposal_messages_${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposal_messages',
          filter: `proposal_id=eq.${proposalId}`
        },
        (payload) => {
          const newMessage = payload.new as Message
          // 임시 메시지가 아닌 경우에만 추가
          if (!newMessage.id.startsWith('temp-')) {
            setMessages(prev => {
              // 이미 존재하는 메시지는 추가하지 않음
              const exists = prev.some(msg => msg.id === newMessage.id)
              if (exists) return prev
              return [...prev, newMessage]
            })
            scrollToBottom()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proposal_messages',
          filter: `proposal_id=eq.${proposalId}`
        },
        (payload) => {
          const updatedMessage = payload.new as Message
          setMessages(prev => 
            prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
          )
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [proposalId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('proposal_messages')
        .select(`
          id,
          message,
          created_at,
          sender_id,
          is_read,
          users!proposal_messages_sender_id_fkey(
            name,
            type,
            profile_image
          )
        `)
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('메시지 로드 실패:', error)
      toast.error('메시지를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return

    const messageText = newMessage.trim()
    setNewMessage('')
    setSending(true)

    try {
      // 먼저 UI에 임시 메시지 추가 (낙관적 업데이트)
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        message: messageText,
        created_at: new Date().toISOString(),
        sender_id: user.id,
        is_read: false,
        users: {
          name: user.user_metadata?.name || user.email || '나',
          type: user.user_metadata?.type || 'client',
          profile_image: user.user_metadata?.profile_image
        }
      }

      setMessages(prev => [...prev, tempMessage])
      scrollToBottom()

      // 실제 메시지 전송
      const { data, error } = await supabase
        .from('proposal_messages')
        .insert({
          proposal_id: proposalId,
          sender_id: user.id,
          message: messageText
        })
        .select(`
          id,
          message,
          created_at,
          sender_id,
          is_read,
          users!proposal_messages_sender_id_fkey(
            name,
            type,
            profile_image
          )
        `)
        .single()

      if (error) throw error

      // 임시 메시지를 실제 메시지로 교체
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? data : msg
      ))

      toast.success('메시지가 전송되었습니다.')
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      toast.error('메시지 전송에 실패했습니다.')
      
      // 실패 시 임시 메시지 제거
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getSenderInfo = (message: Message) => {
    if (!message.users) {
      return { name: '알 수 없음', type: 'unknown', isCurrentUser: false }
    }

    const isCurrentUser = message.sender_id === user?.id
    return {
      name: message.users.name,
      type: message.users.type,
      isCurrentUser
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            프로젝트 메시지
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          프로젝트 메시지
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 메시지 목록 */}
          <div className="h-96 overflow-y-auto space-y-4 border rounded-lg p-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                아직 메시지가 없습니다.
                <br />
                첫 번째 메시지를 보내보세요!
              </div>
            ) : (
              messages.map((message) => {
                const senderInfo = getSenderInfo(message)
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      senderInfo.isCurrentUser ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.users?.profile_image} />
                      <AvatarFallback>
                        {senderInfo.type === 'dancer' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Users className="w-4 h-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex-1 max-w-xs ${
                      senderInfo.isCurrentUser ? 'text-right' : ''
                    }`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        senderInfo.isCurrentUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.message}</p>
                      </div>
                      
                      <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
                        senderInfo.isCurrentUser ? 'justify-end' : ''
                      }`}>
                        <span>{senderInfo.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {senderInfo.type === 'dancer' ? '댄서' : '클라이언트'}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 메시지 입력 */}
          {user ? (
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
                className="flex-1"
                rows={2}
                disabled={sending}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="self-end"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              메시지를 보내려면 로그인이 필요합니다.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}