'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User as UserProfile } from '@/lib/types'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authTimeout, setAuthTimeout] = useState(false)

  useEffect(() => {
    // 초기 사용자 상태 확인
    const getUser = async () => {
      try {
        // 타임아웃 설정 (10초)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        })

        const authPromise = supabase.auth.getUser()
        const { data: { user } } = await Promise.race([authPromise, timeoutPromise]) as any
        
        setUser(user)
        
        if (user) {
          await fetchProfile(user.id)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setAuthTimeout(true)
        // 에러가 발생해도 로딩 상태는 해제
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await fetchProfile(session.user.id)
          } else {
            setProfile(null)
          }
        } catch (error) {
          console.error('Auth state change error:', error)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      // 타임아웃 설정 (5초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      })

      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any

      if (error) {
        console.error('프로필 로드 오류:', error.message, error.details, error.hint)
        return
      }

      if (data) {
        // 프로필이 존재하면 설정
        setProfile(data)
      } else {
        // 프로필이 없으면 로그만 남기고 null로 설정
        console.log('프로필이 없음 - 회원가입을 다시 진행해주세요')
        setProfile(null)
      }
    } catch (error) {
      console.error('프로필 로드 오류:', error)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const value = {
    user,
    profile,
    loading: loading && !authTimeout,
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 