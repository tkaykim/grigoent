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

// deetz(에이전시 플랫폼)로 평판/미수·정산 제보 데이터 일원화 — 증빙을 deetz 스토리지로 직접 업로드.
// URL/anon 은 공개(퍼블리셔블) 값만. 서비스키는 여기 절대 두지 않음(서버 프록시가 deetz API로 위임).
const DEETZ_SUPABASE_URL =
  process.env.NEXT_PUBLIC_DEETZ_SUPABASE_URL || 'https://wvfmqiajdvbsevlhlgtl.supabase.co'
const DEETZ_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_DEETZ_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Zm1xaWFqZHZic2V2bGhsZ3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDk2ODYsImV4cCI6MjA4NTQyNTY4Nn0.PY9vTPlqNhzEJ0faMUhn7E4nT85oJ6RZ5K0rMoU4_Og'
export const deetzStorage = createClient(DEETZ_SUPABASE_URL, DEETZ_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
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