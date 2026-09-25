import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_QUOTE_COLUMNS, isValidViewToken, toPublicQuote } from '@/lib/public-quote'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// 고객용 공개 조회: view_token 으로만 찾고, 발송된 견적만, 공개 필드만 반환한다.
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!isValidViewToken(token)) {
      return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 })
    }

    const supabase = getSupabase()
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(PUBLIC_QUOTE_COLUMNS)
      .eq('view_token', token)
      .eq('status', 'sent')
      .maybeSingle()

    if (error) {
      console.error('[quotes/view] lookup failed:', error.message)
      return NextResponse.json({ error: '견적서를 불러오지 못했습니다.' }, { status: 500 })
    }
    if (!quote) {
      return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ quote: toPublicQuote(quote) })
  } catch (e: any) {
    console.error('[quotes/view] error:', e?.message)
    return NextResponse.json({ error: '견적서를 불러오지 못했습니다.' }, { status: 500 })
  }
}
