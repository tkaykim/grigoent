import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 환경 변수 검증
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// 서버 사이드에서만 사용할 클라이언트 (관리자 권한)
export const createSupabaseAdmin = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
} 