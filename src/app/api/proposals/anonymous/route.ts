import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 익명 제안 생성 (로그인 없이)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      project_type,
      budget_min,
      budget_max,
      start_date,
      end_date,
      location,
      requirements,
      status = 'pending',
      client_id = null,
      dancer_id = null,
      additional_info
    } = body

    // 필수 필드 검증
    if (!title || !description || !project_type) {
      return NextResponse.json({ 
        error: '필수 필드를 입력해주세요. (제목, 설명, 프로젝트 유형)' 
      }, { status: 400 })
    }

    // 설명에 추가 정보 포함
    const fullDescription = additional_info 
      ? `${description}\n\n${additional_info}`
      : description

    // 익명 제안 생성 - 실제 DB에 저장
    const { data: newProposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        client_id,
        dancer_id,
        title,
        description: fullDescription,
        project_type,
        budget_min: budget_min || null,
        budget_max: budget_max || null,
        start_date: start_date || null,
        end_date: end_date || null,
        location: location || null,
        requirements: requirements || null,
        status
      })
      .select()
      .single()

    if (insertError) {
      console.error('Anonymous proposal insert error:', insertError)
      return NextResponse.json({ error: '제안 저장에 실패했습니다.' }, { status: 500 })
    }

    console.log('Anonymous proposal created:', newProposal)

    return NextResponse.json({ 
      proposal: newProposal,
      message: '문의가 성공적으로 전송되었습니다! 확인 후 연락드리겠습니다.'
    }, { status: 201 })

  } catch (error) {
    console.error('Anonymous proposal creation error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 