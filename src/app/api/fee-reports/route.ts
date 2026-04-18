import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const MAX_LEN = {
  counterparty_note: 4000,
  amount_note: 2000,
  pay_type_note: 2000,
  facts: 12000,
  reporter_name: 200,
  reporter_contact: 500,
  reporter_instagram: 100,
} as const

const ALLOWED_CATEGORIES = new Set([
  'choreography',
  'performance',
  'dancer_casting',
  'advertisement',
  'other',
])

const ALLOWED_CLIENT = new Set(['company', 'individual', 'unknown'])

function clampString(s: unknown, max: number): string {
  if (typeof s !== 'string') return ''
  const t = s.trim()
  return t.length > max ? t.slice(0, max) : t
}

/** @ 앞뒤 공백 제거, 허위 제보 방지용 식별자로만 저장 */
function normalizeInstagram(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let s = raw.trim()
  if (s.startsWith('@')) s = s.slice(1).trim()
  return s
}

function isValidInstagramHandle(s: string): boolean {
  if (s.length < 1 || s.length > MAX_LEN.reporter_instagram) return false
  return /^[a-zA-Z0-9._]+$/.test(s)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const work_categories = Array.isArray(body.work_categories)
      ? body.work_categories.filter((c: unknown) => typeof c === 'string' && ALLOWED_CATEGORIES.has(c))
      : []

    if (work_categories.length === 0) {
      return NextResponse.json({ error: 'work_categories_required' }, { status: 400 })
    }

    const client_type = typeof body.client_type === 'string' ? body.client_type : ''
    if (!ALLOWED_CLIENT.has(client_type)) {
      return NextResponse.json({ error: 'invalid_client_type' }, { status: 400 })
    }

    const counterparty_note = clampString(body.counterparty_note, MAX_LEN.counterparty_note)
    const amount_note = clampString(body.amount_note, MAX_LEN.amount_note)
    const pay_type_note = clampString(body.pay_type_note, MAX_LEN.pay_type_note)
    const facts = clampString(body.facts, MAX_LEN.facts)

    if (!counterparty_note || !amount_note || !pay_type_note || !facts) {
      return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
    }

    const consent_accepted = body.consent_accepted === true
    if (!consent_accepted) {
      return NextResponse.json({ error: 'consent_required' }, { status: 400 })
    }

    const reporter_name = clampString(body.reporter_name, MAX_LEN.reporter_name)
    const reporter_contact = clampString(body.reporter_contact, MAX_LEN.reporter_contact)
    const reporter_instagram = normalizeInstagram(body.reporter_instagram)

    if (!reporter_name || !reporter_contact) {
      return NextResponse.json({ error: 'reporter_identity_required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^[0-9+\-\s()]+$/
    if (!emailRegex.test(reporter_contact) && !phoneRegex.test(reporter_contact)) {
      return NextResponse.json({ error: 'invalid_reporter_contact' }, { status: 400 })
    }

    if (!isValidInstagramHandle(reporter_instagram)) {
      return NextResponse.json({ error: 'invalid_reporter_instagram' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('fee_payment_reports')
      .insert({
        work_categories,
        client_type,
        counterparty_note,
        amount_note,
        pay_type_note,
        facts,
        reporter_name,
        reporter_contact,
        reporter_instagram,
        consent_accepted: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('fee_payment_reports insert:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
