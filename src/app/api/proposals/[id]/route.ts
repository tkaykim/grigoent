import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 제안 상태 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('PATCH request received for proposal:', params.id)
    
    // Authorization 헤더에서 Bearer 토큰 추출
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header')
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)
    
    // 토큰으로 사용자 정보 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    const proposalId = params.id
    const body = await request.json()
    const { status, message } = body

    console.log('Request body:', { status, message })

    // 상태 검증 - 새로운 프로젝트 상태들 포함
    const validStatuses = [
      'pending', 'consulting', 'scheduled', 'in_progress', 
      'completed', 'cancelled', 'rejected', 'expired'
    ]
    
    if (!status || !validStatuses.includes(status)) {
      console.error('Invalid status:', status, 'Valid statuses:', validStatuses)
      return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 })
    }

    // 제안 조회
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (fetchError || !proposal) {
      console.error('Proposal fetch error:', fetchError)
      return NextResponse.json({ error: '제안을 찾을 수 없습니다.' }, { status: 404 })
    }

    console.log('Proposal found:', { id: proposal.id, title: proposal.title, currentStatus: proposal.status })

    // 권한 확인 - 제안을 받은 사람(dancer_id) 또는 보낸 사람(client_id)만 상태를 변경할 수 있음
    const isDancer = proposal.dancer_id === user.id
    const isClient = proposal.client_id === user.id
    
    console.log('Permission check:', { 
      userId: user.id, 
      dancerId: proposal.dancer_id, 
      clientId: proposal.client_id,
      isDancer, 
      isClient 
    })
    
    if (!isDancer && !isClient) {
      console.error('Permission denied for user:', user.id)
      return NextResponse.json({ error: '제안 상태를 변경할 권한이 없습니다.' }, { status: 403 })
    }

    // 상태 업데이트
    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)
      .select()
      .single()

    if (updateError) {
      console.error('Proposal update error:', updateError)
      return NextResponse.json({ error: '제안 상태 업데이트에 실패했습니다.' }, { status: 500 })
    }

    console.log('Proposal updated successfully:', updatedProposal)

    // 메시지가 있으면 proposal_messages 테이블에 저장
    if (message && message.trim()) {
      const { error: messageError } = await supabase
        .from('proposal_messages')
        .insert({
          proposal_id: proposalId,
          sender_id: user.id,
          message: message.trim()
        })

      if (messageError) {
        console.error('Message insert error:', messageError)
        // 메시지 저장 실패해도 제안 상태 업데이트는 성공으로 처리
      } else {
        console.log('Message inserted successfully')
      }
    }

    // 알림 생성
    const notificationTitle = getNotificationTitle(status)
    const notificationMessage = getNotificationMessage(status, proposal.title)
    
    // 상대방에게 알림 전송
    const recipientId = isDancer ? proposal.client_id : proposal.dancer_id
    if (recipientId) {
      const { error: notificationError } = await supabase
        .from('proposal_notifications')
        .insert({
          user_id: recipientId,
          proposal_id: proposalId,
          type: 'status_updated',
          title: notificationTitle,
          message: notificationMessage
        })

      if (notificationError) {
        console.error('Notification insert error:', notificationError)
      } else {
        console.log('Notification sent to:', recipientId)
      }
    }

    console.log('Proposal status update completed successfully')

    return NextResponse.json({ 
      proposal: updatedProposal,
      message: `프로젝트 상태가 업데이트되었습니다.`
    })

  } catch (error) {
    console.error('Proposal status update error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 알림 제목 생성
function getNotificationTitle(status: string): string {
  const titles: { [key: string]: string } = {
    'consulting': '프로젝트 상담 단계로 진행',
    'scheduled': '프로젝트 진행 예정으로 확정',
    'in_progress': '프로젝트 시작',
    'completed': '프로젝트 완료',
    'cancelled': '프로젝트 취소',
    'rejected': '프로젝트 거절',
    'expired': '프로젝트 만료'
  }
  return titles[status] || '프로젝트 상태 변경'
}

// 알림 메시지 생성
function getNotificationMessage(status: string, projectTitle: string): string {
  const messages: { [key: string]: string } = {
    'consulting': `"${projectTitle}" 프로젝트가 상담 단계로 진행되었습니다.`,
    'scheduled': `"${projectTitle}" 프로젝트가 진행 예정으로 확정되었습니다.`,
    'in_progress': `"${projectTitle}" 프로젝트가 시작되었습니다.`,
    'completed': `"${projectTitle}" 프로젝트가 성공적으로 완료되었습니다.`,
    'cancelled': `"${projectTitle}" 프로젝트가 취소되었습니다.`,
    'rejected': `"${projectTitle}" 프로젝트가 거절되었습니다.`,
    'expired': `"${projectTitle}" 프로젝트가 만료되었습니다.`
  }
  return messages[status] || `"${projectTitle}" 프로젝트의 상태가 변경되었습니다.`
} 