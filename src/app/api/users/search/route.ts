import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 사용자 검색
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
      console.error('Auth error:', authError)
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: '검색어를 2자 이상 입력해주세요.' }, { status: 400 })
    }

    // 사용자 검색 (이름, 영문명, 이메일로 검색)
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        name_en,
        email,
        profile_image,
        type,
        introduction
      `)
      .or(`name.ilike.%${query}%,name_en.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('type', 'dancer') // 댄서만 검색
      .neq('id', user.id) // 로그인한 사용자 본인 제외
      .limit(10)

    if (error) {
      console.error('User search error:', error)
      return NextResponse.json({ error: '사용자 검색에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ users })

  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}