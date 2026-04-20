import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { DANCE_SPECIALTY_VALUES } from '@/lib/dancer-specialties'
import { RESIDENCE_OPTIONS } from '@/lib/dancer-regions'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = 'dancer-portfolio-files'
/** Vercel Hobby 요청 본문 한도(약 4.5MB) 이하로 맞춤 */
const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_PROFILE_PHOTO_BYTES = 3 * 1024 * 1024
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png'])
const ALLOWED_PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_PHOTO_EXT = new Set(['jpg', 'jpeg', 'png', 'webp'])

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function normalizeInstagram(raw: string) {
  return raw.trim().replace(/^@+/, '')
}

function extFromFilename(name: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name.trim())
  return m ? m[1].toLowerCase() : ''
}

function safeStorageFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 100)
  return base || 'portfolio'
}

function validatePortfolioFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: 'file_too_large' }
  }
  const ext = extFromFilename(file.name)
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: 'file_type' }
  }
  const type = file.type || ''
  if (type && !ALLOWED_MIME.has(type)) {
    return { ok: false, error: 'file_type' }
  }
  return { ok: true }
}

function validateProfilePhoto(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    return { ok: false, error: 'profile_photo_too_large' }
  }
  const ext = extFromFilename(file.name)
  if (!ALLOWED_PHOTO_EXT.has(ext)) {
    return { ok: false, error: 'profile_photo_type' }
  }
  const type = file.type || ''
  if (type && !ALLOWED_PHOTO_MIME.has(type)) {
    return { ok: false, error: 'profile_photo_type' }
  }
  return { ok: true }
}

function visaRefine(data: VisaRefinable, ctx: z.RefinementCtx) {
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
}

type VisaRefinable = {
  is_korean_national: boolean
  has_visa?: boolean | null
  visa_details?: string | null
}

const identityBase = z.object({
  full_name: z.string().trim().min(1).max(200),
  stage_name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(5).max(80),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), { message: 'invalid_date' }),
  gender: z.enum(['male', 'female', 'other', 'prefer_not']),
  height_cm: z.coerce.number().int().min(120).max(220),
  residence_region: z.string().trim().refine((v) => (RESIDENCE_OPTIONS as readonly string[]).includes(v), {
    message: 'invalid_region',
  }),
  specialties: z
    .array(z.string())
    .min(1)
    .max(10)
    .refine((arr) => arr.every((v) => (DANCE_SPECIALTY_VALUES as string[]).includes(v)), {
      message: 'invalid_specialty',
    }),
  instagram_handle: z.string().trim().min(1).max(100),
  careers: z.array(z.string()).max(200),
  agency_name: z.string().trim().max(200).optional().nullable(),
  is_korean_national: z.boolean(),
  nationality: z.string().trim().min(1).max(120),
  has_visa: z.boolean().optional().nullable(),
  visa_details: z.string().trim().max(1000).optional().nullable(),
  privacy_consent: z.literal(true),
})

const jsonBodySchema = identityBase
  .extend({
    portfolio_url: z
      .string()
      .trim()
      .min(4)
      .max(2000)
      .transform((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`))
      .pipe(z.string().url()),
  })
  .superRefine(visaRefine)

const multipartIdentitySchema = identityBase
  .extend({
    portfolio_url: z.string().max(2000).optional(),
  })
  .superRefine(visaRefine)

function parseBool(v: FormDataEntryValue | null): boolean | null {
  if (v === null || v === undefined) return null
  const s = String(v).toLowerCase()
  if (s === 'true' || s === '1' || s === 'on') return true
  if (s === 'false' || s === '0') return false
  return null
}

function normalizeOptionalUrl(raw: string): string | null {
  const t = raw.trim()
  if (t.length < 4) return null
  const u = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    void new URL(u)
    return u
  } catch {
    return null
  }
}

function parseSpecialties(form: FormData): string[] {
  const all = form.getAll('specialties[]').map((v) => String(v).trim()).filter(Boolean)
  if (all.length > 0) return all
  const single = String(form.get('specialties') ?? '').trim()
  if (!single) return []
  return single
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

async function handleMultipart(request: NextRequest) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_multipart' }, { status: 400 })
  }

  const portfolio_url_raw = String(form.get('portfolio_url') ?? '').trim()
  const file = form.get('portfolio_file')
  const portfolioFile = file instanceof File && file.size > 0 ? file : null
  const photoField = form.get('profile_photo')
  const profilePhotoFile = photoField instanceof File && photoField.size > 0 ? photoField : null

  const normalizedUrl = normalizeOptionalUrl(portfolio_url_raw)
  if (portfolio_url_raw.length > 0 && !normalizedUrl) {
    return NextResponse.json({ error: 'invalid_portfolio_url' }, { status: 400 })
  }

  if (portfolioFile) {
    const chk = validatePortfolioFile(portfolioFile)
    if (!chk.ok) {
      return NextResponse.json({ error: chk.error }, { status: 400 })
    }
  }

  if (!profilePhotoFile) {
    return NextResponse.json({ error: 'profile_photo_required' }, { status: 400 })
  }
  const photoChk = validateProfilePhoto(profilePhotoFile)
  if (!photoChk.ok) {
    return NextResponse.json({ error: photoChk.error }, { status: 400 })
  }

  const careers_text = String(form.get('careers') ?? '')
  const careers = careers_text
    .split(/\r?\n/)
    .map((c) => c.trim())
    .filter(Boolean)
  if (careers.length < 1) {
    return NextResponse.json({ error: 'careers_required' }, { status: 400 })
  }

  const isKoreanNational = parseBool(form.get('is_korean_national')) === true
  const hasVisaRaw = form.get('has_visa')
  const has_visa = isKoreanNational
    ? null
    : hasVisaRaw === null || String(hasVisaRaw) === ''
      ? null
      : parseBool(hasVisaRaw) === true
        ? true
        : parseBool(hasVisaRaw) === false
          ? false
          : null

  const specialties = parseSpecialties(form)

  const parsed = multipartIdentitySchema.safeParse({
    full_name: String(form.get('full_name') ?? '').trim(),
    stage_name: String(form.get('stage_name') ?? '').trim(),
    email: String(form.get('email') ?? '').trim(),
    phone: String(form.get('phone') ?? '').trim(),
    birth_date: String(form.get('birth_date') ?? '').trim(),
    gender: String(form.get('gender') ?? '').trim(),
    height_cm: String(form.get('height_cm') ?? ''),
    residence_region: String(form.get('residence_region') ?? '').trim(),
    specialties,
    portfolio_url: portfolio_url_raw,
    instagram_handle: String(form.get('instagram_handle') ?? '').trim(),
    careers,
    agency_name: String(form.get('agency_name') ?? '').trim() || null,
    is_korean_national: isKoreanNational,
    nationality: String(form.get('nationality') ?? '').trim(),
    has_visa,
    visa_details:
      isKoreanNational || has_visa !== true ? null : String(form.get('visa_details') ?? '').trim() || null,
    privacy_consent: parseBool(form.get('privacy_consent')) === true,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const instagram_handle = normalizeInstagram(d.instagram_handle)
  if (!/^[a-zA-Z0-9._]+$/.test(instagram_handle)) {
    return NextResponse.json({ error: 'invalid_instagram' }, { status: 400 })
  }

  const agency_name =
    d.agency_name && String(d.agency_name).trim().length > 0 ? String(d.agency_name).trim() : null

  const isKorean = d.is_korean_national
  const has_visa_final = isKorean ? null : d.has_visa ?? null
  const visa_details_final = isKorean || !has_visa_final ? null : (d.visa_details ?? '').trim() || null

  const supabase = getSupabase()

  const uploadedPaths: string[] = []
  let portfolio_file_path: string | null = null
  let profile_photo_path: string | null = null

  if (portfolioFile) {
    const objectPath = `applications/${randomUUID()}/${safeStorageFileName(portfolioFile.name)}`
    const buf = Buffer.from(await portfolioFile.arrayBuffer())
    const ext = extFromFilename(portfolioFile.name)
    const mimeFromExt =
      ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream'
    const contentType =
      portfolioFile.type && ALLOWED_MIME.has(portfolioFile.type) ? portfolioFile.type : mimeFromExt
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, buf, {
      contentType,
      upsert: false,
    })
    if (upErr) {
      console.error('portfolio storage upload error:', upErr)
      return NextResponse.json({ error: 'upload_failed', message: upErr.message }, { status: 500 })
    }
    portfolio_file_path = objectPath
    uploadedPaths.push(objectPath)
  }

  {
    const photoPath = `profiles/${randomUUID()}/${safeStorageFileName(profilePhotoFile.name)}`
    const buf = Buffer.from(await profilePhotoFile.arrayBuffer())
    const ext = extFromFilename(profilePhotoFile.name)
    const mimeFromExt =
      ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
          : 'image/jpeg'
    const contentType =
      profilePhotoFile.type && ALLOWED_PHOTO_MIME.has(profilePhotoFile.type)
        ? profilePhotoFile.type
        : mimeFromExt
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(photoPath, buf, {
      contentType,
      upsert: false,
    })
    if (upErr) {
      console.error('profile photo upload error:', upErr)
      for (const p of uploadedPaths) {
        await supabase.storage.from(BUCKET).remove([p]).catch(() => {})
      }
      return NextResponse.json({ error: 'profile_photo_upload_failed', message: upErr.message }, { status: 500 })
    }
    profile_photo_path = photoPath
    uploadedPaths.push(photoPath)
  }

  const { data, error } = await supabase
    .from('dancer_applications')
    .insert({
      full_name: d.full_name,
      stage_name: d.stage_name,
      email: d.email,
      birth_date: d.birth_date,
      instagram_handle,
      careers,
      phone: d.phone,
      gender: d.gender,
      height_cm: d.height_cm,
      residence_region: d.residence_region,
      specialties: d.specialties,
      profile_photo_path,
      portfolio_url: normalizedUrl,
      portfolio_file_path,
      agency_name,
      nationality: d.nationality.trim(),
      is_korean_national: isKorean,
      has_visa: has_visa_final,
      visa_details: visa_details_final,
      privacy_consent: true,
      review_status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    for (const p of uploadedPaths) {
      await supabase.storage.from(BUCKET).remove([p]).catch(() => {})
    }
    console.error('dancer_applications insert error:', error)
    return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, portfolio_file_path, profile_photo_path }, { status: 201 })
}

export async function POST(request: NextRequest) {
  try {
    const ct = request.headers.get('content-type') || ''
    if (ct.includes('multipart/form-data')) {
      return handleMultipart(request)
    }

    const json = await request.json()
    const parsed = jsonBodySchema.safeParse(json)
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
        email: parsed.data.email,
        birth_date: parsed.data.birth_date,
        instagram_handle,
        careers,
        phone: parsed.data.phone,
        gender: parsed.data.gender,
        height_cm: parsed.data.height_cm,
        residence_region: parsed.data.residence_region,
        specialties: parsed.data.specialties,
        profile_photo_path: null,
        portfolio_url: parsed.data.portfolio_url,
        portfolio_file_path: null,
        agency_name,
        nationality: parsed.data.nationality.trim(),
        is_korean_national: isKorean,
        has_visa,
        visa_details,
        privacy_consent: true,
        review_status: 'pending',
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
