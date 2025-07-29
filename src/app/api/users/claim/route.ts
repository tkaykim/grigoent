import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 댄서 연동 신청
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
    const { claimedUserId, reason } = body

    if (!claimedUserId) {
      return NextResponse.json({ error: '연동할 댄서 ID가 필요합니다.' }, { status: 400 })
    }

    // 현재 사용자 정보 조회
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 일반 회원이나 댄서만 연동 신청 가능
    if (currentUser.type !== 'general' && currentUser.type !== 'dancer') {
      return NextResponse.json({ error: '일반 회원이나 댄서만 연동 신청이 가능합니다.' }, { status: 403 })
    }

    // 이미 연동 신청이 있는지 확인
    if (currentUser.claim_user_id) {
      return NextResponse.json({ error: '이미 연동 신청이 진행 중입니다.' }, { status: 400 })
    }

    // 연동할 댄서 정보 조회
    const { data: claimedUser, error: claimedUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', claimedUserId)
      .eq('type', 'dancer')
      .single()

    if (claimedUserError || !claimedUser) {
      return NextResponse.json({ error: '연동할 댄서를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 자기 자신을 연동하려는 경우 방지 (UUID가 같은 경우만)
    if (user.id === claimedUserId) {
      return NextResponse.json({ error: '자기 자신을 연동할 수 없습니다.' }, { status: 400 })
    }

    // 같은 이름의 계정인지 확인 (추가 검증) - 제거
    // if (currentUser.name === claimedUser.name && currentUser.name_en === claimedUser.name_en) {
    //   return NextResponse.json({ error: '같은 이름의 계정은 연동할 수 없습니다. 이미 동일한 계정이 존재합니다.' }, { status: 400 })
    // }

    // 연동 신청 업데이트
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        claim_user_id: claimedUserId,
        claim_status: 'pending',
        claim_reason: reason || null
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Claim request update error details:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      })
      return NextResponse.json({ error: '연동 신청에 실패했습니다.' }, { status: 500 })
    }

    console.log('Claim request created successfully:', { 
      userId: user.id, 
      claimedUserId, 
      reason,
      updatedUser: {
        id: updatedUser.id,
        name: updatedUser.name,
        claim_user_id: updatedUser.claim_user_id,
        claim_status: updatedUser.claim_status,
        claim_reason: updatedUser.claim_reason
      }
    })

    return NextResponse.json({ 
      message: '연동 신청이 완료되었습니다. 관리자 승인 후 연동됩니다.',
      claim: updatedUser
    })

  } catch (error) {
    console.error('Claim request error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}