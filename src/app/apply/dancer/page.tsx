'use client'

import { useRef, useState } from 'react'
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
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

type Gender = 'male' | 'female' | 'other' | 'prefer_not'

const inputClass =
  'h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-none transition-colors placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none'

function Req() {
  return <span className="text-zinc-900">*</span>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-zinc-100 pb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
      {children}
    </h2>
  )
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col border border-zinc-200 bg-white p-6 sm:p-7">
      <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-zinc-900">{title}</h3>
      <span className="mt-3 block h-px w-9 bg-zinc-900" aria-hidden />
      <div className="mt-5 flex-1">{children}</div>
    </div>
  )
}

export default function DancerApplyPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const portfolioFileRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState('')
  const [stageName, setStageName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [instagram, setInstagram] = useState('')
  const [careerText, setCareerText] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [isKoreanNational, setIsKoreanNational] = useState(true)
  const [foreignCountry, setForeignCountry] = useState('')
  const [hasVisa, setHasVisa] = useState<boolean | null>(null)
  const [visaDetails, setVisaDetails] = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)

  const koreaNationalityLabel = language === 'ko' ? '대한민국' : 'Republic of Korea'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const heightNum = parseInt(heightCm.replace(/\D/g, ''), 10)
    if (Number.isNaN(heightNum) || heightNum < 120 || heightNum > 220) {
      toast.error(t('applyDancer.errorHeight'))
      return
    }

    if (!gender) {
      toast.error(t('applyDancer.errorRequired'))
      return
    }

    const careers = careerText
      .split(/\r?\n/)
      .map((c) => c.trim())
      .filter(Boolean)
    if (careers.length < 1) {
      toast.error(t('applyDancer.errorRequired'))
      return
    }

    if (!privacyConsent) {
      toast.error(t('applyDancer.errorRequired'))
      return
    }

    const nationality = isKoreanNational ? koreaNationalityLabel : foreignCountry.trim()
    if (!isKoreanNational && nationality.length < 2) {
      toast.error(t('applyDancer.errorForeignCountry'))
      return
    }

    if (!isKoreanNational) {
      if (hasVisa === null) {
        toast.error(t('applyDancer.errorRequired'))
        return
      }
      if (hasVisa === true && visaDetails.trim().length < 2) {
        toast.error(t('applyDancer.errorVisaDetails'))
        return
      }
    }

    const portfolioFile = portfolioFileRef.current?.files?.[0]
    if (!portfolioUrl.trim() && !portfolioFile) {
      toast.error(t('applyDancer.errorPortfolioRequired'))
      return
    }

    let normalizedPortfolioForMail: string | null = null
    if (portfolioUrl.trim()) {
      let n = portfolioUrl.trim()
      if (!/^https?:\/\//i.test(n)) n = `https://${n}`
      try {
        void new URL(n)
        normalizedPortfolioForMail = n
      } catch {
        toast.error(t('applyDancer.errorPortfolioUrl'))
        return
      }
    }

    if (!fullName.trim() || !stageName.trim() || !birthDate || !instagram.trim()) {
      toast.error(t('applyDancer.errorRequired'))
      return
    }

    const formData = new FormData()
    formData.append('full_name', fullName.trim())
    formData.append('stage_name', stageName.trim())
    formData.append('phone', phone.trim())
    formData.append('birth_date', birthDate)
    formData.append('gender', gender as string)
    formData.append('height_cm', String(heightNum))
    formData.append('portfolio_url', portfolioUrl.trim())
    formData.append('instagram_handle', instagram.trim())
    formData.append('careers', careerText)
    formData.append('agency_name', agencyName.trim())
    formData.append('is_korean_national', isKoreanNational ? 'true' : 'false')
    formData.append('nationality', nationality)
    if (!isKoreanNational) {
      formData.append('has_visa', hasVisa === true ? 'true' : 'false')
      if (hasVisa === true) formData.append('visa_details', visaDetails.trim())
    }
    formData.append('privacy_consent', 'true')
    if (portfolioFile) formData.append('portfolio_file', portfolioFile)

    setLoading(true)
    try {
      const appRes = await fetch('/api/dancer-applications', {
        method: 'POST',
        body: formData,
      })

      if (!appRes.ok) {
        let errBody = ''
        try {
          errBody = await appRes.text()
        } catch {
          /* ignore */
        }
        console.error('Dancer application API error:', appRes.status, errBody)
        if (appRes.status === 400) {
          try {
            const j = JSON.parse(errBody) as { error?: string }
            if (j.error === 'file_too_large') toast.error(t('applyDancer.errorPortfolioFileSize'))
            else if (j.error === 'file_type') toast.error(t('applyDancer.errorPortfolioFileType'))
            else if (j.error === 'portfolio_required') toast.error(t('applyDancer.errorPortfolioRequired'))
            else if (j.error === 'invalid_portfolio_url') toast.error(t('applyDancer.errorPortfolioUrl'))
            else if (j.error === 'upload_failed') toast.error(t('applyDancer.errorPortfolioUpload'))
            else throw new Error(t('applyDancer.errorSubmit'))
          } catch {
            throw new Error(t('applyDancer.errorSubmit'))
          }
        } else {
          throw new Error(t('applyDancer.errorSubmit'))
        }
        return
      }

      const appData = (await appRes.json()) as { id?: string; portfolio_file_path?: string | null }

      try {
        const mailRes = await fetch('/api/email-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dancer_application',
            full_name: fullName.trim(),
            stage_name: stageName.trim(),
            phone: phone.trim(),
            birth_date: birthDate,
            gender,
            height_cm: heightNum,
            portfolio_url: normalizedPortfolioForMail ?? '',
            portfolio_file_path: appData.portfolio_file_path ?? null,
            instagram_handle: instagram.trim().replace(/^@+/, ''),
            careers,
            agency_name: agencyName.trim() || undefined,
            is_korean_national: isKoreanNational,
            nationality,
            has_visa: isKoreanNational ? undefined : hasVisa,
            visa_details: isKoreanNational || !hasVisa ? undefined : visaDetails.trim(),
            privacy_consent: true,
          }),
        })
        if (!mailRes.ok) {
          console.warn('email-webhook dancer_application status:', mailRes.status)
          toast.warning(t('applyDancer.emailWarn'))
        }
      } catch (mailErr) {
        console.error('Email webhook error:', mailErr)
        toast.warning(t('applyDancer.emailWarn'))
      }

      toast.success(t('applyDancer.success'))
      setFullName('')
      setStageName('')
      setPhone('')
      setBirthDate('')
      setGender('')
      setHeightCm('')
      setPortfolioUrl('')
      setInstagram('')
      setCareerText('')
      setAgencyName('')
      setIsKoreanNational(true)
      setForeignCountry('')
      setHasVisa(null)
      setVisaDetails('')
      setPrivacyConsent(false)
      if (portfolioFileRef.current) portfolioFileRef.current.value = ''
      router.push('/')
    } catch (err) {
      console.error('Dancer apply submission error:', err)
      toast.error(err instanceof Error ? err.message : t('applyDancer.errorSubmit'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <Header />

      <article>
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">{t('applyDancer.heroKicker')}</p>
            <h1 className="mt-4 text-balance text-[1.65rem] font-semibold leading-[1.25] tracking-tight text-zinc-950 sm:text-3xl sm:leading-tight">
              {t('applyDancer.pageTitle')}
            </h1>
            <div className="mt-6 h-px w-11 bg-zinc-950" aria-hidden />
            <div className="mt-8 text-[15px] leading-[1.85] text-zinc-600 sm:text-base sm:leading-[1.8]">
              <p className="whitespace-pre-line">{t('applyDancer.noticeIntro')}</p>
              <p className="mt-10 whitespace-pre-line text-zinc-600">{t('applyDancer.noticeClosing')}</p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="grid gap-px bg-zinc-200 md:grid-cols-3">
            <InfoPanel title={t('applyDancer.areaTitle')}>
              <ul className="list-none space-y-3.5 text-sm leading-relaxed text-zinc-600">
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-900" aria-hidden />
                  <span>{t('applyDancer.areaAds')}</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-900" aria-hidden />
                  <span>{t('applyDancer.areaBroadcast')}</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-900" aria-hidden />
                  <span>{t('applyDancer.areaChoreo')}</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-900" aria-hidden />
                  <span>{t('applyDancer.areaLive')}</span>
                </li>
              </ul>
            </InfoPanel>
            <InfoPanel title={t('applyDancer.howTitle')}>
              <p className="text-sm leading-[1.75] text-zinc-600">{t('applyDancer.howBody')}</p>
            </InfoPanel>
            <InfoPanel title={t('applyDancer.processTitle')}>
              <ol className="list-none space-y-4 text-sm leading-relaxed text-zinc-600">
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-medium tabular-nums text-zinc-400">01</span>
                  <span>{t('applyDancer.process1')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-medium tabular-nums text-zinc-400">02</span>
                  <span>{t('applyDancer.process2')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-medium tabular-nums text-zinc-400">03</span>
                  <span>{t('applyDancer.process3')}</span>
                </li>
              </ol>
              <p className="mt-6 border-t border-zinc-100 pt-4 text-xs leading-relaxed text-zinc-500">{t('applyDancer.signoff')}</p>
            </InfoPanel>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-5 pb-20 sm:px-8">
          <div className="border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-9 sm:py-10">
            <header className="mb-10 border-b border-zinc-100 pb-8">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{t('applyDancer.title')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{t('applyDancer.subtitle')}</p>
              <p className="mt-6 border-l-2 border-zinc-950 pl-4 text-sm leading-relaxed text-zinc-600">{t('applyDancer.privacy')}</p>
              <p className="mt-3 text-xs text-zinc-400">{t('applyDancer.requiredHint')}</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-12">
          <div className="space-y-6">
            <SectionTitle>{t('applyDancer.sectionBasic')}</SectionTitle>
            <div className="mt-5 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="stage_name" className="text-xs font-medium text-zinc-700">
                  {t('applyDancer.stageName')} <Req />
                </Label>
                <Input id="stage_name" className={inputClass} value={stageName} onChange={(e) => setStageName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-medium text-zinc-700">
                  {t('applyDancer.fullName')} <Req />
                </Label>
                <Input
                  id="full_name"
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium text-zinc-700">
                  {t('applyDancer.phone')} <Req />
                </Label>
                <Input id="phone" type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="birth_date" className="text-xs font-medium text-zinc-700">
                    {t('applyDancer.birthDate')} <Req />
                  </Label>
                  <Input id="birth_date" type="date" className={inputClass} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-700">
                    {t('applyDancer.gender')} <Req />
                  </Label>
                  <Select value={gender || undefined} onValueChange={(v) => setGender(v as Gender)}>
                    <SelectTrigger className={cn(inputClass, 'h-10 w-full')}>
                      <SelectValue placeholder={t('applyDancer.genderPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('applyDancer.genderMale')}</SelectItem>
                      <SelectItem value="female">{t('applyDancer.genderFemale')}</SelectItem>
                      <SelectItem value="other">{t('applyDancer.genderOther')}</SelectItem>
                      <SelectItem value="prefer_not">{t('applyDancer.genderPreferNot')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="height" className="text-xs font-medium text-zinc-700">
                  {t('applyDancer.height')} <Req />
                </Label>
                <Input
                  id="height"
                  inputMode="numeric"
                  placeholder="170"
                  className={cn(inputClass, 'max-w-[10rem]')}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value.replace(/[^\d]/g, ''))}
                  required
                />
                <p className="text-xs text-zinc-400">{t('applyDancer.heightHint')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <SectionTitle>{t('applyDancer.sectionProfile')}</SectionTitle>
            <div className="mt-5 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="portfolio" className="text-xs font-medium text-zinc-700">
                  {t('applyDancer.portfolioUrlLabel')}
                </Label>
                <Input
                  id="portfolio"
                  type="url"
                  placeholder="https://"
                  className={inputClass}
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
                <p className="text-xs text-zinc-400">{t('applyDancer.portfolioHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portfolio_file" className="text-xs font-medium text-zinc-700">
                  {t('applyDancer.portfolioFileLabel')}
                </Label>
                <input
                  id="portfolio_file"
                  ref={portfolioFileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  className={cn(
                    inputClass,
                    'h-auto w-full cursor-pointer py-2 file:mr-4 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-800',
                  )}
                />
                <p className="text-xs text-zinc-400">{t('applyDancer.portfolioFileHint')}</p>
                <p className="text-xs font-medium text-zinc-600">{t('applyDancer.portfolioEitherHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instagram" className="text-xs font-medium text-zinc-700">
                  {t('applyDancer.instagram')} <Req />
                </Label>
                <Input id="instagram" placeholder="@username" className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} autoComplete="off" required />
                <p className="text-xs text-zinc-400">{t('applyDancer.instagramHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agency" className="text-xs font-medium text-zinc-700">
                  {t('applyDancer.agency')}
                </Label>
                <Input id="agency" className={inputClass} value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
                <p className="text-xs text-zinc-400">{t('applyDancer.agencyHint')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <SectionTitle>{t('applyDancer.sectionVisa')}</SectionTitle>
            <div className="mt-5 space-y-5 border border-zinc-200 p-4 sm:p-5">
              <p className="text-xs font-medium text-zinc-700">{t('applyDancer.nationalityLabel')}</p>
              <label className="flex cursor-pointer items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 rounded border border-zinc-400 text-zinc-900"
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
                <span className="text-sm text-zinc-700">{t('applyDancer.koreanNational')}</span>
              </label>

              {!isKoreanNational && (
                <div className="space-y-5 border-t border-zinc-100 pt-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="foreign_country" className="text-xs font-medium text-zinc-700">
                      {t('applyDancer.foreignCountry')} <Req />
                    </Label>
                    <Input id="foreign_country" className={inputClass} value={foreignCountry} onChange={(e) => setForeignCountry(e.target.value)} autoComplete="country-name" />
                    <p className="text-xs text-zinc-400">{t('applyDancer.foreignCountryHint')}</p>
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-medium text-zinc-700">
                      {t('applyDancer.visaQuestion')} <Req />
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      <label
                        className={cn(
                          'cursor-pointer border px-3 py-1.5 text-xs font-medium transition-colors',
                          hasVisa === true ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
                        )}
                      >
                        <input type="radio" name="has_visa" className="sr-only" checked={hasVisa === true} onChange={() => setHasVisa(true)} />
                        {t('applyDancer.visaYes')}
                      </label>
                      <label
                        className={cn(
                          'cursor-pointer border px-3 py-1.5 text-xs font-medium transition-colors',
                          hasVisa === false ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
                        )}
                      >
                        <input
                          type="radio"
                          name="has_visa"
                          className="sr-only"
                          checked={hasVisa === false}
                          onChange={() => {
                            setHasVisa(false)
                            setVisaDetails('')
                          }}
                        />
                        {t('applyDancer.visaNo')}
                      </label>
                    </div>
                  </fieldset>
                  {hasVisa === true && (
                    <div className="space-y-1.5">
                      <Label htmlFor="visa_details" className="text-xs font-medium text-zinc-700">
                        {t('applyDancer.visaDetails')} <Req />
                      </Label>
                      <Textarea
                        id="visa_details"
                        value={visaDetails}
                        onChange={(e) => setVisaDetails(e.target.value)}
                        rows={3}
                        className={cn(inputClass, 'min-h-[5rem] resize-y py-2')}
                      />
                      <p className="text-xs text-zinc-400">{t('applyDancer.visaDetailsHint')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <SectionTitle>{t('applyDancer.sectionCareer')}</SectionTitle>
            <div className="mt-5 space-y-1.5">
              <Label htmlFor="careers" className="text-xs font-medium text-zinc-700">
                {t('applyDancer.careers')} <Req />
              </Label>
              <Textarea id="careers" value={careerText} onChange={(e) => setCareerText(e.target.value)} rows={8} className={cn(inputClass, 'min-h-[10rem] resize-y py-2')} />
              <p className="text-xs text-zinc-400">{t('applyDancer.careersHint')}</p>
            </div>
          </div>

          <div className="border border-zinc-200 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t('applyDancer.termsTitle')}</p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-600 sm:text-sm">{t('applyDancer.termsBody')}</p>
            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-zinc-400 text-zinc-900" checked={privacyConsent} onChange={(e) => setPrivacyConsent(e.target.checked)} />
              <span className="text-sm text-zinc-700">
                {t('applyDancer.privacyConsent')} <Req />
              </span>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="outline" className="h-10 rounded-md border-zinc-200 bg-white text-sm font-medium text-zinc-900 hover:bg-zinc-50" onClick={() => router.push('/')}>
              {t('applyDancer.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="h-10 rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('applyDancer.sending')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('applyDancer.submit')}
                </>
              )}
            </Button>
          </div>
        </form>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  )
}
