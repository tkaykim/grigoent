import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 팀 멤버 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: members, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user:users(id, name, name_en, profile_image, type),
        team:teams(id, name, name_en)
      `)
      .eq('team_id', params.id)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Team members fetch error:', error)
      return NextResponse.json({ error: '팀 멤버 목록 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Team members API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 팀 멤버 추가
export async function POST(
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

    // 팀 리더 또는 관리자 권한 확인
    // 1. 팀 리더 체크
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', user.id)
      .eq('role', 'leader')
      .single();
    // 2. 관리자 체크 (users.type === 'admin')
    const { data: profile, error: profileError } = await supabase.from('users').select('type').eq('id', user.id).single();
    if (profileError || !profile) {
      console.error('관리자 profile 조회 실패', profileError, profile, user.id);
      return NextResponse.json({ error: '관리자 profile 조회 실패', detail: profileError, userId: user.id }, { status: 500 });
    }
    const isAdmin = profile?.type === 'admin';
    if ((!teamMember || memberError) && !isAdmin) {
      console.error('팀 멤버 관리 권한 없음', { teamMember, memberError, isAdmin, userId: user.id });
      return NextResponse.json({ error: '팀 멤버 관리 권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json()
    const {
      user_id,
      role = 'member'
    } = body

    // 필수 필드 검증
    if (!user_id) {
      console.error('user_id 누락', { user_id });
      return NextResponse.json({ error: '사용자 ID를 입력해주세요.' }, { status: 400 });
    }

    // 이미 팀 멤버인지 확인
    const { data: existingMember, error: checkError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', params.id)
      .eq('user_id', user_id)
      .single()

    if (existingMember) {
      console.error('이미 팀 멤버', { user_id, team_id: params.id });
      return NextResponse.json({ error: '이미 팀 멤버입니다.' }, { status: 400 })
    }

    // 팀 멤버 추가
    const { data: newMember, error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: params.id,
        user_id,
        role
      })
      .select(`
        *,
        user:users(id, name, name_en, profile_image, type),
        team:teams(id, name, name_en)
      `)
      .single()

    if (insertError) {
      console.error('Team member insert error:', insertError, { user_id, team_id: params.id });
      return NextResponse.json({ error: '팀 멤버 추가에 실패했습니다.' }, { status: 500 })
    }

    // 팀 활동 로그 추가
    await supabase
      .from('team_activities')
      .insert({
        team_id: params.id,
        user_id: user.id,
        activity_type: 'member_joined',
        description: `새로운 멤버가 팀에 추가되었습니다.`,
        metadata: { added_user_id: user_id, role }
      })

    return NextResponse.json({ 
      member: newMember,
      message: '팀 멤버가 성공적으로 추가되었습니다!'
    }, { status: 201 })

  } catch (error) {
    console.error('Team member addition error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 