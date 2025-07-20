import { supabase } from './supabase'
import { User } from './types'

export async function signUp(email: string, password: string, userData: Partial<User>) {
  console.log('회원가입 시작:', email, userData)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: userData.name,
        name_en: userData.name_en,
      }
    }
  })

  if (error) {
    console.error('Supabase Auth 오류:', error)
    throw error
  }

  console.log('Supabase Auth 성공:', data.user?.id)

  // 회원가입 성공 후 즉시 프로필 생성
  if (data.user) {
    try {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          name: userData.name,
          name_en: userData.name_en,
          email: data.user.email!,
          type: userData.type || 'general',
          pending_type: userData.pending_type,
        })

      if (profileError) {
        console.error('프로필 생성 오류:', profileError)
        // 프로필 생성 실패해도 회원가입은 성공으로 처리
      } else {
        console.log('프로필 생성 성공')
      }
    } catch (error) {
      console.error('프로필 생성 중 예외:', error)
    }
  }

  return data
}

export async function signIn(email: string, password: string) {
  console.log('signIn 호출:', { email })
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Supabase 로그인 오류:', error)
    throw error
  }
  
  console.log('로그인 성공:', data.user?.id)
  
  // 로그인 성공 후 프로필이 없으면 생성
  if (data.user) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        console.error('프로필 확인 오류:', profileError)
      }

      if (!profile) {
        console.log('프로필이 없음 - 회원가입을 다시 진행해주세요')
        throw new Error('프로필이 없습니다. 회원가입을 다시 진행해주세요.')
      }
    } catch (error) {
      console.error('프로필 처리 중 오류:', error)
    }
  }
  
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// 슬러그 생성 함수
export function generateSlug(nameEn: string): string {
  return nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// YouTube 썸네일 추출 함수
export function getYouTubeThumbnail(url: string): string {
  const videoId = extractVideoId(url)
  if (!videoId) return ''
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

function extractVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
} 