import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  RECRUITING_TRACK_BY_SLUG,
  RECRUITING_TRACK_SLUGS,
  RECRUITING_TOOL_LEVELS,
  RECRUITING_TOOL_OPTIONS,
  type RecruitingTrackSlug,
  type RecruitingToolLevel,
} from '@/lib/recruiting-content'
import {
  sendRecruitingApplicationNotificationEmail,
  sendRecruitingApplicationReceiptEmail,
} from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_RESUME_BYTES = 4 * 1024 * 1024
const RESUME_BUCKET = 'recruiting-resumes'
const ALLOWED_LEVELS = new Set(RECRUITING_TOOL_LEVELS.map((level) => level.value))

function getServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase environment variables are missing')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function optionalUrl(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? '').trim()
  if (!value) return null
  try {
    return new URL(value).toString()
  } catch {
    return null
  }
}

function formBoolean(raw: FormDataEntryValue | null): boolean {
  return String(raw ?? '').toLowerCase() === 'true'
}

const applicationSchema = z.object({
  client_submission_id: z.string().uuid(),
  position_slugs: z.array(z.enum(RECRUITING_TRACK_SLUGS)).min(1).max(RECRUITING_TRACK_SLUGS.length),
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(8).max(30),
  career_summary: z.string().trim().min(20).max(3000),
  motivation: z.string().trim().min(20).max(2000),
  other_tools: z.string().trim().max(500).nullable(),
  camera_capability: z.enum(['yes', 'basic', 'no']),
  camera_details: z.string().trim().max(500).nullable(),
  driving_capability: z.enum(['yes', 'license_only', 'no']),
  foreign_languages: z.string().trim().min(1).max(1000),
  portfolio_url: z.string().url().max(2000).nullable(),
  alternative_position_consent: z.boolean(),
  privacy_consent: z.literal(true),
})

function validateResume(file: File): string | null {
  if (file.size === 0) return 'resume_required'
  if (file.size > MAX_RESUME_BYTES) return 'resume_too_large'
  const isPdfName = file.name.toLowerCase().endsWith('.pdf')
  const isPdfType = !file.type || file.type === 'application/pdf'
  if (!isPdfName || !isPdfType) return 'resume_type'
  return null
}

function readToolSkills(form: FormData): Record<string, RecruitingToolLevel> | null {
  const result: Record<string, RecruitingToolLevel> = {}
  for (const tool of RECRUITING_TOOL_OPTIONS) {
    const value = String(form.get(`tool_${tool.key}`) ?? '') as RecruitingToolLevel
    if (!ALLOWED_LEVELS.has(value)) return null
    result[tool.key] = value
  }
  return result
}

export async function POST(request: NextRequest) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (String(form.get('company_website') ?? '').trim()) {
    return NextResponse.json({ id: randomUUID(), emailSent: true })
  }

  const resume = form.get('resume')
  if (!(resume instanceof File)) {
    return NextResponse.json({ error: 'resume_required' }, { status: 400 })
  }
  const resumeError = validateResume(resume)
  if (resumeError) {
    return NextResponse.json({ error: resumeError }, { status: 400 })
  }

  const toolSkills = readToolSkills(form)
  if (!toolSkills) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const portfolioValue = optionalUrl(form.get('portfolio_url'))
  if (String(form.get('portfolio_url') ?? '').trim() && !portfolioValue) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const parsed = applicationSchema.safeParse({
    client_submission_id: String(form.get('client_submission_id') ?? ''),
    position_slugs: [...new Set(form.getAll('position_slugs').map((value) => String(value)))] as RecruitingTrackSlug[],
    full_name: String(form.get('full_name') ?? ''),
    email: String(form.get('email') ?? ''),
    phone: String(form.get('phone') ?? ''),
    career_summary: String(form.get('career_summary') ?? ''),
    motivation: String(form.get('motivation') ?? ''),
    other_tools: String(form.get('other_tools') ?? '').trim() || null,
    camera_capability: String(form.get('camera_capability') ?? ''),
    camera_details: String(form.get('camera_details') ?? '').trim() || null,
    driving_capability: String(form.get('driving_capability') ?? ''),
    foreign_languages: String(form.get('foreign_languages') ?? ''),
    portfolio_url: portfolioValue,
    alternative_position_consent: formBoolean(form.get('alternative_position_consent')),
    privacy_consent: formBoolean(form.get('privacy_consent')),
  })

  if (!parsed.success) {
    const hasPositionIssue = parsed.error.issues.some((issue) => issue.path[0] === 'position_slugs')
    return NextResponse.json({ error: hasPositionIssue ? 'invalid_position' : 'invalid_body' }, { status: 400 })
  }

  const selectedTracks = parsed.data.position_slugs.map((slug) => RECRUITING_TRACK_BY_SLUG[slug])
  const positionTitles = selectedTracks.map((track) => track.title)
  const positionTitle = positionTitles.join(' · ')

  if (process.env.NODE_ENV !== 'production' && process.env.RECRUITING_E2E_DRY_RUN === '1') {
    return NextResponse.json({ id: parsed.data.client_submission_id, emailSent: true, dryRun: true }, { status: 201 })
  }

  let supabase: ReturnType<typeof getServiceRole>
  try {
    supabase = getServiceRole()
  } catch (error) {
    console.error('[recruiting-applications] configuration error:', error)
    return NextResponse.json({ error: 'submission_failed' }, { status: 500 })
  }

  const { data: existing, error: existingError } = await supabase
    .from('recruiting_applications')
    .select('id')
    .eq('client_submission_id', parsed.data.client_submission_id)
    .maybeSingle()

  if (existingError) {
    console.error('[recruiting-applications] idempotency lookup failed:', existingError.message)
    return NextResponse.json({ error: 'submission_failed' }, { status: 500 })
  }
  if (existing?.id) {
    return NextResponse.json({ id: existing.id, emailSent: true, duplicate: true })
  }

  const applicationId = randomUUID()
  const resumePath = `applications/${applicationId}/resume.pdf`
  const fileBuffer = Buffer.from(await resume.arrayBuffer())
  const { error: uploadError } = await supabase.storage.from(RESUME_BUCKET).upload(resumePath, fileBuffer, {
    contentType: 'application/pdf',
    upsert: false,
  })

  if (uploadError) {
    console.error('[recruiting-applications] resume upload failed:', uploadError.message)
    return NextResponse.json({ error: 'submission_failed' }, { status: 500 })
  }

  const { error: insertError } = await supabase.from('recruiting_applications').insert({
    id: applicationId,
    client_submission_id: parsed.data.client_submission_id,
    position_slug: parsed.data.position_slugs[0],
    position_title: positionTitle,
    position_slugs: parsed.data.position_slugs,
    position_titles: positionTitles,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    career_summary: parsed.data.career_summary,
    motivation: parsed.data.motivation,
    tool_skills: toolSkills,
    other_tools: parsed.data.other_tools,
    camera_capability: parsed.data.camera_capability,
    camera_details: parsed.data.camera_details,
    driving_capability: parsed.data.driving_capability,
    foreign_languages: parsed.data.foreign_languages,
    portfolio_url: parsed.data.portfolio_url,
    resume_file_path: resumePath,
    alternative_position_consent: parsed.data.alternative_position_consent,
    privacy_consent: parsed.data.privacy_consent,
    source_path: '/careers',
  })

  if (insertError) {
    console.error('[recruiting-applications] insert failed:', insertError.message)
    await supabase.storage.from(RESUME_BUCKET).remove([resumePath])
    return NextResponse.json({ error: 'submission_failed' }, { status: 500 })
  }

  const mailResults = await Promise.allSettled([
    sendRecruitingApplicationReceiptEmail({
      to: parsed.data.email,
      name: parsed.data.full_name,
      positionTitle,
      applicationId,
      alternativePositionConsent: parsed.data.alternative_position_consent,
    }),
    sendRecruitingApplicationNotificationEmail({
      name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      positionTitle,
      applicationId,
    }),
  ])

  const emailSent = mailResults[0].status === 'fulfilled'
  if (mailResults[0].status === 'rejected') {
    console.error('[recruiting-applications] applicant receipt failed:', mailResults[0].reason)
  }
  if (mailResults[1].status === 'rejected') {
    console.error('[recruiting-applications] operator notification failed:', mailResults[1].reason)
  }

  return NextResponse.json({ id: applicationId, emailSent }, { status: 201 })
}
