'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, LogOut, LogIn } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function LoginStatus() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
    
    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Auth check error:', error)
      }
      setUser(user)
    } catch (error) {
      console.error('User check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error('로그아웃 중 오류가 발생했습니다.')
      } else {
        toast.success('로그아웃되었습니다.')
        setUser(null)
      }
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('로그아웃 중 오류가 발생했습니다.')
    }
  }

  const handleSignIn = () => {
    window.location.href = '/signin'
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5" />
          <span>로그인 상태</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">이메일:</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">사용자 ID:</span>
              <span className="text-xs font-mono text-gray-500">{user.id.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="bg-green-600">
                로그인됨
              </Badge>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center">
              <Badge variant="secondary" className="bg-gray-600">
                로그인되지 않음
              </Badge>
            </div>
            <p className="text-sm text-gray-600 text-center">
              섭외 제안을 보내려면 로그인이 필요합니다.
            </p>
            <Button
              onClick={handleSignIn}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              로그인하기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 