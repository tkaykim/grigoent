import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('view_token', token)
      .eq('status', 'sent')
      .single()

    if (error || !quote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ quote })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
