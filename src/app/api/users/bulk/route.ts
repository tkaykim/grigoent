import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// slug 중복 방지 함수
async function generateUniqueSlug(baseSlug: string, supabase: any) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const { data: existing } = await supabase.from('users').select('id').eq('slug', slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const body = await request.json()
    const { users } = body // [{ name, name_en, email, ... , teamsArr, careersArr }]
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'No users data' }, { status: 400 })
    }
    // name, name_en만 필수
    const filteredUsers = users.filter((row: any) => row.name && row.name_en);
    if (filteredUsers.length === 0) {
      return NextResponse.json({ error: 'No valid users (name, name_en required)' }, { status: 400 })
    }
    const results = []
    for (const row of filteredUsers) {
      // 1. users 등록
      const userId = uuidv4();
      const baseSlug = row.name_en ? row.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-') : uuidv4();
      const slug = await generateUniqueSlug(baseSlug, supabase);
      const userInsert = {
        id: userId,
        name: row.name,
        name_en: row.name_en,
        email: row.email || null,
        phone: row.phone || null,
        profile_image: row.profile_image || null,
        slug,
        type: row.type || 'dancer',
        display_order: row.display_order ? Number(row.display_order) : null,
        introduction: row.introduction || null,
        instagram_url: row.instagram_url || null,
        youtube_url: row.youtube_url || null,
        twitter_url: row.twitter_url || null,
        is_virtual: true,
        created_at: new Date().toISOString(),
      }
      const { error: userError } = await supabase.from('users').insert(userInsert)
      if (userError) {
        results.push({ email: row.email, status: 'fail', error: userError.message })
        continue
      }
      // 2. teams/팀멤버 등록
      let teamIds: string[] = []
      if (row.teamsArr && row.teamsArr.length > 0) {
        for (const teamName of row.teamsArr) {
          // 팀이 이미 있으면 사용, 없으면 생성
          let teamId = null
          const { data: existingTeam } = await supabase.from('teams').select('id').eq('name', teamName).maybeSingle()
          if (existingTeam) {
            teamId = existingTeam.id
          } else {
            teamId = uuidv4()
            await supabase.from('teams').insert({ id: teamId, name: teamName, name_en: teamName, slug: teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), status: 'active', created_at: new Date().toISOString() })
          }
          teamIds.push(teamId)
          // 팀멤버 등록
          await supabase.from('team_members').insert({ team_id: teamId, user_id: userId, role: 'member', joined_at: new Date().toISOString() })
        }
      }
      // 3. career_entries 등록
      if (row.careersArr && row.careersArr.length > 0) {
        for (const c of row.careersArr) {
          let date_type = c.date_type || '';
          let single_date = null, start_date = null, end_date = null;
          if (date_type === 'single') {
            single_date = c.single_date || null;
          } else if (date_type === 'range') {
            start_date = c.start_date || null;
            end_date = c.end_date || null;
          } else {
            // 구버전 호환: start_date, end_date만 있을 때
            start_date = c.start_date || null;
            end_date = c.end_date || null;
          }
          await supabase.from('career_entries').insert({
            user_id: userId,
            category: c.category || 'performance',
            title: c.title,
            description: c.description || '',
            country: c.country || 'Korea',
            date_type: date_type || null,
            single_date,
            start_date,
            end_date,
            created_at: new Date().toISOString(),
          })
        }
      }
      results.push({ email: row.email, status: 'success' })
    }
    return NextResponse.json({ results })
  } catch (e: any) {
    console.error('bulk API error:', e);
    return NextResponse.json({ error: e?.message || String(e) || 'Server error' }, { status: 500 });
  }
} 