import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { DANCE_SPECIALTY_VALUES } from '@/lib/dancer-specialties'
import { RESIDENCE_OPTIONS } from '@/lib/dancer-regions'
import { sendDancerApplicationReceiptEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Vercel Hobby 요청 본문 한도(약 4.5MB) 이하로 맞춤 */
const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_PROFILE_PHOTO_BYTES = 3 * 1024 * 1024
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png'])
const ALLOWED_PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_PHOTO_EXT = new Set(['jpg', 'jpeg', 'png', 'webp'])
const DEETZ_PROFILE_PHOTOS_BUCKET = 'profile-photos'
const DEETZ_PORTFOLIO_BUCKET = 'portfolio-media'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} env missing`)
  return value
}

function getDeetzSupabase() {
  return createClient(
    getRequiredEnv('DEETZ_SUPABASE_URL'),
    getRequiredEnv('DEETZ_SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}

function normalizeInstagram(raw: string) {
  return raw
    .trim()
    .replace(/^@+/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^instagram\.com\//i, '')
    .split(/[/?#]/)[0]
    .replace(/^@+/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

function formatPhoneForProfile(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return raw.trim()
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 35)
    .replace(/-+$/g, '')
}

function extFromFilename(name: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name.trim())
  return m ? m[1].toLowerCase() : ''
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
  lang: z.enum(['ko', 'en', 'ja']).default('ko'),
  full_name: z.string().trim().min(1).max(200),
  stage_name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(72),
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

type ApplicationPayload = {
  full_name: string
  stage_name: string
  email: string
  password: string
  phone: string
  birth_date: string
  gender: GenderPayload
  height_cm: number
  residence_region: string
  specialties: string[]
  instagram_handle: string
  careers: string[]
  agency_name?: string | null
  is_korean_national: boolean
  nationality: string
  has_visa?: boolean | null
  visa_details?: string | null
  portfolio_url?: string | null
  privacy_consent: true
}

type GenderPayload = 'male' | 'female' | 'other' | 'prefer_not'

type UploadedObject = { bucket: string; path: string }

class SubmissionError extends Error {
  status: number
  code: string

  constructor(code: string, status = 400, message = code) {
    super(message)
    this.code = code
    this.status = status
  }
}

function fileContentType(file: File, fallback: string) {
  return file.type || fallback
}

async function uploadPublicFile(
  supabase: ReturnType<typeof getDeetzSupabase>,
  bucket: string,
  path: string,
  file: File,
  fallbackType: string,
) {
  const buf = Buffer.from(await file.arrayBuffer())
  const contentType = fileContentType(file, fallbackType)
  const { error } = await supabase.storage.from(bucket).upload(path, buf, {
    contentType,
    upsert: false,
  })
  if (error) throw new SubmissionError('upload_failed', 500, error.message)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { publicUrl: data.publicUrl, contentType }
}

function fallbackMimeFromExt(ext: string, kind: 'portfolio' | 'photo') {
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return kind === 'portfolio' ? 'application/octet-stream' : 'image/jpeg'
}

async function resolveDeetzSlug(
  supabase: ReturnType<typeof getDeetzSupabase>,
  stageName: string,
) {
  const base = slugify(stageName) || `dancer-${randomUUID().slice(0, 8)}`
  const { data, error } = await supabase.rpc('next_available_slug', {
    base,
    target_table: 'dancers',
    exclude_id: null,
  })
  if (!error && typeof data === 'string' && data.length > 0) return data
  return `${base}-${randomUUID().slice(0, 6)}`
}

function careerDateFromLine(line: string) {
  const match = line.match(/\b(19\d{2}|20\d{2})\b/)
  if (match) return `${match[1]}-01-01`
  return new Date().toISOString().slice(0, 10)
}

async function createDeetzMemberProfile({
  payload,
  profilePhotoFile,
  portfolioFile,
}: {
  payload: ApplicationPayload
  profilePhotoFile: File
  portfolioFile?: File | null
}) {
  const supabase = getDeetzSupabase()
  const uploaded: UploadedObject[] = []
  let userId: string | null = null
  let dancerId: string | null = null

  try {
    const { data: existingUserId, error: existingErr } = await supabase.rpc('admin_user_id_by_email', {
      p_email: payload.email,
    })
    if (existingErr) {
      console.warn('[deetz-onboarding] existing email lookup failed:', existingErr.message)
    }
    if (existingUserId) {
      throw new SubmissionError('duplicate_email', 409)
    }

    const phone = formatPhoneForProfile(payload.phone)
    const instagramHandle = normalizeInstagram(payload.instagram_handle)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        display_name: payload.stage_name,
        phone,
      },
    })
    if (createErr || !created.user) {
      const lower = createErr?.message.toLowerCase() ?? ''
      if (lower.includes('already') || lower.includes('registered')) {
        throw new SubmissionError('duplicate_email', 409)
      }
      throw new SubmissionError('account_create_failed', 500, createErr?.message ?? 'account_create_failed')
    }
    userId = created.user.id

    const profileExt = extFromFilename(profilePhotoFile.name) || 'jpg'
    const profilePath = `${userId}/profile_${Date.now()}_${randomUUID().slice(0, 8)}.${profileExt}`
    const uploadedProfile = await uploadPublicFile(
      supabase,
      DEETZ_PROFILE_PHOTOS_BUCKET,
      profilePath,
      profilePhotoFile,
      fallbackMimeFromExt(profileExt, 'photo'),
    )
    uploaded.push({ bucket: DEETZ_PROFILE_PHOTOS_BUCKET, path: profilePath })

    let portfolioFileUrl: string | null = null
    let portfolioFileName: string | null = null
    let portfolioFileSizeBytes: number | null = null
    let portfolioFileMime: string | null = null

    if (portfolioFile) {
      const portfolioExt = extFromFilename(portfolioFile.name) || 'pdf'
      const portfolioPath = `${userId}/portfolio_${Date.now()}_${randomUUID().slice(0, 8)}.${portfolioExt}`
      const uploadedPortfolio = await uploadPublicFile(
        supabase,
        DEETZ_PORTFOLIO_BUCKET,
        portfolioPath,
        portfolioFile,
        fallbackMimeFromExt(portfolioExt, 'portfolio'),
      )
      uploaded.push({ bucket: DEETZ_PORTFOLIO_BUCKET, path: portfolioPath })
      portfolioFileUrl = uploadedPortfolio.publicUrl
      portfolioFileName = portfolioFile.name
      portfolioFileSizeBytes = portfolioFile.size
      portfolioFileMime = uploadedPortfolio.contentType
    }

    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: userId,
        display_name: payload.stage_name,
        avatar_url: uploadedProfile.publicUrl,
        phone,
        instagram_handle: instagramHandle,
      },
      { onConflict: 'id' },
    )
    if (profileErr) throw new SubmissionError('profile_create_failed', 500, profileErr.message)

    const slug = await resolveDeetzSlug(supabase, payload.stage_name)
    const portfolioItems = payload.portfolio_url
      ? [{ url: payload.portfolio_url, type: 'link' }]
      : []

    const { data: dancer, error: dancerErr } = await supabase
      .from('dancers')
      .insert({
        profile_id: userId,
        stage_name: payload.stage_name,
        korean_name: payload.full_name,
        slug,
        gender: payload.gender === 'prefer_not' ? null : payload.gender,
        location: payload.residence_region,
        specialties: payload.specialties,
        genres: null,
        profile_img: uploadedProfile.publicUrl,
        social_links: {
          instagram: `https://instagram.com/${instagramHandle}`,
        },
        portfolio: portfolioItems,
        portfolio_file_url: portfolioFileUrl,
        portfolio_file_name: portfolioFileName,
        portfolio_file_size_bytes: portfolioFileSizeBytes,
        portfolio_file_mime: portfolioFileMime,
        portfolio_file_uploaded_at: portfolioFileUrl ? new Date().toISOString() : null,
        is_active: true,
      })
      .select('id, slug')
      .single()
    if (dancerErr || !dancer) {
      throw new SubmissionError('dancer_create_failed', 500, dancerErr?.message ?? 'dancer_create_failed')
    }
    dancerId = dancer.id as string

    const { error: privateErr } = await supabase.from('dancer_private_info').upsert(
      {
        dancer_id: dancerId,
        email: payload.email,
        phone: payload.phone,
        birth_date: payload.birth_date,
        height_cm: payload.height_cm,
        agency_name: payload.agency_name || null,
        nationality: payload.nationality,
        is_korean_national: payload.is_korean_national,
        has_visa: payload.is_korean_national ? null : payload.has_visa ?? null,
        visa_details: payload.is_korean_national ? null : payload.visa_details ?? null,
      },
      { onConflict: 'dancer_id' },
    )
    if (privateErr) throw new SubmissionError('private_info_create_failed', 500, privateErr.message)

    const careerRows = payload.careers
      .map((line, index) => line.trim())
      .filter(Boolean)
      .slice(0, 200)
      .map((line, index) => ({
        dancer_id: dancerId,
        type: 'other',
        title: line.slice(0, 120),
        date: careerDateFromLine(line),
        details: line.length > 120 ? { description: line } : {},
        is_public: true,
        is_representative: index < 3,
        sort_order: index,
      }))

    if (careerRows.length > 0) {
      const { error: careersErr } = await supabase.from('careers').insert(careerRows)
      if (careersErr) throw new SubmissionError('careers_create_failed', 500, careersErr.message)
    }

    return {
      id: dancerId,
      dancer_id: dancerId,
      profile_id: userId,
      slug: dancer.slug as string,
      profile_photo_url: uploadedProfile.publicUrl,
      portfolio_file_url: portfolioFileUrl,
    }
  } catch (error) {
    if (dancerId) {
      try {
        await supabase.from('dancers').delete().eq('id', dancerId)
      } catch {
        // best-effort cleanup
      }
    }
    if (userId) {
      try {
        await supabase.auth.admin.deleteUser(userId)
      } catch {
        // best-effort cleanup
      }
    }
    for (const object of uploaded) {
      try {
        await supabase.storage.from(object.bucket).remove([object.path])
      } catch {
        // best-effort cleanup
      }
    }
    throw error
  }
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
    lang: String(form.get('lang') ?? 'ko').trim() || 'ko',
    full_name: String(form.get('full_name') ?? '').trim(),
    stage_name: String(form.get('stage_name') ?? '').trim(),
    email: String(form.get('email') ?? '').trim(),
    password: String(form.get('password') ?? ''),
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

  try {
    const data = await createDeetzMemberProfile({
      payload: {
        full_name: d.full_name,
        stage_name: d.stage_name,
        email: d.email,
        password: d.password,
        birth_date: d.birth_date,
        instagram_handle,
        careers,
        phone: d.phone,
        gender: d.gender,
        height_cm: d.height_cm,
        residence_region: d.residence_region,
        specialties: d.specialties,
        portfolio_url: normalizedUrl,
        agency_name,
        nationality: d.nationality.trim(),
        is_korean_national: isKorean,
        has_visa: has_visa_final,
        visa_details: visa_details_final,
        privacy_consent: true,
      },
      profilePhotoFile,
      portfolioFile,
    })

    let emailSent = false
    try {
      await sendDancerApplicationReceiptEmail({
        to: d.email,
        name: d.stage_name || d.full_name,
        lang: d.lang,
      })
      emailSent = true
    } catch (emailError) {
      console.error('[deetz-onboarding] applicant receipt email failed:', emailError)
    }

    return NextResponse.json({ ...data, emailSent }, { status: 201 })
  } catch (error) {
    if (error instanceof SubmissionError) {
      console.error('[deetz-onboarding] submission error:', error.code, error.message)
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    console.error('[deetz-onboarding] create failed:', error)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
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

    return NextResponse.json({ error: 'multipart_required' }, { status: 400 })
  } catch (e: unknown) {
    console.error('dancer-applications POST error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
