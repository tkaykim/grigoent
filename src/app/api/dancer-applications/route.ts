import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function normalizeInstagram(raw: string) {
  return raw.trim().replace(/^@+/, '')
}

const bodySchema = z
  .object({
    full_name: z.string().trim().min(1).max(200),
    stage_name: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(5).max(80),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), { message: 'invalid_date' }),
    gender: z.enum(['male', 'female', 'other', 'prefer_not']),
    height_cm: z.coerce.number().int().min(120).max(220),
    portfolio_url: z
      .string()
      .trim()
      .min(4)
      .max(2000)
      .transform((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`))
      .pipe(z.string().url()),
    instagram_handle: z.string().trim().min(1).max(100),
    careers: z.array(z.string()).max(40),
    agency_name: z.string().trim().max(200).optional().nullable(),
    is_korean_national: z.boolean(),
    nationality: z.string().trim().min(1).max(120),
    has_visa: z.boolean().optional().nullable(),
    visa_details: z.string().trim().max(1000).optional().nullable(),
    privacy_consent: z.literal(true),
  })
  .superRefine((data, ctx) => {
    if (data.is_korean_national) {
      if (data.has_visa !== null && data.has_visa !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['has_visa'], message: 'visa_not_applicable' })
      }
      if (data.visa_details && data.visa_details.length > 0) {
        ctx.addIssue({ code: 'custom', path: ['visa_details'], message: 'visa_not_applicable' })
      }
    } else {
      if (data.has_visa === null || data.has_visa === undefined) {
        ctx.addIssue({ code: 'custom', path: ['has_visa'], message: 'visa_required' })
      }
      if (data.has_visa === true) {
        if (!data.visa_details || data.visa_details.length < 2) {
          ctx.addIssue({ code: 'custom', path: ['visa_details'], message: 'visa_details_required' })
        }
      }
    }
  })

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 400 })
    }

    const instagram_handle = normalizeInstagram(parsed.data.instagram_handle)
    if (!/^[a-zA-Z0-9._]+$/.test(instagram_handle)) {
      return NextResponse.json({ error: 'invalid_instagram' }, { status: 400 })
    }

    const careers = parsed.data.careers.map((c) => c.trim()).filter(Boolean)
    if (careers.length < 1) {
      return NextResponse.json({ error: 'careers_required' }, { status: 400 })
    }
    if (careers.some((c) => c.length > 800)) {
      return NextResponse.json({ error: 'career_too_long' }, { status: 400 })
    }

    const agency_name =
      parsed.data.agency_name && parsed.data.agency_name.trim().length > 0 ? parsed.data.agency_name.trim() : null

    const isKorean = parsed.data.is_korean_national
    const has_visa = isKorean ? null : parsed.data.has_visa ?? null
    const visa_details =
      isKorean || !has_visa ? null : (parsed.data.visa_details ?? '').trim() || null

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('dancer_applications')
      .insert({
        full_name: parsed.data.full_name,
        stage_name: parsed.data.stage_name,
        birth_date: parsed.data.birth_date,
        instagram_handle,
        careers,
        phone: parsed.data.phone,
        gender: parsed.data.gender,
        height_cm: parsed.data.height_cm,
        portfolio_url: parsed.data.portfolio_url,
        agency_name,
        nationality: parsed.data.nationality.trim(),
        is_korean_national: isKorean,
        has_visa,
        visa_details,
        privacy_consent: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('dancer_applications insert error:', error)
      return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (e: unknown) {
    console.error('dancer-applications POST error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
