'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MessageSquare, Calendar, Play, CheckCircle, XCircle, AlertCircle, Ban, User, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface TimelineEvent {
  id: string
  type: 'proposal_created' | 'status_updated' | 'message_sent' | 'project_started' | 'project_completed'
  title: string
  description: string
  timestamp: string
  user?: {
    name: string
    type: string
  }
  metadata?: any
}

interface ProjectTimelineProps {
  proposalId: string
  proposal: any
}

export function ProjectTimeline({ proposalId, proposal }: ProjectTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    loadTimeline()
  }, [proposalId])

  const loadTimeline = async () => {
    try {
      setLoading(true)
      
      // 1. 제안 생성 이벤트
      const creationEvent: TimelineEvent = {
        id: 'creation',
        type: 'proposal_created',
        title: '프로젝트 제안 생성',
        description: `"${proposal.title}" 프로젝트가 생성되었습니다.`,
        timestamp: proposal.created_at,
        user: proposal.client_id ? { name: '클라이언트', type: 'client' } : { name: '익명 사용자', type: 'anonymous' }
      }

      // 2. 상태 변경 이벤트들
      const statusEvents: TimelineEvent[] = []
      
      // 현재 상태에 따른 이벤트 추가
      if (proposal.status === 'consulting') {
        statusEvents.push({
          id: 'consulting',
          type: 'status_updated',
          title: '상담 단계로 진행',
          description: '프로젝트가 상담 단계로 진행되었습니다.',
          timestamp: proposal.updated_at,
          metadata: { status: 'consulting' }
        })
      }
      
      if (proposal.status === 'scheduled') {
        statusEvents.push({
          id: 'scheduled',
          type: 'status_updated',
          title: '진행 예정으로 확정',
          description: '프로젝트가 진행 예정으로 확정되었습니다.',
          timestamp: proposal.updated_at,
          metadata: { status: 'scheduled' }
        })
      }
      
      if (proposal.status === 'in_progress') {
        statusEvents.push({
          id: 'in_progress',
          type: 'project_started',
          title: '프로젝트 시작',
          description: '프로젝트가 시작되었습니다.',
          timestamp: proposal.updated_at,
          metadata: { status: 'in_progress' }
        })
      }
      
      if (proposal.status === 'completed') {
        statusEvents.push({
          id: 'completed',
          type: 'project_completed',
          title: '프로젝트 완료',
          description: '프로젝트가 성공적으로 완료되었습니다.',
          timestamp: proposal.updated_at,
          metadata: { status: 'completed' }
        })
      }

      // 3. 메시지 이벤트들
      const { data: messages } = await supabase
        .from('proposal_messages')
        .select(`
          id,
          message,
          created_at,
          sender_id,
          users!proposal_messages_sender_id_fkey(name, type)
        `)
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: true })

      const messageEvents: TimelineEvent[] = (messages || []).map((msg, index) => ({
        id: `message-${msg.id}`,
        type: 'message_sent',
        title: '메시지 전송',
        description: msg.message,
        timestamp: msg.created_at,
        user: msg.users ? { name: msg.users.name, type: msg.users.type } : { name: '알 수 없음', type: 'unknown' }
      }))

      // 모든 이벤트를 시간순으로 정렬
      const allEvents = [creationEvent, ...statusEvents, ...messageEvents]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      setTimeline(allEvents)
    } catch (error) {
      console.error('타임라인 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'proposal_created':
        return <Calendar className="w-4 h-4" />
      case 'status_updated':
        return <AlertCircle className="w-4 h-4" />
      case 'message_sent':
        return <MessageSquare className="w-4 h-4" />
      case 'project_started':
        return <Play className="w-4 h-4" />
      case 'project_completed':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'proposal_created':
        return 'bg-blue-500'
      case 'status_updated':
        return 'bg-purple-500'
      case 'message_sent':
        return 'bg-green-500'
      case 'project_started':
        return 'bg-orange-500'
      case 'project_completed':
        return 'bg-emerald-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            프로젝트 타임라인
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
          <Clock className="w-5 h-5" />
          프로젝트 타임라인
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 타임라인 이벤트가 없습니다.
            </div>
          ) : (
            <div className="relative">
              {/* 타임라인 라인 */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {timeline.map((event, index) => (
                <div key={event.id} className="relative flex items-start gap-4 mb-6">
                  {/* 이벤트 아이콘 */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${getEventColor(event.type)} text-white`}>
                    {getEventIcon(event.type)}
                  </div>
                  
                  {/* 이벤트 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      {event.user && (
                        <Badge variant="outline" className="text-xs">
                          {event.user.type === 'dancer' ? (
                            <User className="w-3 h-3 mr-1" />
                          ) : event.user.type === 'client' ? (
                            <Users className="w-3 h-3 mr-1" />
                          ) : null}
                          {event.user.name}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {event.description}
                    </p>
                    
                    <p className="text-xs text-gray-500">
                      {formatDate(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}