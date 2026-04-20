'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Send,
  Loader2,
  Check,
  Plus,
  Trash2,
  Camera,
  Link as LinkIcon,
  FileUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { DANCE_SPECIALTIES } from '@/lib/dancer-specialties'
import { RESIDENCE_OPTIONS, KOREA_REGIONS, OVERSEAS_OPTION } from '@/lib/dancer-regions'

type Gender = 'male' | 'female' | 'other' | 'prefer_not'
type FieldErrors = Partial<Record<string, string>>

function Req() {
  return (
    <span className="text-amber-500" aria-label="필수">
      *
    </span>
  )
}

// 크게 + 여유 있는 입력 필드
const fieldInputClass = 'h-11 rounded-lg border-zinc-200 bg-white text-[15px] shadow-none focus-visible:border-zinc-900 focus-visible:ring-zinc-900/10 focus-visible:ring-4'

function SectionCard({
  step,
  kicker,
  title,
  desc,
  done,
  children,
}: {
  step: number
  kicker: string
  title: string
  desc?: string
  done?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-white transition-colors',
        done ? 'border-emerald-200/70' : 'border-zinc-200',
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[3px] transition-colors',
          done ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900',
        )}
      />
      <header className="flex flex-col gap-4 border-b border-zinc-100 px-6 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-7">
        <div className="flex items-start gap-4">
          <div className="relative">
            <span className="block font-mono text-4xl font-light leading-none text-zinc-300 sm:text-5xl">
              {String(step).padStart(2, '0')}
            </span>
            {done ? (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                <Check className="h-3 w-3" />
              </span>
            ) : null}
          </div>
          <div className="pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{kicker}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">{title}</h2>
            {desc ? <p className="mt-1 text-sm text-zinc-500">{desc}</p> : null}
          </div>
        </div>
      </header>
      <div className="px-6 py-7 sm:px-8 sm:py-8">{children}</div>
    </section>
  )
}

function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
      {message}
    </p>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-zinc-500">{children}</p>
}

function LabelRow({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-zinc-800"
    >
      {children}
      {required ? <Req /> : null}
    </Label>
  )
}

export default function DancerApplyPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const portfolioFileRef = useRef<HTMLInputElement>(null)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState('')
  const [stageName, setStageName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [residenceRegion, setResidenceRegion] = useState<string>('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
  const [portfolioMode, setPortfolioMode] = useState<'url' | 'file'>('url')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [portfolioFileName, setPortfolioFileName] = useState<string>('')
  const [instagram, setInstagram] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [isKoreanNational, setIsKoreanNational] = useState(true)
  const [foreignCountry, setForeignCountry] = useState('')
  const [hasVisa, setHasVisa] = useState<boolean | null>(null)
  const [visaDetails, setVisaDetails] = useState('')
  const [careers, setCareers] = useState<string[]>([''])
  const [privacyConsent, setPrivacyConsent] = useState(false)

  const koreaNationalityLabel = language === 'ko' ? '대한민국' : 'Republic of Korea'

  useEffect(() => {
    return () => {
      if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview)
    }
  }, [profilePhotoPreview])

  const doneBasic = Boolean(
    stageName.trim() && fullName.trim() && email.trim() && phone.trim() && birthDate && gender && heightCm && residenceRegion,
  )
  const doneProfile = Boolean(
    profilePhotoFile && specialties.length > 0 && instagram.trim() &&
    ((portfolioMode === 'url' && portfolioUrl.trim()) || (portfolioMode === 'file' && portfolioFileName)),
  )
  const doneVisa = isKoreanNational || (foreignCountry.trim().length >= 2 && hasVisa !== null && (hasVisa === false || visaDetails.trim().length >= 2))
  const doneCareer = careers.some((c) => c.trim().length > 0) && privacyConsent
  const totalSteps = 4
  const doneCount = [doneBasic, doneProfile, doneVisa, doneCareer].filter(Boolean).length

  const toggleSpecialty = useCallback((value: string) => {
    setSpecialties((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value)
      if (prev.length >= 10) return prev
      return [...prev, value]
    })
  }, [])

  const handleProfilePhotoChange = (file: File | null) => {
    if (!file) {
      setProfilePhotoFile(null)
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview)
        setProfilePhotoPreview(null)
      }
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t('applyDancer.errorProfilePhotoSize'))
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('applyDancer.errorProfilePhotoType'))
      return
    }
    if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview)
    setProfilePhotoFile(file)
    setProfilePhotoPreview(URL.createObjectURL(file))
  }

  const validate = (): FieldErrors => {
    const e: FieldErrors = {}
    if (!stageName.trim()) e.stageName = t('applyDancer.errorRequired')
    if (!fullName.trim()) e.fullName = t('applyDancer.errorRequired')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t('applyDancer.errorEmail')
    if (!phone.trim()) e.phone = t('applyDancer.errorRequired')
    if (!birthDate) e.birthDate = t('applyDancer.errorRequired')
    if (!gender) e.gender = t('applyDancer.errorRequired')
    const heightNum = parseInt(heightCm.replace(/\D/g, ''), 10)
    if (Number.isNaN(heightNum) || heightNum < 120 || heightNum > 220) e.heightCm = t('applyDancer.errorHeight')
    if (!residenceRegion || !(RESIDENCE_OPTIONS as readonly string[]).includes(residenceRegion)) e.residenceRegion = t('applyDancer.errorRequired')
    if (specialties.length === 0) e.specialties = t('applyDancer.errorSpecialties')
    if (!profilePhotoFile) e.profilePhoto = t('applyDancer.errorProfilePhoto')
    if (!instagram.trim()) e.instagram = t('applyDancer.errorRequired')

    const portfolioFile = portfolioFileRef.current?.files?.[0]
    if (portfolioMode === 'url') {
      if (!portfolioUrl.trim()) e.portfolio = t('applyDancer.errorPortfolioRequired')
      else {
        let n = portfolioUrl.trim()
        if (!/^https?:\/\//i.test(n)) n = `https://${n}`
        try {
          void new URL(n)
        } catch {
          e.portfolio = t('applyDancer.errorPortfolioUrl')
        }
      }
    } else {
      if (!portfolioFile) e.portfolio = t('applyDancer.errorPortfolioRequired')
    }

    if (!isKoreanNational) {
      if (foreignCountry.trim().length < 2) e.foreignCountry = t('applyDancer.errorForeignCountry')
      if (hasVisa === null) e.hasVisa = t('applyDancer.errorRequired')
      if (hasVisa === true && visaDetails.trim().length < 2) e.visaDetails = t('applyDancer.errorVisaDetails')
    }

    const careerList = careers.map((c) => c.trim()).filter(Boolean)
    if (careerList.length < 1) e.careers = t('applyDancer.errorRequired')

    if (!privacyConsent) e.privacyConsent = t('applyDancer.errorRequired')
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const firstKey = Object.keys(nextErrors)[0]
      const el = document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      toast.error(t('applyDancer.errorRequired'))
      return
    }

    const heightNum = parseInt(heightCm.replace(/\D/g, ''), 10)
    const nationality = isKoreanNational ? koreaNationalityLabel : foreignCountry.trim()
    const careerList = careers.map((c) => c.trim()).filter(Boolean)

    let normalizedPortfolioForMail: string | null = null
    if (portfolioMode === 'url' && portfolioUrl.trim()) {
      let n = portfolioUrl.trim()
      if (!/^https?:\/\//i.test(n)) n = `https://${n}`
      try {
        void new URL(n)
        normalizedPortfolioForMail = n
      } catch {
        /* already caught in validate */
      }
    }

    const formData = new FormData()
    formData.append('full_name', fullName.trim())
    formData.append('stage_name', stageName.trim())
    formData.append('email', email.trim())
    formData.append('phone', phone.trim())
    formData.append('birth_date', birthDate)
    formData.append('gender', gender as string)
    formData.append('height_cm', String(heightNum))
    formData.append('residence_region', residenceRegion)
    specialties.forEach((s) => formData.append('specialties[]', s))
    if (portfolioMode === 'url') formData.append('portfolio_url', portfolioUrl.trim())
    formData.append('instagram_handle', instagram.trim())
    formData.append('careers', careerList.join('\n'))
    formData.append('agency_name', agencyName.trim())
    formData.append('is_korean_national', isKoreanNational ? 'true' : 'false')
    formData.append('nationality', nationality)
    if (!isKoreanNational) {
      formData.append('has_visa', hasVisa === true ? 'true' : 'false')
      if (hasVisa === true) formData.append('visa_details', visaDetails.trim())
    }
    formData.append('privacy_consent', 'true')
    if (profilePhotoFile) formData.append('profile_photo', profilePhotoFile)
    const portfolioFile = portfolioFileRef.current?.files?.[0]
    if (portfolioMode === 'file' && portfolioFile) formData.append('portfolio_file', portfolioFile)

    setLoading(true)
    try {
      const appRes = await fetch('/api/dancer-applications', { method: 'POST', body: formData })
      if (!appRes.ok) {
        let errBody = ''
        try { errBody = await appRes.text() } catch { /* ignore */ }
        console.error('Dancer application API error:', appRes.status, errBody)
        if (appRes.status === 400) {
          try {
            const j = JSON.parse(errBody) as { error?: string }
            if (j.error === 'file_too_large') toast.error(t('applyDancer.errorPortfolioFileSize'))
            else if (j.error === 'file_type') toast.error(t('applyDancer.errorPortfolioFileType'))
            else if (j.error === 'portfolio_required') toast.error(t('applyDancer.errorPortfolioRequired'))
            else if (j.error === 'invalid_portfolio_url') toast.error(t('applyDancer.errorPortfolioUrl'))
            else if (j.error === 'upload_failed') toast.error(t('applyDancer.errorPortfolioUpload'))
            else if (j.error === 'profile_photo_required') toast.error(t('applyDancer.errorProfilePhoto'))
            else if (j.error === 'profile_photo_too_large') toast.error(t('applyDancer.errorProfilePhotoSize'))
            else if (j.error === 'profile_photo_type') toast.error(t('applyDancer.errorProfilePhotoType'))
            else if (j.error === 'profile_photo_upload_failed') toast.error(t('applyDancer.errorPortfolioUpload'))
            else throw new Error(t('applyDancer.errorSubmit'))
          } catch {
            throw new Error(t('applyDancer.errorSubmit'))
          }
        } else {
          throw new Error(t('applyDancer.errorSubmit'))
        }
        return
      }

      const appData = (await appRes.json()) as {
        id?: string
        portfolio_file_path?: string | null
        profile_photo_path?: string | null
      }

      try {
        await fetch('/api/email-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dancer_application',
            full_name: fullName.trim(),
            stage_name: stageName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            birth_date: birthDate,
            gender,
            height_cm: heightNum,
            residence_region: residenceRegion,
            specialties,
            portfolio_url: normalizedPortfolioForMail ?? '',
            portfolio_file_path: appData.portfolio_file_path ?? null,
            profile_photo_path: appData.profile_photo_path ?? null,
            instagram_handle: instagram.trim().replace(/^@+/, ''),
            careers: careerList,
            agency_name: agencyName.trim() || undefined,
            is_korean_national: isKoreanNational,
            nationality,
            has_visa: isKoreanNational ? undefined : hasVisa,
            visa_details: isKoreanNational || !hasVisa ? undefined : visaDetails.trim(),
            privacy_consent: true,
          }),
        })
      } catch (mailErr) {
        console.error('Email webhook error:', mailErr)
      }

      const ticket = appData.id ? appData.id.slice(0, 8).toUpperCase() : ''
      router.push(`/apply/dancer/success?ticket=${ticket}`)
    } catch (err) {
      console.error('Dancer apply submission error:', err)
      toast.error(err instanceof Error ? err.message : t('applyDancer.errorSubmit'))
    } finally {
      setLoading(false)
    }
  }

  const regionLabel = (r: string) => {
    if (r === OVERSEAS_OPTION) return language === 'ko' ? '해외' : 'Overseas'
    return r
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Header />

      <main>
        {/* ───────────── HERO ───────────── */}
        <section className="relative overflow-hidden bg-zinc-950 text-white">
          {/* background accents */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(600px circle at 20% 30%, rgba(251,191,36,0.10), transparent 50%), radial-gradient(600px circle at 80% 60%, rgba(236,72,153,0.08), transparent 50%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />

          <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-28 sm:px-8 sm:pb-28 sm:pt-36">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur">
              <Sparkles className="h-3 w-3 text-amber-300" />
              {t('applyDancer.heroKicker')}
            </div>

            <h1 className="mt-6 text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              {t('applyDancer.pageTitle')}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              {t('applyDancer.subtitle')}
            </p>

            <div className="mt-10 flex flex-wrap gap-2 text-xs font-medium">
              {[
                t('applyDancer.areaAds'),
                t('applyDancer.areaBroadcast'),
                t('applyDancer.areaChoreo'),
                t('applyDancer.areaLive'),
              ].map((label, i) => (
                <span
                  key={i}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/80 backdrop-blur"
                >
                  {label.split(':')[0]}
                </span>
              ))}
            </div>

            <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { n: '01', label: t('applyDancer.process1') },
                { n: '02', label: t('applyDancer.process2') },
                { n: '03', label: t('applyDancer.process3') },
              ].map((p) => (
                <div
                  key={p.n}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:bg-white/[0.06]"
                >
                  <span className="font-mono text-xs font-semibold text-amber-300">{p.n}</span>
                  <p className="mt-3 text-sm leading-relaxed text-white/80">{p.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* soft bottom fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-zinc-950/0"
          />
        </section>

        {/* ───────────── PROGRESS RAIL ───────────── */}
        <div className="sticky top-16 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur">
          <div className="mx-auto max-w-3xl px-6 py-4 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                  {t('applyDancer.stepLabel')} · {doneCount}/{totalSteps}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
                  {!doneBasic
                    ? t('applyDancer.sectionBasic')
                    : !doneProfile
                      ? t('applyDancer.sectionProfile')
                      : !doneVisa
                        ? t('applyDancer.sectionVisa')
                        : !doneCareer
                          ? t('applyDancer.sectionCareer')
                          : t('applyDancer.submit')}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {[doneBasic, doneProfile, doneVisa, doneCareer].map((d, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1.5 w-8 rounded-full transition-colors',
                      d ? 'bg-emerald-500' : 'bg-zinc-200',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ───────────── FORM ───────────── */}
        <div className="bg-zinc-50/60">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14"
          >
            {/* STEP 1 */}
            <SectionCard
              step={1}
              kicker={t('applyDancer.step1')}
              title={t('applyDancer.sectionBasic')}
              done={doneBasic}
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div data-field="stageName">
                  <LabelRow htmlFor="stage_name" required>{t('applyDancer.stageName')}</LabelRow>
                  <Input
                    id="stage_name"
                    className={fieldInputClass}
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    aria-invalid={!!errors.stageName}
                  />
                  <FieldError id="err-stage_name" message={errors.stageName} />
                </div>
                <div data-field="fullName">
                  <LabelRow htmlFor="full_name" required>{t('applyDancer.fullName')}</LabelRow>
                  <Input
                    id="full_name"
                    className={fieldInputClass}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    aria-invalid={!!errors.fullName}
                  />
                  <FieldError id="err-full_name" message={errors.fullName} />
                </div>
                <div data-field="email" className="sm:col-span-2">
                  <LabelRow htmlFor="email" required>{t('applyDancer.email')}</LabelRow>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className={fieldInputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email ? <FieldError id="err-email" message={errors.email} /> : <FieldHint>{t('applyDancer.emailHint')}</FieldHint>}
                </div>
                <div data-field="phone">
                  <LabelRow htmlFor="phone" required>{t('applyDancer.phone')}</LabelRow>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    className={fieldInputClass}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={!!errors.phone}
                  />
                  <FieldError id="err-phone" message={errors.phone} />
                </div>
                <div data-field="birthDate">
                  <LabelRow htmlFor="birth_date" required>{t('applyDancer.birthDate')}</LabelRow>
                  <Input
                    id="birth_date"
                    type="date"
                    className={fieldInputClass}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    aria-invalid={!!errors.birthDate}
                  />
                  <FieldError id="err-birth_date" message={errors.birthDate} />
                </div>
                <div data-field="gender">
                  <LabelRow required>{t('applyDancer.gender')}</LabelRow>
                  <Select value={gender || undefined} onValueChange={(v) => setGender(v as Gender)}>
                    <SelectTrigger className={cn(fieldInputClass, 'w-full')} aria-invalid={!!errors.gender}>
                      <SelectValue placeholder={t('applyDancer.genderPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('applyDancer.genderMale')}</SelectItem>
                      <SelectItem value="female">{t('applyDancer.genderFemale')}</SelectItem>
                      <SelectItem value="other">{t('applyDancer.genderOther')}</SelectItem>
                      <SelectItem value="prefer_not">{t('applyDancer.genderPreferNot')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError id="err-gender" message={errors.gender} />
                </div>
                <div data-field="heightCm">
                  <LabelRow htmlFor="height" required>{t('applyDancer.height')}</LabelRow>
                  <div className="relative">
                    <Input
                      id="height"
                      inputMode="numeric"
                      placeholder="170"
                      className={cn(fieldInputClass, 'pr-10')}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value.replace(/[^\d]/g, ''))}
                      aria-invalid={!!errors.heightCm}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">cm</span>
                  </div>
                  {errors.heightCm ? <FieldError id="err-height" message={errors.heightCm} /> : <FieldHint>{t('applyDancer.heightHint')}</FieldHint>}
                </div>
                <div data-field="residenceRegion" className="sm:col-span-2">
                  <LabelRow required>{t('applyDancer.residenceRegion')}</LabelRow>
                  <Select value={residenceRegion || undefined} onValueChange={setResidenceRegion}>
                    <SelectTrigger className={cn(fieldInputClass, 'w-full')} aria-invalid={!!errors.residenceRegion}>
                      <SelectValue placeholder={t('applyDancer.residenceRegionPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {KOREA_REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                      <SelectItem value={OVERSEAS_OPTION}>{regionLabel(OVERSEAS_OPTION)}</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.residenceRegion ? <FieldError id="err-region" message={errors.residenceRegion} /> : <FieldHint>{t('applyDancer.residenceRegionHint')}</FieldHint>}
                </div>
              </div>
            </SectionCard>

            {/* STEP 2 */}
            <SectionCard
              step={2}
              kicker={t('applyDancer.step2')}
              title={t('applyDancer.sectionProfile')}
              done={doneProfile}
            >
              {/* profile photo */}
              <div data-field="profilePhoto" className="mb-8">
                <LabelRow required>{t('applyDancer.profilePhoto')}</LabelRow>
                <div className="flex items-start gap-5">
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className={cn(
                      'group relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-900/10',
                      profilePhotoPreview ? 'border-zinc-300' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100',
                      errors.profilePhoto && !profilePhotoPreview ? 'border-red-300 bg-red-50' : '',
                    )}
                    aria-label={t('applyDancer.profilePhotoSelect')}
                  >
                    {profilePhotoPreview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={profilePhotoPreview} alt="" className="h-full w-full object-cover" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <Camera className="h-6 w-6 text-white" />
                        </span>
                      </>
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-zinc-400 group-hover:text-zinc-600">
                        <Camera className="h-7 w-7" aria-hidden />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">upload</span>
                      </span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1 pt-1">
                    <input
                      ref={profilePhotoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleProfilePhotoChange(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-sm font-medium text-zinc-800">
                      {profilePhotoFile ? profilePhotoFile.name : t('applyDancer.profilePhotoSelect')}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{t('applyDancer.profilePhotoHint')}</p>
                    {profilePhotoFile ? (
                      <button
                        type="button"
                        onClick={() => handleProfilePhotoChange(null)}
                        className="mt-2 text-xs font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
                      >
                        {t('applyDancer.careerRemove')}
                      </button>
                    ) : null}
                    <FieldError id="err-profile_photo" message={errors.profilePhoto} />
                  </div>
                </div>
              </div>

              {/* specialties */}
              <div data-field="specialties" className="mb-8">
                <div className="mb-1.5 flex items-center justify-between">
                  <LabelRow required>{t('applyDancer.specialties')}</LabelRow>
                  <span className="text-xs tabular-nums text-zinc-400">{specialties.length}/10</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DANCE_SPECIALTIES.map((s) => {
                    const active = specialties.includes(s.value)
                    return (
                      <button
                        type="button"
                        key={s.value}
                        onClick={() => toggleSpecialty(s.value)}
                        aria-pressed={active}
                        className={cn(
                          'inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-all',
                          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-900/10',
                          active
                            ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm hover:bg-zinc-800'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50',
                        )}
                      >
                        {active ? <Check className="mr-1.5 h-3.5 w-3.5" /> : null}
                        {language === 'ko' ? s.label_ko : s.label_en}
                      </button>
                    )
                  })}
                </div>
                {errors.specialties ? <FieldError id="err-specialties" message={errors.specialties} /> : <FieldHint>{t('applyDancer.specialtiesHint')}</FieldHint>}
              </div>

              {/* portfolio */}
              <div data-field="portfolio" className="mb-8">
                <LabelRow required>{t('applyDancer.portfolio')}</LabelRow>
                <Tabs value={portfolioMode} onValueChange={(v) => setPortfolioMode(v as 'url' | 'file')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url" className="gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5" />
                      {t('applyDancer.portfolioTabUrl')}
                    </TabsTrigger>
                    <TabsTrigger value="file" className="gap-1.5">
                      <FileUp className="h-3.5 w-3.5" />
                      {t('applyDancer.portfolioTabFile')}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="url" className="mt-4">
                    <Input
                      id="portfolio"
                      type="url"
                      placeholder="https://"
                      className={fieldInputClass}
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      aria-invalid={!!errors.portfolio}
                    />
                    <FieldHint>{t('applyDancer.portfolioHint')}</FieldHint>
                  </TabsContent>
                  <TabsContent value="file" className="mt-4">
                    <button
                      type="button"
                      onClick={() => portfolioFileRef.current?.click()}
                      className={cn(
                        'flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 transition-colors hover:border-zinc-500 hover:bg-zinc-100',
                        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-900/10',
                        portfolioFileName ? 'border-solid border-emerald-300 bg-emerald-50/50 text-emerald-800' : '',
                      )}
                    >
                      <FileUp className="h-5 w-5" />
                      {portfolioFileName ? portfolioFileName : language === 'ko' ? '클릭해서 파일 선택 (PDF/PNG/JPG, 최대 4MB)' : 'Click to select file (PDF/PNG/JPG, max 4MB)'}
                    </button>
                    <input
                      ref={portfolioFileRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => setPortfolioFileName(e.target.files?.[0]?.name ?? '')}
                    />
                    {portfolioFileName ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPortfolioFileName('')
                          if (portfolioFileRef.current) portfolioFileRef.current.value = ''
                        }}
                        className="mt-2 text-xs font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
                      >
                        {language === 'ko' ? '제거' : 'Remove'}
                      </button>
                    ) : (
                      <FieldHint>{t('applyDancer.portfolioFileHint')}</FieldHint>
                    )}
                  </TabsContent>
                </Tabs>
                <FieldError id="err-portfolio" message={errors.portfolio} />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div data-field="instagram">
                  <LabelRow htmlFor="instagram" required>{t('applyDancer.instagram')}</LabelRow>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">@</span>
                    <Input
                      id="instagram"
                      placeholder="username"
                      className={cn(fieldInputClass, 'pl-8')}
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value.replace(/^@+/, ''))}
                      aria-invalid={!!errors.instagram}
                    />
                  </div>
                  {errors.instagram ? <FieldError id="err-instagram" message={errors.instagram} /> : <FieldHint>{t('applyDancer.instagramHint')}</FieldHint>}
                </div>
                <div>
                  <LabelRow htmlFor="agency">{t('applyDancer.agency')}</LabelRow>
                  <Input
                    id="agency"
                    className={fieldInputClass}
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                  />
                  <FieldHint>{t('applyDancer.agencyHint')}</FieldHint>
                </div>
              </div>
            </SectionCard>

            {/* STEP 3 */}
            <SectionCard
              step={3}
              kicker={t('applyDancer.step3')}
              title={t('applyDancer.sectionVisa')}
              done={doneVisa}
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition-colors hover:border-zinc-300">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  checked={isKoreanNational}
                  onChange={(e) => {
                    setIsKoreanNational(e.target.checked)
                    if (e.target.checked) {
                      setForeignCountry('')
                      setHasVisa(null)
                      setVisaDetails('')
                    }
                  }}
                />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{t('applyDancer.koreanNational')}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{t('applyDancer.nationalityLabel')}</p>
                </div>
              </label>

              {!isKoreanNational && (
                <div className="mt-5 space-y-5">
                  <div data-field="foreignCountry">
                    <LabelRow htmlFor="foreign_country" required>{t('applyDancer.foreignCountry')}</LabelRow>
                    <Input
                      id="foreign_country"
                      className={fieldInputClass}
                      value={foreignCountry}
                      onChange={(e) => setForeignCountry(e.target.value)}
                      autoComplete="country-name"
                      aria-invalid={!!errors.foreignCountry}
                    />
                    {errors.foreignCountry ? <FieldError id="err-foreign" message={errors.foreignCountry} /> : <FieldHint>{t('applyDancer.foreignCountryHint')}</FieldHint>}
                  </div>
                  <fieldset data-field="hasVisa">
                    <legend className="mb-1.5 text-sm font-semibold text-zinc-800">
                      {t('applyDancer.visaQuestion')} <Req />
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { val: true, label: t('applyDancer.visaYes') },
                          { val: false, label: t('applyDancer.visaNo') },
                        ] as const
                      ).map((opt) => {
                        const active = hasVisa === opt.val
                        return (
                          <button
                            type="button"
                            key={String(opt.val)}
                            onClick={() => {
                              setHasVisa(opt.val)
                              if (opt.val === false) setVisaDetails('')
                            }}
                            aria-pressed={active}
                            className={cn(
                              'inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-all',
                              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-900/10',
                              active
                                ? 'border-zinc-900 bg-zinc-900 text-white'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
                            )}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                    <FieldError id="err-has_visa" message={errors.hasVisa} />
                  </fieldset>
                  {hasVisa === true && (
                    <div data-field="visaDetails">
                      <LabelRow htmlFor="visa_details" required>{t('applyDancer.visaDetails')}</LabelRow>
                      <Textarea
                        id="visa_details"
                        value={visaDetails}
                        onChange={(e) => setVisaDetails(e.target.value)}
                        rows={3}
                        className="min-h-[6rem] resize-y rounded-lg border-zinc-200 text-[15px] shadow-none focus-visible:border-zinc-900 focus-visible:ring-4 focus-visible:ring-zinc-900/10"
                        aria-invalid={!!errors.visaDetails}
                      />
                      {errors.visaDetails ? <FieldError id="err-visa" message={errors.visaDetails} /> : <FieldHint>{t('applyDancer.visaDetailsHint')}</FieldHint>}
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            {/* STEP 4 */}
            <SectionCard
              step={4}
              kicker={t('applyDancer.step4')}
              title={t('applyDancer.sectionCareer')}
              done={doneCareer}
            >
              <div data-field="careers">
                <div className="mb-1.5 flex items-center justify-between">
                  <LabelRow required>{t('applyDancer.careers')}</LabelRow>
                  <span className="text-xs tabular-nums text-zinc-400">{careers.filter((c) => c.trim()).length}</span>
                </div>
                <div className="space-y-2">
                  {careers.map((c, i) => (
                    <div key={i} className="group flex items-center gap-2">
                      <span className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 font-mono text-xs font-semibold text-zinc-500">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <Input
                        value={c}
                        onChange={(e) => setCareers((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                        placeholder={t('applyDancer.careerPlaceholder')}
                        className={fieldInputClass}
                      />
                      {careers.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setCareers((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label={t('applyDancer.careerRemove')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-full"
                  onClick={() => setCareers((prev) => (prev.length >= 40 ? prev : [...prev, '']))}
                  disabled={careers.length >= 40}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('applyDancer.careerAdd')}
                </Button>
                {errors.careers ? <FieldError id="err-careers" message={errors.careers} /> : <FieldHint>{t('applyDancer.careersHint')}</FieldHint>}
              </div>

              <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50/60 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{t('applyDancer.termsTitle')}</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900">
                        {t('applyDancer.privacyViewDetail')}
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{t('applyDancer.termsTitle')}</DialogTitle>
                        <DialogDescription asChild>
                          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                            {t('applyDancer.termsBody')}
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-600 sm:text-sm">{t('applyDancer.termsBody')}</p>
                <label
                  data-field="privacyConsent"
                  className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    aria-invalid={!!errors.privacyConsent}
                  />
                  <span className="text-sm font-medium text-zinc-800">
                    {t('applyDancer.privacyConsent')} <Req />
                  </span>
                </label>
                <FieldError id="err-consent" message={errors.privacyConsent} />
              </div>
            </SectionCard>

            {/* SUBMIT */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{t('applyDancer.stepLabel')} · {doneCount}/{totalSteps}</p>
                  <p className="mt-1.5 text-lg font-semibold tracking-tight sm:text-xl">
                    {doneCount === totalSteps
                      ? language === 'ko' ? '모두 준비되었습니다. 제출하시겠어요?' : "You're all set — ready to submit?"
                      : language === 'ko' ? '누락된 항목을 채워주세요.' : 'Please fill in the missing fields.'}
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    onClick={() => router.push('/')}
                    disabled={loading}
                  >
                    {t('applyDancer.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="group h-11 min-w-[12rem] rounded-full bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('applyDancer.sending')}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {t('applyDancer.submit')}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <p className="pt-2 text-center text-xs leading-relaxed text-zinc-500">{t('applyDancer.signoff')}</p>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}
