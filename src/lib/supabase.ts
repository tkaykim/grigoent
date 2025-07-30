import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

// 개발 모드에서 환경 변수가 없을 때 경고만 출력
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.')
  console.warn('실제 Supabase URL을 설정해주세요.')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다.')
  console.warn('실제 Supabase Anon Key를 설정해주세요.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase-auth-token'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.x'
    }
  }
})

// 서버 사이드에서만 사용할 클라이언트 (관리자 권한)
export const createSupabaseAdmin = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.')
    console.warn('실제 Supabase Service Role Key를 설정해주세요.')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
} 