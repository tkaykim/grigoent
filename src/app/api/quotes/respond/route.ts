import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendQuoteResponseNotification } from '@/lib/email'
import { isValidViewToken } from '@/lib/public-quote'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const MAX_NOTE_LENGTH = 2000

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// 고객용 공개 응답: view_token 으로만 찾고, 발송됐고 아직 응답 전인 견적에만 한 번 기록한다.
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

    if (note != null && (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH)) {
      return NextResponse.json(
        { error: `메모는 ${MAX_NOTE_LENGTH}자 이내로 입력해 주세요.` },
        { status: 400 }
      )
    }

    if (!isValidViewToken(token)) {
      return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 })
    }

    const supabase = getSupabase()
    const { data: quote, error: findError } = await supabase
      .from('quotes')
      .select('id, client_name, client_company, total_amount, client_response')
      .eq('view_token', token)
      .eq('status', 'sent')
      .maybeSingle()

    if (findError) {
      console.error('[quotes/respond] lookup failed:', findError.message)
      return NextResponse.json({ error: '응답을 처리하지 못했습니다.' }, { status: 500 })
    }
    if (!quote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (quote.client_response && quote.client_response !== 'pending') {
      return NextResponse.json(
        { error: '이미 응답이 완료된 견적서입니다.' },
        { status: 409 }
      )
    }

    // 동시 요청이 두 번 기록되지 않도록 방금 읽은 "응답 전" 값일 때만 갱신한다.
    let update = supabase
      .from('quotes')
      .update({
        client_response: response,
        client_response_at: new Date().toISOString(),
        client_response_note: note || null,
      })
      .eq('id', quote.id)
    update = quote.client_response == null
      ? update.is('client_response', null)
      : update.eq('client_response', 'pending')
    const { data: updated, error: updateError } = await update.select('id')

    if (updateError) {
      console.error('[quotes/respond] update failed:', updateError.message)
      return NextResponse.json({ error: '응답을 처리하지 못했습니다.' }, { status: 500 })
    }
    if (!updated?.length) {
      return NextResponse.json(
        { error: '이미 응답이 완료된 견적서입니다.' },
        { status: 409 }
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
    console.error('[quotes/respond] error:', e?.message)
    return NextResponse.json({ error: '응답을 처리하지 못했습니다.' }, { status: 500 })
  }
}
