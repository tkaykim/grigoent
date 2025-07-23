import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 팀 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        leader:users!teams_leader_id_fkey(id, name, name_en, profile_image),
        member_count:team_members(count)
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Team fetch error:', error)
      return NextResponse.json({ error: '팀을 찾을 수 없습니다.' }, { status: 404 })
    }

    // member_count를 숫자로 변환
    const teamWithMemberCount = {
      ...team,
      member_count: team.member_count?.[0]?.count || 0
    }

    return NextResponse.json({ team: teamWithMemberCount })
  } catch (error) {
    console.error('Team API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 팀 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 팀 리더 권한 확인
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', user.id)
      .eq('role', 'leader')
      .single()

    if (memberError || !teamMember) {
      return NextResponse.json({ error: '팀 수정 권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      name_en,
      description,
      logo_url,
      cover_image,
      status
    } = body

    // 팀 수정
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update({
        name,
        name_en,
        description,
        logo_url,
        cover_image,
        status
      })
      .eq('id', params.id)
      .select(`
        *,
        leader:users!teams_leader_id_fkey(id, name, name_en, profile_image)
      `)
      .single()

    if (updateError) {
      console.error('Team update error:', updateError)
      return NextResponse.json({ error: '팀 수정에 실패했습니다.' }, { status: 500 })
    }

    // 팀 활동 로그 추가
    await supabase
      .from('team_activities')
      .insert({
        team_id: params.id,
        user_id: user.id,
        activity_type: 'project_updated',
        description: `팀 정보가 수정되었습니다.`
      })

    return NextResponse.json({ 
      team: updatedTeam,
      message: '팀이 성공적으로 수정되었습니다!'
    })

  } catch (error) {
    console.error('Team update error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 팀 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 팀 리더 권한 확인
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', user.id)
      .eq('role', 'leader')
      .single()

    if (memberError || !teamMember) {
      return NextResponse.json({ error: '팀 삭제 권한이 없습니다.' }, { status: 403 })
    }

    // 팀 삭제 (CASCADE로 인해 관련 데이터도 함께 삭제됨)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Team delete error:', deleteError)
      return NextResponse.json({ error: '팀 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: '팀이 성공적으로 삭제되었습니다!'
    })

  } catch (error) {
    console.error('Team delete error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 