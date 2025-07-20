import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 섭외 제안 생성
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
      dancer_id,
      title,
      description,
      project_type,
      budget_min,
      budget_max,
      budget_currency,
      budget_min_undecided,
      budget_max_undecided,
      start_date,
      end_date,
      location,
      requirements
    } = body

    // 필수 필드 검증
    if (!dancer_id || !title || !description || !project_type) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 })
    }

    // 자신에게는 제안할 수 없음
    if (user.id === dancer_id) {
      return NextResponse.json({ error: '자신에게는 제안할 수 없습니다.' }, { status: 400 })
    }

    // 클라이언트 권한 확인 (임시로 제거 - 모든 사용자가 제안 가능)
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('type')
        .eq('id', user.id)
        .single()

      if (userError) {
        console.error('User data fetch error:', userError)
        // 사용자 데이터 조회 실패해도 제안은 가능하도록 처리
      } else {
        console.log('User data from API:', userData)
      }
    } catch (error) {
      console.error('User data check error:', error)
      // 에러가 발생해도 제안은 가능하도록 처리
    }
    
    // 모든 사용자가 제안할 수 있도록 권한 제한 제거
    // if (!userData || (userData.role !== 'client' && userData.role !== 'admin')) {
    //   return NextResponse.json({ error: '클라이언트만 섭외 제안을 보낼 수 있습니다.' }, { status: 403 })
    // }

    // 제안 생성 - 실제 DB에 저장
    const { data: newProposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        client_id: user.id,
        dancer_id,
        title,
        description,
        project_type,
        budget_min: budget_min_undecided ? null : budget_min,
        budget_max: budget_max_undecided ? null : budget_max,
        start_date,
        end_date,
        location,
        requirements,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Proposal insert error:', insertError)
      return NextResponse.json({ error: '제안 저장에 실패했습니다.' }, { status: 500 })
    }

    console.log('Proposal created:', newProposal)

    return NextResponse.json({ 
      proposal: newProposal,
      message: '제안이 성공적으로 전송되었습니다!'
    }, { status: 201 })

  } catch (error) {
    console.error('Proposal creation error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 섭외 제안 조회 (사용자별)
export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'sent' 또는 'received'
    const status = searchParams.get('status')

    let query = supabase
      .from('proposals')
      .select(`
        *,
        client:users!proposals_client_id_fkey(id, name, name_en, profile_image),
        dancer:users!proposals_dancer_id_fkey(id, name, name_en, profile_image)
      `)

    // 타입에 따른 필터링
    if (type === 'sent') {
      query = query.eq('client_id', user.id)
    } else if (type === 'received') {
      query = query.eq('dancer_id', user.id)
    } else {
      // 기본값: 사용자가 관련된 모든 제안
      query = query.or(`client_id.eq.${user.id},dancer_id.eq.${user.id}`)
    }

    // 상태 필터링
    if (status) {
      query = query.eq('status', status)
    }

    // 최신순 정렬
    query = query.order('created_at', { ascending: false })

    const { data: proposals, error } = await query

    if (error) {
      console.error('Proposal fetch error:', error)
      return NextResponse.json({ error: '제안 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ proposals })

  } catch (error) {
    console.error('Proposal fetch error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 