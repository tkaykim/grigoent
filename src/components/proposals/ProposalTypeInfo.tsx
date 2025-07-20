'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// Alert 컴포넌트 대신 div 사용
import { User, Crown, Star, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function ProposalTypeInfo() {
  const [userType, setUserType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserType()
  }, [])

  const checkUserType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('type')
          .eq('id', user.id)
          .single()
        
        setUserType(userProfile?.type || 'general')
      } else {
        setUserType('anonymous')
      }
    } catch (error) {
      console.error('Type check error:', error)
      setUserType('general')
    } finally {
      setLoading(false)
    }
  }

  const getRoleInfo = (role: string) => {
    const roleConfig = {
      client: {
        title: '클라이언트 계정',
        icon: Crown,
        color: 'bg-blue-600',
        description: '전문적인 섭외 제안',
        features: [
          '제안 관리 대시보드',
          '제안 히스토리 확인',
          '댄서와의 실시간 채팅',
          '프로젝트 진행 상황 추적',
          '결제 및 계약 관리'
        ]
      },
      dancer: {
        title: '댄서 계정',
        icon: Star,
        color: 'bg-purple-600',
        description: '다른 댄서에게 제안',
        features: [
          '협업 제안 가능',
          '댄서 간 네트워킹',
          '공동 프로젝트 제안',
          '스킬 교환 제안',
          '워크샵 공동 진행'
        ]
      },
      general: {
        title: '일반 계정',
        icon: User,
        color: 'bg-gray-600',
        description: '기본적인 섭외 제안',
        features: [
          '기본 제안 전송',
          '제안 상태 확인',
          '댄서와의 기본 소통',
          '프로젝트 정보 공유'
        ]
      },
      anonymous: {
        title: '익명 제안',
        icon: Info,
        color: 'bg-orange-600',
        description: '로그인 없이 제안',
        features: [
          '빠른 제안 전송',
          '연락처 정보 입력',
          '기본 프로젝트 정보',
          '댄서 확인 후 연락'
        ]
      }
    }

    return roleConfig[role as keyof typeof roleConfig] || roleConfig.general
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto mb-6">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const roleInfo = getRoleInfo(userType || 'general')
  const Icon = roleInfo.icon

  return (
    <Card className="w-full max-w-md mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Icon className="w-5 h-5" />
          <span>제안 유형</span>
          <Badge className={roleInfo.color}>
            {roleInfo.title}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-600">
          {roleInfo.description}
        </p>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-900">제안 기능:</h4>
          <ul className="text-xs text-zinc-600 space-y-1">
            {roleInfo.features.map((feature, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-zinc-400 rounded-full"></div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {userType === 'anonymous' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                익명 제안은 로그인 없이 전송되며, 댄서가 확인 후 연락드립니다.
              </span>
            </div>
          </div>
        )}

        {userType === 'dancer' && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-800">
                댄서 계정으로 다른 댄서에게 협업 제안을 보낼 수 있습니다.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 