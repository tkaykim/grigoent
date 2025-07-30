import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 연결 시스템: 참조로 연결된 경력 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }

    // 1. 사용자가 직접 소유한 경력 데이터 조회
    const { data: ownedCareers, error: ownedError } = await supabase
      .from('career_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (ownedError) {
      console.error('Owned careers fetch error:', ownedError)
      return NextResponse.json({ error: '경력 데이터 조회에 실패했습니다.' }, { status: 500 })
    }

    // 2. 연결된 사용자의 경력 데이터 조회 (참조 연결)
    const { data: accessPermissions, error: permissionError } = await supabase
      .from('data_access_permissions')
      .select('original_owner_id')
      .eq('user_id', userId)
      .eq('data_type', 'career')
      .eq('access_level', 'write')

    if (permissionError) {
      console.error('Access permissions fetch error:', permissionError)
    }

    let linkedCareers: any[] = []
    
    if (accessPermissions && accessPermissions.length > 0) {
      // 연결된 사용자들의 ID 목록
      const linkedUserIds = accessPermissions.map(p => p.original_owner_id)
      
      // 연결된 사용자들의 경력 데이터 조회
      const { data: linkedData, error: linkedError } = await supabase
        .from('career_entries')
        .select('*')
        .in('user_id', linkedUserIds)
        .order('created_at', { ascending: false })

      if (linkedError) {
        console.error('Linked careers fetch error:', linkedError)
      } else {
        linkedCareers = linkedData || []
      }
    }

    // 3. 모든 경력 데이터 합치기 (소유 + 연결)
    const allCareers = [
      ...(ownedCareers || []).map(career => ({ ...career, is_linked: false })),
      ...linkedCareers.map(career => ({ ...career, is_linked: true }))
    ]

    // 4. 생성일 기준으로 정렬
    allCareers.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    console.log('Careers fetched successfully:', {
      userId,
      ownedCount: ownedCareers?.length || 0,
      linkedCount: linkedCareers.length,
      totalCount: allCareers.length
    })

    return NextResponse.json({ 
      careers: allCareers,
      total: allCareers.length,
      owned: ownedCareers?.length || 0,
      linked: linkedCareers.length
    })

  } catch (error) {
    console.error('Careers fetch error:', error)
    return NextResponse.json({ error: '경력 데이터 조회에 실패했습니다.' }, { status: 500 })
  }
}

// 경력 데이터 생성/수정 (연결된 데이터는 복사하여 새로 생성)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      careerData, 
      originalOwnerId = null // 연결된 데이터 수정 시 원본 소유자 ID
    } = body

    if (!userId || !careerData) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 })
    }

    // 권한 확인
    let canModify = false
    let targetUserId = userId

    if (originalOwnerId) {
      // 연결된 데이터 수정 시 권한 확인
      const { data: permission, error: permissionError } = await supabase
        .from('data_access_permissions')
        .select('access_level')
        .eq('user_id', userId)
        .eq('original_owner_id', originalOwnerId)
        .eq('data_type', 'career')
        .single()

      if (permissionError || !permission) {
        return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 })
      }

      if (permission.access_level === 'write' || permission.access_level === 'admin') {
        canModify = true
        // 연결된 데이터는 원본을 수정하지 않고 새로운 경력으로 생성
        targetUserId = userId // 수정자가 새로운 소유자가 됨
      }
    } else {
      // 자신의 데이터 수정
      canModify = true
    }

    if (!canModify) {
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 })
    }

    // 경력 데이터 생성/수정
    const { data: career, error } = await supabase
      .from('career_entries')
      .upsert({
        ...careerData,
        user_id: targetUserId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Career upsert error:', error)
      return NextResponse.json({ error: '경력 데이터 저장에 실패했습니다.' }, { status: 500 })
    }

    console.log('Career saved successfully:', {
      careerId: career.id,
      userId: targetUserId,
      isLinked: !!originalOwnerId
    })

    return NextResponse.json({ 
      career,
      message: originalOwnerId ? '연결된 경력 데이터가 복사되어 새로운 경력으로 생성되었습니다.' : '경력 데이터가 저장되었습니다.'
    })

  } catch (error) {
    console.error('Career save error:', error)
    return NextResponse.json({ error: '경력 데이터 저장에 실패했습니다.' }, { status: 500 })
  }
} 

// 경력 데이터 삭제 (연결된 데이터는 원본 보호)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      careerId, 
      userId, 
      originalOwnerId = null 
    } = body

    if (!careerId || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 })
    }

    // 권한 확인
    let canDelete = false

    if (originalOwnerId) {
      // 연결된 데이터 삭제 시 권한 확인
      const { data: permission, error: permissionError } = await supabase
        .from('data_access_permissions')
        .select('access_level')
        .eq('user_id', userId)
        .eq('original_owner_id', originalOwnerId)
        .eq('data_type', 'career')
        .single()

      if (permissionError || !permission) {
        return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
      }

      if (permission.access_level === 'admin') {
        canDelete = true
        // 관리자 권한만 원본 데이터 삭제 가능
      } else {
        // 일반 사용자는 원본 데이터 삭제 불가
        return NextResponse.json({ error: '연결된 경력 데이터는 삭제할 수 없습니다. 원본 소유자에게 문의하세요.' }, { status: 403 })
      }
    } else {
      // 자신의 데이터 삭제
      canDelete = true
    }

    if (!canDelete) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
    }

    // 경력 데이터 삭제
    const { error } = await supabase
      .from('career_entries')
      .delete()
      .eq('id', careerId)

    if (error) {
      console.error('Career delete error:', error)
      return NextResponse.json({ error: '경력 데이터 삭제에 실패했습니다.' }, { status: 500 })
    }

    console.log('Career deleted successfully:', {
      careerId,
      userId,
      isLinked: !!originalOwnerId
    })

    return NextResponse.json({ 
      message: originalOwnerId ? '연결된 경력 데이터가 삭제되었습니다.' : '경력 데이터가 삭제되었습니다.'
    })

  } catch (error) {
    console.error('Career delete error:', error)
    return NextResponse.json({ error: '경력 데이터 삭제에 실패했습니다.' }, { status: 500 })
  }
} 