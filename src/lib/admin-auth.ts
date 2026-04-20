import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 이 프로젝트는 클라이언트 Supabase 인스턴스가 localStorage에 세션을 저장한다
 * (`src/lib/supabase.ts`의 `storage: window.localStorage`).
 * 쿠키 기반 `@supabase/ssr` SSR 세션이 구성돼 있지 않으므로, 서버 라우트는
 * 클라이언트가 `Authorization: Bearer <access_token>` 헤더로 보내는 토큰으로
 * 사용자 신원을 확인한다.
 */
export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 | 500; error: string; detail?: string }

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function getServiceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function assertAdminFromRequest(request: NextRequest, logTag = 'admin'): Promise<AdminAuthResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`[${logTag}] SUPABASE_SERVICE_ROLE_KEY env missing`)
    return { ok: false, status: 500, error: 'missing_service_role_key' }
  }
  const header = request.headers.get('authorization') || request.headers.get('Authorization')
  const token = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null
  if (!token) {
    return { ok: false, status: 401, error: 'unauthorized', detail: 'missing_bearer_token' }
  }
  const anon = getServerSupabase()
  const { data: auth, error: authErr } = await anon.auth.getUser(token)
  if (authErr || !auth.user?.id) {
    console.warn(`[${logTag}] auth.getUser failed:`, authErr?.message)
    return { ok: false, status: 401, error: 'unauthorized', detail: authErr?.message || 'invalid_token' }
  }
  const userId = auth.user.id
  const svc = getServiceRole()
  const { data: profile, error: profileErr } = await svc
    .from('users')
    .select('type')
    .eq('id', userId)
    .maybeSingle()
  if (profileErr) {
    console.error(`[${logTag}] profile query error:`, profileErr.message)
    return { ok: false, status: 500, error: 'profile_lookup_failed', detail: profileErr.message }
  }
  if (profile?.type !== 'admin') {
    console.warn(`[${logTag}] non-admin attempt. userId:`, userId, 'profile.type:', profile?.type)
    return { ok: false, status: 403, error: 'forbidden', detail: `type=${profile?.type ?? 'null'}` }
  }
  return { ok: true, userId }
}
