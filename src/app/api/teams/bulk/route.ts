import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const body = await request.json()
    const { teams } = body // [{ name, name_en, slug, description, logo_url }]
    if (!Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json({ error: 'No teams data' }, { status: 400 })
    }
    // name, name_en, slug 필수
    const filteredTeams = teams.filter((row: any) => row.name && row.name_en && row.slug)
    if (filteredTeams.length === 0) {
      return NextResponse.json({ error: 'No valid teams (name, name_en, slug required)' }, { status: 400 })
    }
    const results = []
    for (const row of filteredTeams) {
      const teamId = uuidv4();
      const teamInsert = {
        id: teamId,
        name: row.name,
        name_en: row.name_en,
        slug: row.slug,
        description: row.description || null,
        logo_url: row.logo_url || null,
        status: 'active',
        created_at: new Date().toISOString(),
      }
      const { error: teamError } = await supabase.from('teams').insert(teamInsert)
      if (teamError) {
        results.push({ name: row.name, status: 'fail', error: teamError.message })
        continue
      }
      results.push({ name: row.name, status: 'success' })
    }
    return NextResponse.json({ results })
  } catch (e: any) {
    console.error('bulk team API error:', e);
    return NextResponse.json({ error: e?.message || String(e) || 'Server error' }, { status: 500 });
  }
} 