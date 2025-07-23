import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 팀 멤버 역할 변경
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
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
      return NextResponse.json({ error: '팀 멤버 관리 권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    // 역할 검증
    if (!role || !['leader', 'member'].includes(role)) {
      return NextResponse.json({ error: '유효하지 않은 역할입니다.' }, { status: 400 })
    }

    // 팀 멤버 역할 변경
    const { data: updatedMember, error: updateError } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', params.id)
      .eq('user_id', params.userId)
      .select(`
        *,
        user:users(id, name, name_en, profile_image, type),
        team:teams(id, name, name_en)
      `)
      .single()

    if (updateError) {
      console.error('Team member role update error:', updateError)
      return NextResponse.json({ error: '팀 멤버 역할 변경에 실패했습니다.' }, { status: 500 })
    }

    // 팀 활동 로그 추가
    await supabase
      .from('team_activities')
      .insert({
        team_id: params.id,
        user_id: user.id,
        activity_type: 'project_updated',
        description: `팀 멤버의 역할이 변경되었습니다.`,
        metadata: { target_user_id: params.userId, new_role: role }
      })

    return NextResponse.json({ 
      member: updatedMember,
      message: '팀 멤버 역할이 성공적으로 변경되었습니다!'
    })

  } catch (error) {
    console.error('Team member role update error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 팀 멤버 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
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
      return NextResponse.json({ error: '팀 멤버 관리 권한이 없습니다.' }, { status: 403 })
    }

    // 자신을 제거하려는 경우 방지
    if (user.id === params.userId) {
      return NextResponse.json({ error: '자신을 팀에서 제거할 수 없습니다.' }, { status: 400 })
    }

    // 팀 멤버 제거
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', params.id)
      .eq('user_id', params.userId)

    if (deleteError) {
      console.error('Team member delete error:', deleteError)
      return NextResponse.json({ error: '팀 멤버 제거에 실패했습니다.' }, { status: 500 })
    }

    // 팀 활동 로그 추가
    await supabase
      .from('team_activities')
      .insert({
        team_id: params.id,
        user_id: user.id,
        activity_type: 'member_left',
        description: `팀 멤버가 제거되었습니다.`,
        metadata: { removed_user_id: params.userId }
      })

    return NextResponse.json({ 
      message: '팀 멤버가 성공적으로 제거되었습니다!'
    })

  } catch (error) {
    console.error('Team member removal error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 