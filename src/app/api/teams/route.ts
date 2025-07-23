import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 팀 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    let query = supabase
      .from('teams')
      .select(`
        *,
        leader:users!teams_leader_id_fkey(id, name, name_en, profile_image),
        member_count:team_members(count)
      `)
      .eq('status', status)

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit) || 10) - 1)
    }

    const { data: teams, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Teams fetch error:', error)
      return NextResponse.json({ error: '팀 목록 조회에 실패했습니다.' }, { status: 500 })
    }

    // member_count를 숫자로 변환
    const teamsWithMemberCount = teams?.map(team => ({
      ...team,
      member_count: team.member_count?.[0]?.count || 0
    }))

    return NextResponse.json({ teams: teamsWithMemberCount })
  } catch (error) {
    console.error('Teams API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 팀 생성
export async function POST(request: NextRequest) {
  try {
    // Authorization 헤더에서 Bearer 토큰 추출
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 토큰으로 사용자 정보 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      name_en,
      description,
      logo_url,
      cover_image
    } = body

    // 필수 필드 검증
    if (!name || !name_en) {
      return NextResponse.json({ error: '팀 이름을 입력해주세요.' }, { status: 400 })
    }

    // 팀 생성
    const { data: newTeam, error: insertError } = await supabase
      .from('teams')
      .insert({
        name,
        name_en,
        description,
        logo_url,
        cover_image,
        leader_id: user.id,
        status: 'active'
      })
      .select(`
        *,
        leader:users!teams_leader_id_fkey(id, name, name_en, profile_image)
      `)
      .single()

    if (insertError) {
      console.error('Team insert error:', insertError)
      return NextResponse.json({ error: '팀 생성에 실패했습니다.' }, { status: 500 })
    }

    // 팀 리더를 팀 멤버로 추가
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: newTeam.id,
        user_id: user.id,
        role: 'leader'
      })

    if (memberError) {
      console.error('Team member insert error:', memberError)
      // 멤버 추가 실패해도 팀 생성은 성공으로 처리
    }

    // 팀 활동 로그 추가
    await supabase
      .from('team_activities')
      .insert({
        team_id: newTeam.id,
        user_id: user.id,
        activity_type: 'project_created',
        description: `팀 "${name}"이 생성되었습니다.`
      })

    console.log('Team created:', newTeam)

    return NextResponse.json({ 
      team: newTeam,
      message: '팀이 성공적으로 생성되었습니다!'
    }, { status: 201 })

  } catch (error) {
    console.error('Team creation error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 