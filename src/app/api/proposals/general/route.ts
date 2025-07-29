import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 일반 의뢰 생성 (로그인 없이)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
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
    if (!title || !description || !project_type || !client_name || !client_email) {
      return NextResponse.json({ 
        error: '필수 필드를 입력해주세요. (제목, 설명, 프로젝트 유형, 이름, 이메일)' 
      }, { status: 400 })
    }

    // 연락처 정보를 포함한 설명 생성
    const contactInfo = `\n\n[연락처 정보]\n이름: ${client_name}\n이메일: ${client_email}${client_phone ? `\n전화번호: ${client_phone}` : ''}`
    const fullDescription = `${description}${contactInfo}\n\n[일반 의뢰] 특정 댄서나 팀을 지정하지 않은 일반 의뢰입니다.`

    // 일반 의뢰 생성 - 실제 DB에 저장
    const { data: newProposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        client_id: null, // 익명이므로 null
        dancer_id: null, // 특정 댄서 지정하지 않음
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
      console.error('General proposal insert error:', insertError)
      return NextResponse.json({ error: '의뢰 저장에 실패했습니다.' }, { status: 500 })
    }

    console.log('General proposal created:', newProposal)

    return NextResponse.json({ 
      proposal: newProposal,
      message: '일반 의뢰가 성공적으로 전송되었습니다!'
    }, { status: 201 })

  } catch (error) {
    console.error('General proposal error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}