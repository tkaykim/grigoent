import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { buildQuoteDocument } from '@/components/quotes/QuoteDocument'
import { sendQuoteEmail } from '@/lib/email'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { quoteId, ccEmails } = await req.json()

    if (!quoteId) {
      return NextResponse.json({ error: '견적서 ID가 필요합니다.' }, { status: 400 })
    }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!quote.client_email) {
      return NextResponse.json(
        { error: '고객 이메일이 없습니다.' },
        { status: 400 }
      )
    }

    let pdfBuffer: Buffer
    try {
      const rawBuffer = await renderToBuffer(
        buildQuoteDocument({
          quote: {
            id: quote.id,
            items: quote.items || [],
            supply_amount: quote.supply_amount,
            vat: quote.vat,
            total_amount: quote.total_amount,
            valid_until: quote.valid_until,
            notes: quote.notes,
          },
          clientName: quote.client_name,
          clientCompany: quote.client_company,
          projectTitle: quote.project_title,
        })
      )
      pdfBuffer = Buffer.from(rawBuffer)
    } catch (pdfErr: any) {
      console.error('PDF 생성 실패:', pdfErr)
      return NextResponse.json(
        { error: `PDF 생성 실패: ${pdfErr.message}` },
        { status: 500 }
      )
    }

    const viewUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/quote/${quote.view_token}`
    const cc = ccEmails?.length ? ccEmails : undefined

    try {
      await sendQuoteEmail(
        quote.client_email,
        quote.client_name,
        pdfBuffer,
        viewUrl,
        {
          id: quote.id,
          items: quote.items || [],
          supply_amount: quote.supply_amount,
          vat: quote.vat,
          total_amount: quote.total_amount,
          valid_until: quote.valid_until,
          notes: quote.notes,
        },
        quote.client_company,
        quote.project_title,
        cc
      )
    } catch (emailErr: any) {
      console.error('이메일 발송 실패:', emailErr)
      return NextResponse.json(
        { error: `이메일 발송 실패: ${emailErr.message}` },
        { status: 500 }
      )
    }

    await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        client_response: 'pending',
      })
      .eq('id', quoteId)

    return NextResponse.json({ success: true, message: '견적서가 발송되었습니다.' })
  } catch (e: any) {
    console.error('견적서 발송 오류:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
