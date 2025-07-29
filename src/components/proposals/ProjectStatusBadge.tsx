'use client'

import { Badge } from '@/components/ui/badge'
import { Clock, MessageSquare, Calendar, Play, CheckCircle, XCircle, AlertCircle, Ban } from 'lucide-react'

interface ProjectStatusBadgeProps {
  status: string
  className?: string
}

export function ProjectStatusBadge({ status, className = '' }: ProjectStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: '대기중',
          variant: 'secondary' as const,
          icon: Clock,
          color: 'bg-gray-100 text-gray-800'
        }
      case 'consulting':
        return {
          label: '상담중',
          variant: 'default' as const,
          icon: MessageSquare,
          color: 'bg-blue-100 text-blue-800'
        }
      case 'scheduled':
        return {
          label: '진행예정',
          variant: 'default' as const,
          icon: Calendar,
          color: 'bg-purple-100 text-purple-800'
        }
      case 'in_progress':
        return {
          label: '진행중',
          variant: 'default' as const,
          icon: Play,
          color: 'bg-green-100 text-green-800'
        }
      case 'completed':
        return {
          label: '완료',
          variant: 'default' as const,
          icon: CheckCircle,
          color: 'bg-emerald-100 text-emerald-800'
        }
      case 'cancelled':
        return {
          label: '취소됨',
          variant: 'destructive' as const,
          icon: XCircle,
          color: 'bg-red-100 text-red-800'
        }
      case 'rejected':
        return {
          label: '거절됨',
          variant: 'destructive' as const,
          icon: Ban,
          color: 'bg-red-100 text-red-800'
        }
      case 'expired':
        return {
          label: '만료됨',
          variant: 'secondary' as const,
          icon: AlertCircle,
          color: 'bg-orange-100 text-orange-800'
        }
      default:
        return {
          label: '알 수 없음',
          variant: 'secondary' as const,
          icon: AlertCircle,
          color: 'bg-gray-100 text-gray-800'
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.color} ${className}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}