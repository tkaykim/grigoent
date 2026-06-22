import 'server-only'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { User, Team } from '@/lib/types'

// 공개 데이터 전용 서버 클라이언트 (세션 불필요 · anon 키로 public select)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function publicClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type HomeOrderedItem = { type: 'artist' | 'team'; data: User | Team }

export type FeaturedWork = {
  id: string
  title: string
  description?: string
  video_url?: string
  poster_url?: string
  category: string
  artist: { id: string; name: string; slug: string }
  created_at: string
}

const ARTIST_COLS = 'id, slug, name, name_en, profile_image, introduction, display_order'
const TEAM_COLS = 'id, slug, name, name_en, logo_url, description, status, display_order'

/**
 * 홈/아티스트 통합 순서 목록 (최대 limit개).
 * 기존 클라이언트 ArtistsSection 로직을 서버로 옮긴 것 — display_order_items 기준 정렬.
 */
async function fetchHomeArtistsUncached(limit: number): Promise<HomeOrderedItem[]> {
  const supabase = publicClient()

  const [orderRes, artistsRes, teamsRes] = await Promise.all([
    supabase.from('display_order_items').select('item_type, item_id, display_order').order('display_order', { ascending: true }),
    supabase.from('users').select(ARTIST_COLS).eq('type', 'dancer').order('display_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('teams').select(TEAM_COLS).eq('status', 'active').order('display_order', { ascending: true }).order('created_at', { ascending: false }),
  ])

  const artists = (artistsRes.data as unknown as User[]) ?? []
  const teams = (teamsRes.data as unknown as Team[]) ?? []
  const orderItems = orderRes.error ? [] : (orderRes.data ?? [])

  const ordered: HomeOrderedItem[] = []

  if (orderItems.length > 0) {
    for (const o of orderItems as Array<{ item_type: string; item_id: string }>) {
      if (o.item_type === 'artist') {
        const a = artists.find((x) => x.id === o.item_id)
        if (a) ordered.push({ type: 'artist', data: a })
      } else if (o.item_type === 'team') {
        const t = teams.find((x) => x.id === o.item_id)
        if (t) ordered.push({ type: 'team', data: t })
      }
    }
  }

  // 순서표가 비었거나 매칭이 없으면 아티스트 기본 정렬로 폴백
  if (ordered.length === 0) {
    for (const a of artists) ordered.push({ type: 'artist', data: a })
  }

  return ordered.slice(0, limit)
}

async function fetchFeaturedWorksUncached(limit: number): Promise<FeaturedWork[]> {
  const supabase = publicClient()

  const { data: careers, error } = await supabase
    .from('career_entries')
    .select('id, title, description, video_url, poster_url, category, created_at, user_id')
    .eq('is_featured', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error || !careers || careers.length === 0) return []

  const userIds = [...new Set(careers.map((c: { user_id: string }) => c.user_id))]
  const { data: users } = await supabase.from('users').select('id, name, slug').in('id', userIds)

  return careers.map((c: Record<string, unknown>) => {
    const u = (users ?? []).find((x: { id: string }) => x.id === c.user_id)
    return {
      id: c.id as string,
      title: c.title as string,
      description: c.description as string | undefined,
      video_url: c.video_url as string | undefined,
      poster_url: c.poster_url as string | undefined,
      category: (c.category as string) || '안무제작',
      created_at: c.created_at as string,
      artist: u
        ? { id: u.id, name: u.name, slug: u.slug }
        : { id: c.user_id as string, name: 'Unknown Artist', slug: '' },
    }
  })
}

// 5분 ISR 캐시 — 목록이 자주 바뀌지 않으므로 방문자마다 라이브 쿼리 제거
export const getHomeArtists = unstable_cache(
  (limit: number = 8) => fetchHomeArtistsUncached(limit),
  ['home-artists'],
  { revalidate: 300, tags: ['home-artists'] }
)

export const getFeaturedWorks = unstable_cache(
  (limit: number = 6) => fetchFeaturedWorksUncached(limit),
  ['home-featured-works'],
  { revalidate: 300, tags: ['home-featured-works'] }
)
