import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quotes: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const {
      inquiry_id,
      client_name,
      client_email,
      client_phone,
      client_company,
      project_title,
      project_type,
      items,
      supply_amount,
      vat,
      total_amount,
      valid_until,
      notes,
    } = body

    if (!client_name || !client_email) {
      return NextResponse.json(
        { error: '고객 이름과 이메일은 필수입니다.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        inquiry_id: inquiry_id || null,
        client_name,
        client_email,
        client_phone: client_phone || '',
        client_company: client_company || '',
        project_title: project_title || '',
        project_type: project_type || '',
        items: items || [],
        supply_amount: supply_amount || 0,
        vat: vat || 0,
        total_amount: total_amount || 0,
        valid_until: valid_until || null,
        notes: notes || '',
        status: 'draft',
        view_token: randomUUID(),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quote: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const { id, cc_emails, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: '견적서 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quote: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
