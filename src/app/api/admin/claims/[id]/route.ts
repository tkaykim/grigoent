import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 연결 시스템: 데이터 복제가 아닌 참조 연결
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // 관리자 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('type')
      .eq('id', user.id)
      .single()

    if (userError || userData?.type !== 'admin') {
      return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 })
    }

    const { id: claimId } = await params // Next.js 14 params 처리 수정
    const body = await request.json()
    const { status, message } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 })
    }

    // 기존 연동 신청 정보 조회
    const { data: claim, error: claimError } = await supabase
      .from('users')
      .select('*')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json({ error: '연동 신청을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!claim.claim_user_id) {
      return NextResponse.json({ error: '연동 신청이 아닙니다.' }, { status: 400 })
    }

    // 새로운 연결 시스템으로 처리
    if (status === 'approved') {
      try {
        // 1. 연결 상태를 'active'로 업데이트
        const { error: connectionError } = await supabase
          .from('connection_status')
          .upsert({
            requester_id: claimId,
            target_user_id: claim.claim_user_id,
            status: 'active',
            connection_type: 'all',
            reason: claim.claim_reason,
            approved_by: user.id,
            approved_at: new Date().toISOString()
          })

        if (connectionError) {
          console.error('Connection status update error:', connectionError)
          return NextResponse.json({ error: '연결 상태 업데이트에 실패했습니다.' }, { status: 500 })
        }

        // 2. 데이터 접근 권한 부여 (복제하지 않고 참조 연결)
        const accessPermissions = [
          { data_type: 'career', access_level: 'write' },
          { data_type: 'profile', access_level: 'write' },
          { data_type: 'proposals', access_level: 'write' },
          { data_type: 'teams', access_level: 'write' }
        ]

        for (const permission of accessPermissions) {
          const { error: permissionError } = await supabase
            .from('data_access_permissions')
            .upsert({
              user_id: claimId,
              data_type: permission.data_type,
              original_owner_id: claim.claim_user_id,
              access_level: permission.access_level
            })

          if (permissionError) {
            console.error(`Permission error for ${permission.data_type}:`, permissionError)
          }
        }

        // 3. 기존 claim 정보 정리 (연결 시스템으로 완전 이관)
        const { error: cleanupError } = await supabase
          .from('users')
          .update({
            claim_user_id: null,
            claim_status: 'completed',
            claim_reason: null
          })
          .eq('id', claimId)

        if (cleanupError) {
          console.error('Claim cleanup error:', cleanupError)
        }

        // 4. 기존 댄서 계정을 가상 계정으로 표시 (중복 방지)
        const { error: deactivateError } = await supabase
          .from('users')
          .update({ 
            is_virtual: true,
            display_order: null
          })
          .eq('id', claim.claim_user_id)

        if (deactivateError) {
          console.error('Deactivate old user error:', deactivateError)
        }

        console.log('Connection established successfully:', { 
          requester: claimId, 
          target: claim.claim_user_id,
          permissions: accessPermissions.length
        })

      } catch (error) {
        console.error('Connection establishment error:', error)
        return NextResponse.json({ error: '연결 설정 중 오류가 발생했습니다.' }, { status: 500 })
      }
    } else {
      // 거절된 경우
      try {
        // 1. 연결 상태를 'rejected'로 업데이트
        const { error: connectionError } = await supabase
          .from('connection_status')
          .upsert({
            requester_id: claimId,
            target_user_id: claim.claim_user_id,
            status: 'rejected',
            connection_type: 'all',
            reason: message || '관리자에 의해 거절됨',
            approved_by: user.id,
            approved_at: new Date().toISOString()
          })

        if (connectionError) {
          console.error('Connection rejection error:', connectionError)
        }

        // 2. 기존 claim 정보 정리
        const { error: cleanupError } = await supabase
        .from('users')
        .update({
          claim_user_id: null,
            claim_status: 'rejected',
          claim_reason: null
        })
        .eq('id', claimId)

        if (cleanupError) {
          console.error('Claim cleanup error:', cleanupError)
        }

        console.log('Connection rejected:', { requester: claimId, target: claim.claim_user_id })

      } catch (error) {
        console.error('Connection rejection error:', error)
        return NextResponse.json({ error: '연결 거절 처리 중 오류가 발생했습니다.' }, { status: 500 })
      }
    }

    // 알림 생성
    try {
      await supabase
        .from('proposal_notifications')
        .insert({
          user_id: claimId,
          title: status === 'approved' ? '연결 승인' : '연결 거절',
          message: status === 'approved' 
            ? '연결 신청이 승인되었습니다. 기존 댄서 데이터에 접근할 수 있습니다.' 
            : '연결 신청이 거절되었습니다.',
          type: 'status_updated'
        })
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError)
    }

    console.log('Connection processed successfully:', { claimId, status })

    return NextResponse.json({ 
      message: status === 'approved' 
        ? '연결이 승인되었습니다. 데이터에 접근할 수 있습니다.' 
        : '연결이 거절되었습니다.',
      status 
    })

  } catch (error) {
    console.error('Connection processing error:', error)
    return NextResponse.json({ error: '요청 처리에 실패했습니다.' }, { status: 500 })
  }
}