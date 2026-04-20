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
  Send,
  Loader2,
  Check,
  Camera,
  Link as LinkIcon,
  FileUp,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { DANCE_SPECIALTIES, specialtyLabel } from '@/lib/dancer-specialties'
import { RESIDENCE_OPTIONS, KOREA_REGIONS, OVERSEAS_OPTION } from '@/lib/dancer-regions'

type Gender = 'male' | 'female' | 'other' | 'prefer_not'
type FieldErrors = Partial<Record<string, string>>

/* 흑백 원칙:
   - 컬러 포인트 일절 없음 (black / white / zinc grays only)
   - 상태 구분은 fill / border-weight / typography로만
   - 완료: filled black dot
   - 필수·에러: text-black + font-semibold (빨강 없음)
*/

const inputBase =
  'h-11 rounded-none border border-zinc-300 bg-white text-[15px] shadow-none ' +
  'placeholder:text-zinc-400 ' +
  'focus-visible:border-black focus-visible:ring-0 focus-visible:outline-none ' +
  'aria-[invalid=true]:border-black aria-[invalid=true]:ring-0'

function Req() {
  return (
    <span className="text-black" aria-label="필수">
      *
    </span>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
      {children}
    </p>
  )
}

function SectionBlock({
  step,
  title,
  done,
  children,
}: {
  step: number
  title: string
  done?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-black pt-10">
      <header className="mb-6 flex items-baseline gap-4">
        <span className="font-mono text-sm font-semibold tabular-nums text-black">
          {String(step).padStart(2, '0')}
        </span>
        <h2 className="flex-1 text-lg font-semibold tracking-tight text-black sm:text-xl">
          {title}
        </h2>
        {done ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-black">
            <Check className="h-3 w-3" strokeWidth={2.5} />
            done
          </span>
        ) : null}
      </header>
      <div>{children}</div>
    </section>
  )
}

function LabelRow({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-zinc-900">
      {children}
      {required ? <Req /> : null}
    </Label>
  )
}

function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-black">
      <span aria-hidden className="inline-block h-0.5 w-2 bg-black" />
      {message}
    </p>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-zinc-500">{children}</p>
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
  const [careersText, setCareersText] = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [tosExpanded, setTosExpanded] = useState(false)
  const [ppExpanded, setPpExpanded] = useState(false)

  const koreaNationalityLabel = t('applyDancer.nationalityKorea')

  useEffect(() => {
    return () => {
      if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview)
    }
  }, [profilePhotoPreview])

  const doneBasicFields = Boolean(
    stageName.trim() && fullName.trim() && email.trim() && phone.trim() && birthDate && gender && heightCm && residenceRegion,
  )
  const doneVisa = isKoreanNational || (foreignCountry.trim().length >= 2 && hasVisa !== null && (hasVisa === false || visaDetails.trim().length >= 2))
  const doneSection1 = doneBasicFields && doneVisa

  const doneProfileFields = Boolean(
    profilePhotoFile && specialties.length > 0 && instagram.trim(),
  )
  const doneCareers = careersText.trim().length > 0 && privacyConsent
  const doneSection2 = doneProfileFields && doneCareers

  const totalSteps = 2
  const doneCount = [doneSection1, doneSection2].filter(Boolean).length

  const currentStep = !doneSection1 ? 1 : !doneSection2 ? 2 : 2
  const currentTitle = !doneSection1 ? t('applyDancer.sectionBasic') : t('applyDancer.sectionProfile')

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

    if (portfolioMode === 'url' && portfolioUrl.trim()) {
      let n = portfolioUrl.trim()
      if (!/^https?:\/\//i.test(n)) n = `https://${n}`
      try { void new URL(n) } catch { e.portfolio = t('applyDancer.errorPortfolioUrl') }
    }

    if (!isKoreanNational) {
      if (foreignCountry.trim().length < 2) e.foreignCountry = t('applyDancer.errorForeignCountry')
      if (hasVisa === null) e.hasVisa = t('applyDancer.errorRequired')
      if (hasVisa === true && visaDetails.trim().length < 2) e.visaDetails = t('applyDancer.errorVisaDetails')
    }

    if (!careersText.trim()) e.careers = t('applyDancer.errorRequired')

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
    const careerList = careersText.trim().split('\n').map((c) => c.trim()).filter(Boolean)

    let normalizedPortfolioForMail: string | null = null
    if (portfolioMode === 'url' && portfolioUrl.trim()) {
      let n = portfolioUrl.trim()
      if (!/^https?:\/\//i.test(n)) n = `https://${n}`
      try {
        void new URL(n)
        normalizedPortfolioForMail = n
      } catch {
        /* noop */
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
    if (r === OVERSEAS_OPTION) return t('applyDancer.regionOverseas')
    return r
  }

  const sectionLabels = [
    t('applyDancer.sectionBasic'),
    t('applyDancer.sectionProfile'),
  ]

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <Header />

      <main>
        {/* ───────────── HERO — pure black, type only ───────────── */}
        <section className="border-b border-black bg-black text-white">
          <div className="mx-auto max-w-3xl break-keep px-6 py-20 sm:px-8 sm:py-24">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
              {t('applyDancer.heroKicker')}
            </p>

            <h1 className="mt-6 text-balance text-[1.9rem] font-bold leading-[1.2] tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-[1.15]">
              {t('applyDancer.pageTitle')}
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-[1.7] text-white/70">
              {t('applyDancer.subtitle')}
            </p>
          </div>
        </section>

        {/* ───────────── STICKY PROGRESS RAIL ───────────── */}
        <div className="sticky top-16 z-30 border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-3 sm:px-8">
            <div className="flex items-baseline gap-1.5 text-[11px]">
              <span className="font-mono font-semibold tabular-nums text-black">
                {String(currentStep).padStart(2, '0')}
              </span>
              <span className="text-zinc-400">/</span>
              <span className="font-mono tabular-nums text-zinc-500">02</span>
              <span className="ml-3 font-medium text-black">{currentTitle}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[doneSection1, doneSection2].map((d, i) => (
                <span
                  key={i}
                  aria-label={sectionLabels[i]}
                  className={cn(
                    'h-0.5 w-6 transition-colors sm:w-8',
                    d ? 'bg-black' : 'bg-zinc-200',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ───────────── FORM ───────────── */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mx-auto max-w-2xl px-6 py-14 sm:px-8 sm:py-20"
        >
          <div className="space-y-14">
            {/* ── SECTION 1: 기본 정보 + 국적·비자 ── */}
            <SectionBlock step={1} title={t('applyDancer.sectionBasic')} done={doneSection1}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div data-field="stageName">
                  <LabelRow htmlFor="stage_name" required>{t('applyDancer.stageName')}</LabelRow>
                  <Input
                    id="stage_name"
                    className={inputBase}
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
                    className={inputBase}
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
                    className={inputBase}
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
                    className={inputBase}
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
                    className={cn(inputBase, '[color-scheme:light]')}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    aria-invalid={!!errors.birthDate}
                  />
                  <FieldError id="err-birth_date" message={errors.birthDate} />
                </div>
                <div data-field="gender">
                  <LabelRow required>{t('applyDancer.gender')}</LabelRow>
                  <Select value={gender || undefined} onValueChange={(v) => setGender(v as Gender)}>
                    <SelectTrigger className={cn(inputBase, 'w-full')} aria-invalid={!!errors.gender}>
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
                      className={cn(inputBase, 'pr-10')}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value.replace(/[^\d]/g, ''))}
                      aria-invalid={!!errors.heightCm}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">
                      cm
                    </span>
                  </div>
                  {errors.heightCm ? <FieldError id="err-height" message={errors.heightCm} /> : <FieldHint>{t('applyDancer.heightHint')}</FieldHint>}
                </div>
                <div data-field="residenceRegion" className="sm:col-span-2">
                  <LabelRow required>{t('applyDancer.residenceRegion')}</LabelRow>
                  <Select value={residenceRegion || undefined} onValueChange={setResidenceRegion}>
                    <SelectTrigger className={cn(inputBase, 'w-full')} aria-invalid={!!errors.residenceRegion}>
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

              {/* 국적·비자 서브섹션 */}
              <div className="mt-8 border-t border-zinc-200 pt-8">
                <Kicker>{t('applyDancer.sectionVisa')}</Kicker>
                <div className="mt-4">
                  <label className="flex cursor-pointer items-start gap-3 border border-zinc-300 bg-white p-4 transition-colors hover:border-black">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-black"
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
                      <p className="text-sm font-medium text-black">{t('applyDancer.koreanNational')}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{t('applyDancer.nationalityLabel')}</p>
                    </div>
                  </label>

                  {!isKoreanNational && (
                    <div className="mt-5 space-y-5">
                      <div data-field="foreignCountry">
                        <LabelRow htmlFor="foreign_country" required>{t('applyDancer.foreignCountry')}</LabelRow>
                        <Input
                          id="foreign_country"
                          className={inputBase}
                          value={foreignCountry}
                          onChange={(e) => setForeignCountry(e.target.value)}
                          autoComplete="country-name"
                          aria-invalid={!!errors.foreignCountry}
                        />
                        {errors.foreignCountry ? <FieldError id="err-foreign" message={errors.foreignCountry} /> : <FieldHint>{t('applyDancer.foreignCountryHint')}</FieldHint>}
                      </div>
                      <fieldset data-field="hasVisa">
                        <legend className="mb-1.5 text-[13px] font-medium text-zinc-900">
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
                                  'inline-flex h-11 items-center justify-center border px-4 text-sm font-medium transition-colors',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1',
                                  active
                                    ? 'border-black bg-black text-white'
                                    : 'border-zinc-300 bg-white text-zinc-800 hover:border-black hover:text-black',
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
                            className={cn(inputBase, 'h-auto min-h-[6rem] resize-y py-2')}
                            aria-invalid={!!errors.visaDetails}
                          />
                          {errors.visaDetails ? <FieldError id="err-visa" message={errors.visaDetails} /> : <FieldHint>{t('applyDancer.visaDetailsHint')}</FieldHint>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </SectionBlock>

            {/* ── SECTION 2: 프로필 + 경력 + 동의 ── */}
            <SectionBlock step={2} title={t('applyDancer.sectionProfile')} done={doneSection2}>
              {/* 프로필 사진 */}
              <div data-field="profilePhoto" className="mb-10">
                <LabelRow required>{t('applyDancer.profilePhoto')}</LabelRow>
                <div className="flex items-start gap-5">
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className={cn(
                      'group relative h-28 w-28 shrink-0 overflow-hidden border transition-colors',
                      'focus-visible:outline-none focus-visible:border-black',
                      profilePhotoPreview
                        ? 'border-black'
                        : 'border-dashed border-zinc-400 bg-zinc-50 hover:border-black hover:bg-white',
                    )}
                    aria-label={t('applyDancer.profilePhotoSelect')}
                  >
                    {profilePhotoPreview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={profilePhotoPreview} alt="" className="h-full w-full object-cover grayscale-[0.3]" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Camera className="h-5 w-5 text-white" />
                        </span>
                      </>
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-500 group-hover:text-black">
                        <Camera className="h-5 w-5" aria-hidden />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">upload</span>
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
                    <p className="text-sm font-medium text-black">
                      {profilePhotoFile ? profilePhotoFile.name : t('applyDancer.profilePhotoSelect')}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{t('applyDancer.profilePhotoHint')}</p>
                    {profilePhotoFile ? (
                      <button
                        type="button"
                        onClick={() => handleProfilePhotoChange(null)}
                        className="mt-2 text-xs font-medium text-black underline underline-offset-4 hover:no-underline"
                      >
                        {t('applyDancer.careerRemove')}
                      </button>
                    ) : null}
                    <FieldError id="err-profile_photo" message={errors.profilePhoto} />
                  </div>
                </div>
              </div>

              {/* 전문 장르 */}
              <div data-field="specialties" className="mb-10">
                <div className="mb-1.5 flex items-center justify-between">
                  <LabelRow required>{t('applyDancer.specialties')}</LabelRow>
                  <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                    {String(specialties.length).padStart(2, '0')} / 10
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DANCE_SPECIALTIES.map((s) => {
                    const active = specialties.includes(s.value)
                    return (
                      <button
                        type="button"
                        key={s.value}
                        onClick={() => toggleSpecialty(s.value)}
                        aria-pressed={active}
                        className={cn(
                          'inline-flex h-8 items-center border px-3 text-xs font-medium transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1',
                          active
                            ? 'border-black bg-black text-white'
                            : 'border-zinc-300 bg-white text-zinc-800 hover:border-black hover:text-black',
                        )}
                      >
                        {active ? <Check className="mr-1 h-3 w-3" /> : null}
                        {specialtyLabel(s.value, language)}
                      </button>
                    )
                  })}
                </div>
                {errors.specialties ? <FieldError id="err-specialties" message={errors.specialties} /> : <FieldHint>{t('applyDancer.specialtiesHint')}</FieldHint>}
              </div>

              {/* 인스타그램 + 소속사 */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div data-field="instagram">
                  <LabelRow htmlFor="instagram" required>{t('applyDancer.instagram')}</LabelRow>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">@</span>
                    <Input
                      id="instagram"
                      placeholder="username"
                      className={cn(inputBase, 'pl-8')}
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
                    className={inputBase}
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                  />
                  <FieldHint>{t('applyDancer.agencyHint')}</FieldHint>
                </div>
              </div>

              {/* 경력·포트폴리오 서브섹션 */}
              <div className="mt-8 border-t border-zinc-200 pt-8">
                <Kicker>{t('applyDancer.sectionCareer')}</Kicker>

                {/* 경력 */}
                <div className="mt-4" data-field="careers">
                  <LabelRow htmlFor="careers" required>{t('applyDancer.careers')}</LabelRow>
                  <Textarea
                    id="careers"
                    value={careersText}
                    onChange={(e) => setCareersText(e.target.value)}
                    rows={6}
                    placeholder={t('applyDancer.careerPlaceholder')}
                    className={cn(inputBase, 'h-auto min-h-[9rem] resize-y py-2')}
                    aria-invalid={!!errors.careers}
                  />
                  {errors.careers ? <FieldError id="err-careers" message={errors.careers} /> : <FieldHint>{t('applyDancer.careersHint')}</FieldHint>}
                </div>

                {/* 포트폴리오 (선택) */}
                <div data-field="portfolio" className="mt-6">
                  <div className="mb-1.5 flex items-center gap-2">
                    <LabelRow>{t('applyDancer.portfolio')}</LabelRow>
                    <span className="text-[11px] font-medium text-zinc-400">{t('applyDancer.portfolioOptional')}</span>
                  </div>
                  <Tabs value={portfolioMode} onValueChange={(v) => setPortfolioMode(v as 'url' | 'file')}>
                    <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border border-zinc-300 bg-white p-0">
                      <TabsTrigger
                        value="url"
                        className="gap-1.5 rounded-none border-r border-zinc-300 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none"
                      >
                        <LinkIcon className="h-3 w-3" />
                        {t('applyDancer.portfolioTabUrl')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="file"
                        className="gap-1.5 rounded-none py-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none"
                      >
                        <FileUp className="h-3 w-3" />
                        {t('applyDancer.portfolioTabFile')}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="mt-4">
                      <Input
                        id="portfolio"
                        type="url"
                        placeholder="https://"
                        className={inputBase}
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
                          'flex w-full items-center justify-center gap-3 border px-4 py-6 text-sm transition-colors',
                          'focus-visible:outline-none focus-visible:border-black',
                          portfolioFileName
                            ? 'border-black bg-white text-black'
                            : 'border-dashed border-zinc-400 bg-zinc-50 text-zinc-600 hover:border-black hover:text-black',
                        )}
                      >
                        <FileUp className="h-4 w-4" />
                        {portfolioFileName ? portfolioFileName : t('applyDancer.portfolioFilePlaceholder')}
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
                          className="mt-2 text-xs font-medium text-black underline underline-offset-4 hover:no-underline"
                        >
                          {t('applyDancer.remove')}
                        </button>
                      ) : (
                        <FieldHint>{t('applyDancer.portfolioFileHint')}</FieldHint>
                      )}
                    </TabsContent>
                  </Tabs>
                  <FieldError id="err-portfolio" message={errors.portfolio} />
                </div>
              </div>

              {/* 이용약관 & 동의 */}
              <div className="mt-8 border border-zinc-300">
                <div className="border-b border-zinc-200 px-5 py-4">
                  <Kicker>{t('applyDancer.termsTitle')}</Kicker>
                </div>

                <div className="border-b border-zinc-200 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-800">
                      {t('applyDancer.tosTitle')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setTosExpanded((v) => !v)}
                      className="shrink-0 text-xs font-medium text-black underline underline-offset-4 hover:no-underline"
                    >
                      {tosExpanded ? t('applyDancer.showLess') : t('applyDancer.showMore')}
                    </button>
                  </div>
                  <div
                    className={cn(
                      'mt-3 overflow-hidden text-xs leading-relaxed text-zinc-600 transition-all',
                      tosExpanded ? 'max-h-[32rem] overflow-y-auto' : 'max-h-[4.5rem]',
                    )}
                  >
                    <p className={cn('whitespace-pre-wrap', !tosExpanded && 'line-clamp-3')}>
                      {tosExpanded ? t('applyDancer.tosFull') : t('applyDancer.tosShort')}
                    </p>
                  </div>
                </div>

                <div className="border-b border-zinc-200 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-800">
                      {t('applyDancer.ppTitle')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPpExpanded((v) => !v)}
                      className="shrink-0 text-xs font-medium text-black underline underline-offset-4 hover:no-underline"
                    >
                      {ppExpanded ? t('applyDancer.showLess') : t('applyDancer.showMore')}
                    </button>
                  </div>
                  <div
                    className={cn(
                      'mt-3 overflow-hidden text-xs leading-relaxed text-zinc-600 transition-all',
                      ppExpanded ? 'max-h-[32rem] overflow-y-auto' : 'max-h-[4.5rem]',
                    )}
                  >
                    <p className={cn('whitespace-pre-wrap', !ppExpanded && 'line-clamp-3')}>
                      {ppExpanded ? t('applyDancer.ppFull') : t('applyDancer.ppShort')}
                    </p>
                  </div>
                </div>

                <label
                  data-field="privacyConsent"
                  className="flex cursor-pointer items-start gap-3 px-5 py-4"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    aria-invalid={!!errors.privacyConsent}
                  />
                  <span className="text-sm font-medium leading-snug text-black">
                    {t('applyDancer.privacyConsent')} <Req />
                  </span>
                </label>
                <div className="px-5 pb-4">
                  <FieldError id="err-consent" message={errors.privacyConsent} />
                </div>
              </div>
            </SectionBlock>
          </div>

          {/* SUBMIT */}
          <div className="mt-14 flex flex-col gap-4 border-t border-black pt-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Kicker>
                {doneCount === totalSteps ? t('applyDancer.readyToSubmit') : t('applyDancer.missingFields')}
              </Kicker>
              <p className="mt-1.5 font-mono text-xs tabular-nums text-zinc-500">
                {String(doneCount).padStart(2, '0')} / 0{totalSteps}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-none border-zinc-300 bg-white text-black hover:border-black hover:bg-white"
                onClick={() => router.push('/')}
                disabled={loading}
              >
                {t('applyDancer.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="group h-11 min-w-[11rem] rounded-none bg-black font-semibold tracking-wide text-white hover:bg-zinc-800"
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

          <p className="pt-10 text-center text-xs leading-relaxed text-zinc-500">{t('applyDancer.signoff')}</p>
        </form>
      </main>

      <Footer />
    </div>
  )
}
