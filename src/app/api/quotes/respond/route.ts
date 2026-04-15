import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendQuoteResponseNotification } from '@/lib/email'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(req: NextRequest) {
  try {
    const { token, response, note } = await req.json()

    if (!token || !response) {
      return NextResponse.json(
        { error: '토큰과 응답이 필요합니다.' },
        { status: 400 }
      )
    }

    const validResponses = ['approved', 'revision_requested', 'rejected']
    if (!validResponses.includes(response)) {
      return NextResponse.json(
        { error: '유효하지 않은 응답입니다.' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()
    const { data: quote, error: findError } = await supabase
      .from('quotes')
      .select('*')
      .eq('view_token', token)
      .eq('status', 'sent')
      .single()

    if (findError || !quote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (quote.client_response && quote.client_response !== 'pending') {
      return NextResponse.json(
        { error: '이미 응답이 완료된 견적서입니다.' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        client_response: response,
        client_response_at: new Date().toISOString(),
        client_response_note: note || null,
      })
      .eq('id', quote.id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    try {
      await sendQuoteResponseNotification(
        quote.id,
        quote.client_name,
        quote.client_company,
        quote.total_amount,
        response,
        note
      )
    } catch (emailErr) {
      console.error('관리자 알림 이메일 발송 실패:', emailErr)
    }

    return NextResponse.json({ success: true, message: '응답이 저장되었습니다.' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
