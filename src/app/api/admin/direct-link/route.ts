import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 관리자 직접 연동 처리
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

    // 관리자 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('type')
      .eq('id', user.id)
      .single()

    if (userError || userData?.type !== 'admin') {
      return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, dancerId, reason } = body

    if (!userId || !dancerId) {
      return NextResponse.json({ error: '사용자 ID와 댄서 ID가 필요합니다.' }, { status: 400 })
    }

    // 연동할 사용자 정보 조회
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: '연동할 사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 연동할 댄서 정보 조회
    const { data: dancerUser, error: dancerUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', dancerId)
      .eq('type', 'dancer')
      .single()

    if (dancerUserError || !dancerUser) {
      return NextResponse.json({ error: '연동할 댄서를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 자기 자신을 연동하려는 경우 방지
    if (userId === dancerId) {
      return NextResponse.json({ error: '자기 자신을 연동할 수 없습니다.' }, { status: 400 })
    }

    // 업데이트할 정보 준비
    const updateData: any = {}

    // 일반 회원인 경우: 기존 댄서 정보로 완전 교체
    if (targetUser.type === 'general') {
      updateData.name = dancerUser.name
      updateData.name_en = dancerUser.name_en
      updateData.type = dancerUser.type
      updateData.introduction = dancerUser.introduction
      updateData.instagram_url = dancerUser.instagram_url
      updateData.twitter_url = dancerUser.twitter_url
      updateData.youtube_url = dancerUser.youtube_url
      updateData.profile_image = dancerUser.profile_image
      updateData.display_order = dancerUser.display_order
    }
    // 댄서 계정인 경우: 기존 정보와 병합 (빈 필드만 채움)
    else if (targetUser.type === 'dancer') {
      if (!targetUser.introduction && dancerUser.introduction) {
        updateData.introduction = dancerUser.introduction
      }
      if (!targetUser.instagram_url && dancerUser.instagram_url) {
        updateData.instagram_url = dancerUser.instagram_url
      }
      if (!targetUser.twitter_url && dancerUser.twitter_url) {
        updateData.twitter_url = dancerUser.twitter_url
      }
      if (!targetUser.youtube_url && dancerUser.youtube_url) {
        updateData.youtube_url = dancerUser.youtube_url
      }
      if (!targetUser.profile_image && dancerUser.profile_image) {
        updateData.profile_image = dancerUser.profile_image
      }
      if (!targetUser.display_order && dancerUser.display_order) {
        updateData.display_order = dancerUser.display_order
      }
    }

    // 사용자 정보 업데이트
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('User update error:', updateError)
      return NextResponse.json({ error: '사용자 정보 업데이트에 실패했습니다.' }, { status: 500 })
    }

    // 경력 정보 연동 (기존 댄서의 경력을 새 사용자에게 병합)
    try {
      // 기존 댄서의 경력 정보 조회
      const { data: dancerCareerEntries, error: dancerCareerError } = await supabase
        .from('career_entries')
        .select('*')
        .eq('user_id', dancerId)

      // 새 사용자의 기존 경력 정보 조회
      const { data: userCareerEntries, error: userCareerError } = await supabase
        .from('career_entries')
        .select('*')
        .eq('user_id', userId)

      if (dancerCareerError) {
        console.error('Dancer career entries fetch error:', dancerCareerError)
      } else if (dancerCareerEntries && dancerCareerEntries.length > 0) {
        // 기존 댄서의 경력 정보를 새 사용자에게 병합 (중복 방지)
        for (const dancerEntry of dancerCareerEntries) {
          // 동일한 경력이 이미 있는지 확인
          const existingEntry = userCareerEntries?.find(userEntry => 
            userEntry.title === dancerEntry.title && 
            userEntry.description === dancerEntry.description &&
            userEntry.year === dancerEntry.year
          )

          if (!existingEntry) {
            // 중복되지 않는 경력만 추가
            const { error: insertError } = await supabase
              .from('career_entries')
              .insert({
                user_id: userId,
                title: dancerEntry.title,
                description: dancerEntry.description,
                year: dancerEntry.year,
                type: dancerEntry.type,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            if (insertError) {
              console.error('Career entry insert error:', insertError)
            }
          }
        }
        console.log(`Merged career entries from ${dancerId} to ${userId}`)
      }
    } catch (careerError) {
      console.error('Career linking error:', careerError)
      // 경력 연동 실패해도 메인 처리는 성공으로 처리
    }

    // 팀 멤버십 연동 (기존 댄서의 팀 멤버십을 새 사용자에게 병합)
    try {
      // 기존 댄서의 팀 멤버십 조회
      const { data: dancerTeamMemberships, error: dancerTeamError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', dancerId)

      // 새 사용자의 기존 팀 멤버십 조회
      const { data: userTeamMemberships, error: userTeamError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', userId)

      if (dancerTeamError) {
        console.error('Dancer team memberships fetch error:', dancerTeamError)
      } else if (dancerTeamMemberships && dancerTeamMemberships.length > 0) {
        // 기존 댄서의 팀 멤버십을 새 사용자에게 병합 (중복 방지)
        for (const dancerMembership of dancerTeamMemberships) {
          // 동일한 팀 멤버십이 이미 있는지 확인
          const existingMembership = userTeamMemberships?.find(userMembership => 
            userMembership.team_id === dancerMembership.team_id
          )

          if (!existingMembership) {
            // 중복되지 않는 팀 멤버십만 추가
            const { error: insertError } = await supabase
              .from('team_members')
              .insert({
                user_id: userId,
                team_id: dancerMembership.team_id,
                role: dancerMembership.role,
                joined_at: new Date().toISOString()
              })

            if (insertError) {
              console.error('Team membership insert error:', insertError)
            }
          }
        }
        console.log(`Merged team memberships from ${dancerId} to ${userId}`)
      }
    } catch (teamError) {
      console.error('Team membership linking error:', teamError)
      // 팀 멤버십 연동 실패해도 메인 처리는 성공으로 처리
    }

    // 제안 정보 연동 (기존 댄서의 제안 정보를 새 사용자에게 병합)
    try {
      // 기존 댄서가 보낸 제안 정보 조회
      const { data: dancerSentProposals, error: dancerSentError } = await supabase
        .from('proposals')
        .select('*')
        .eq('user_id', dancerId)

      // 새 사용자가 보낸 제안 정보 조회
      const { data: userSentProposals, error: userSentError } = await supabase
        .from('proposals')
        .select('*')
        .eq('user_id', userId)

      if (dancerSentError) {
        console.error('Dancer sent proposals fetch error:', dancerSentError)
      } else if (dancerSentProposals && dancerSentProposals.length > 0) {
        // 기존 댄서가 보낸 제안을 새 사용자에게 병합 (중복 방지)
        for (const dancerProposal of dancerSentProposals) {
          // 동일한 제안이 이미 있는지 확인
          const existingProposal = userSentProposals?.find(userProposal => 
            userProposal.title === dancerProposal.title && 
            userProposal.description === dancerProposal.description &&
            userProposal.budget === dancerProposal.budget
          )

          if (!existingProposal) {
            // 중복되지 않는 제안만 추가
            const { error: insertError } = await supabase
              .from('proposals')
              .insert({
                user_id: userId,
                title: dancerProposal.title,
                description: dancerProposal.description,
                budget: dancerProposal.budget,
                type: dancerProposal.type,
                status: dancerProposal.status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            if (insertError) {
              console.error('Proposal insert error:', insertError)
            }
          }
        }
        console.log(`Merged sent proposals from ${dancerId} to ${userId}`)
      }

      // 기존 댄서가 받은 제안 정보 조회 (팀 제안 포함)
      const { data: dancerReceivedProposals, error: dancerReceivedError } = await supabase
        .from('proposals')
        .select('*')
        .or(`team_id.eq.${dancerId},client_id.eq.${dancerId}`)

      if (dancerReceivedError) {
        console.error('Dancer received proposals fetch error:', dancerReceivedError)
      } else if (dancerReceivedProposals && dancerReceivedProposals.length > 0) {
        // 기존 댄서가 받은 제안을 새 사용자에게 병합
        for (const dancerProposal of dancerReceivedProposals) {
          // 제안의 팀 멤버십이나 클라이언트 정보를 새 사용자로 업데이트
          if (dancerProposal.team_id === dancerId) {
            // 팀 제안인 경우 팀 멤버십이 새 사용자에게 있는지 확인
            const { data: userTeamMembership } = await supabase
              .from('team_members')
              .select('team_id')
              .eq('user_id', userId)
              .eq('team_id', dancerProposal.team_id)
              .single()

            if (userTeamMembership) {
              // 팀 멤버십이 있으면 제안을 새 사용자 팀으로 업데이트
              await supabase
                .from('proposals')
                .update({ team_id: userTeamMembership.team_id })
                .eq('id', dancerProposal.id)
            }
          }
        }
        console.log(`Updated received proposals for ${userId}`)
      }
    } catch (proposalError) {
      console.error('Proposal linking error:', proposalError)
      // 제안 연동 실패해도 메인 처리는 성공으로 처리
    }

    // 연동 로그 생성 (선택사항)
    try {
      await supabase
        .from('proposal_notifications')
        .insert({
          user_id: userId,
          type: 'status_updated',
          title: '관리자 직접 연동 처리',
          message: `관리자에 의해 ${dancerUser.name} 댄서 정보와 연동되었습니다. 프로필 정보, 경력 정보, 팀 멤버십, 제안 정보가 모두 병합되었습니다.${reason ? `\n\n사유: ${reason}` : ''}`
        })
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError)
      // 알림 생성 실패해도 메인 처리는 성공으로 처리
    }

    console.log('Direct link completed:', { userId, dancerId, reason })

    return NextResponse.json({ 
      message: '연동이 완료되었습니다.',
      user: updatedUser
    })

  } catch (error) {
    console.error('Direct link error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}