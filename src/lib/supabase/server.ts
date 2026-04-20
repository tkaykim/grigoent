import { createServerClient } from '@supabase/ssr'
import type { cookies } from 'next/headers'

// Next.js 15에서 `cookies()`는 Promise를 반환하므로,
// 호출자는 반드시 `const cookieStore = await cookies()` 처럼 미리 await해서 넘겨야 한다.
type AwaitedCookieStore = Awaited<ReturnType<typeof cookies>>

export function createClient(cookieStore: AwaitedCookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // 쿠키를 설정할 수 없는 경우 무시 (RSC 중)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // 쿠키를 삭제할 수 없는 경우 무시
          }
        },
      },
    }
  )
}
