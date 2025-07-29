import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 팀 섭외 제안 생성
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

    console.log('Authenticated user:', user.id)

    const body = await request.json()
    const {
      team_id,
      title,
      description,
      project_type,
      budget_min,
      budget_max,
      start_date,
      end_date,
      location,
      requirements
    } = body

    // 필수 필드 검증
    if (!team_id || !title || !description || !project_type) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 })
    }

    // 팀 존재 여부 확인
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, name, leader_id')
      .eq('id', team_id)
      .eq('status', 'active')
      .single()

    if (teamError || !teamData) {
      return NextResponse.json({ error: '존재하지 않는 팀입니다.' }, { status: 404 })
    }

    // 팀 리더에게 제안을 보내기 위해 dancer_id를 팀 리더로 설정
    const { data: newProposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        client_id: user.id,
        dancer_id: teamData.leader_id, // 팀 리더에게 제안
        title,
        description: `${description}\n\n[팀 제안] ${teamData.name} 팀에게 보낸 제안입니다.`,
        project_type,
        budget_min: budget_min || null,
        budget_max: budget_max || null,
        start_date: start_date || null,
        end_date: end_date || null,
        location: location || null,
        requirements: requirements || null,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Team proposal insert error:', insertError)
      return NextResponse.json({ error: '제안 저장에 실패했습니다.' }, { status: 500 })
    }

    console.log('Team proposal created:', newProposal)

    return NextResponse.json({ 
      proposal: newProposal,
      message: '팀 제안이 성공적으로 전송되었습니다!'
    }, { status: 201 })

  } catch (error) {
    console.error('Team proposal error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}