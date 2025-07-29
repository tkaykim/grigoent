import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 연결 요청 목록 조회 (관리자 전용)
export async function GET(request: NextRequest) {
  try {
    console.log('API called - starting...')
    
    // Authorization 헤더에서 Bearer 토큰 추출
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth header')
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted')
    
    // 토큰으로 사용자 정보 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    // 관리자 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('type')
      .eq('id', user.id)
      .single()

    if (userError || userData?.type !== 'admin') {
      console.log('Not admin:', userData?.type)
      return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 })
    }

    console.log('Admin verified')

    // 연결 요청이 있는 사용자들 조회 (최대한 단순화)
    console.log('Starting database query...')
    
    const { data: claims, error } = await supabase
      .from('users')
      .select('id, name, email, claim_user_id, claim_status')
      .not('claim_user_id', 'is', null)

    console.log('Database query result:', { claims: claims?.length, error })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: '연결 요청 조회에 실패했습니다.' }, { status: 500 })
    }

    console.log('Success - returning claims')
    return NextResponse.json({ claims: claims || [] })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}