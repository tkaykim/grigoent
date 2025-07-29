import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 익명 팀 제안 생성 (로그인 없이)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      team_id,
      client_name,
      client_email,
      client_phone,
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
    if (!team_id || !title || !description || !project_type || !client_name || !client_email) {
      return NextResponse.json({ 
        error: '필수 필드를 입력해주세요. (팀 ID, 제목, 설명, 프로젝트 유형, 이름, 이메일)' 
      }, { status: 400 })
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

    // 연락처 정보를 포함한 설명 생성
    const contactInfo = `\n\n[연락처 정보]\n이름: ${client_name}\n이메일: ${client_email}${client_phone ? `\n전화번호: ${client_phone}` : ''}`
    const fullDescription = `${description}${contactInfo}\n\n[팀 제안] ${teamData.name} 팀에게 보낸 익명 제안입니다.`

    // 익명 팀 제안 생성 - 실제 DB에 저장
    const { data: newProposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        client_id: null, // 익명이므로 null
        dancer_id: teamData.leader_id, // 팀 리더에게 제안
        title,
        description: fullDescription,
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
      console.error('Anonymous team proposal insert error:', insertError)
      return NextResponse.json({ error: '제안 저장에 실패했습니다.' }, { status: 500 })
    }

    console.log('Anonymous team proposal created:', newProposal)

    return NextResponse.json({ 
      proposal: newProposal,
      message: '익명 팀 제안이 성공적으로 전송되었습니다!'
    }, { status: 201 })

  } catch (error) {
    console.error('Anonymous team proposal error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}