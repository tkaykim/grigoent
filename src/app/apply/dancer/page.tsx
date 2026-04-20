'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Send, Loader2, User, Calendar, Instagram, Megaphone, ClipboardList, GitBranch } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

type Gender = 'male' | 'female' | 'other' | 'prefer_not'

export default function DancerApplyPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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

    let normalizedPortfolio = portfolioUrl.trim()
    if (normalizedPortfolio && !/^https?:\/\//i.test(normalizedPortfolio)) {
      normalizedPortfolio = `https://${normalizedPortfolio}`
    }
    try {
      void new URL(normalizedPortfolio)
    } catch {
      toast.error(t('applyDancer.errorPortfolioUrl'))
      return
    }

    if (!fullName.trim() || !stageName.trim() || !birthDate || !instagram.trim()) {
      toast.error(t('applyDancer.errorRequired'))
      return
    }

    const payload = {
      full_name: fullName.trim(),
      stage_name: stageName.trim(),
      phone: phone.trim(),
      birth_date: birthDate,
      gender: gender as Gender,
      height_cm: heightNum,
      portfolio_url: portfolioUrl.trim(),
      instagram_handle: instagram.trim(),
      careers,
      agency_name: agencyName.trim() || undefined,
      is_korean_national: isKoreanNational,
      nationality,
      has_visa: isKoreanNational ? null : hasVisa,
      visa_details: isKoreanNational || !hasVisa ? null : visaDetails.trim(),
      privacy_consent: true as const,
    }

    setLoading(true)
    try {
      const [appResponse, emailResponse] = await Promise.allSettled([
        fetch('/api/dancer-applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        fetch('/api/email-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dancer_application',
            full_name: payload.full_name,
            stage_name: payload.stage_name,
            phone: payload.phone,
            birth_date: payload.birth_date,
            gender: payload.gender,
            height_cm: payload.height_cm,
            portfolio_url: normalizedPortfolio,
            instagram_handle: payload.instagram_handle.replace(/^@+/, ''),
            careers,
            agency_name: agencyName.trim() || undefined,
            is_korean_national: isKoreanNational,
            nationality,
            has_visa: isKoreanNational ? undefined : hasVisa,
            visa_details: isKoreanNational || !hasVisa ? undefined : visaDetails.trim(),
            privacy_consent: true,
          }),
        }),
      ])

      let hasError = false
      if (appResponse.status === 'rejected' || (appResponse.status === 'fulfilled' && !appResponse.value.ok)) {
        console.error('Dancer application API error:', appResponse)
        hasError = true
      }

      if (emailResponse.status === 'rejected') {
        console.error('Email webhook error:', emailResponse)
        toast.warning(t('applyDancer.emailWarn'))
      }

      if (hasError) {
        const msg =
          appResponse.status === 'fulfilled' && appResponse.value.ok === false
            ? await appResponse.value.text()
            : ''
        console.error('API body:', msg)
        throw new Error(t('applyDancer.errorSubmit'))
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
      router.push('/')
    } catch (err) {
      console.error('Dancer apply submission error:', err)
      toast.error(err instanceof Error ? err.message : t('applyDancer.errorSubmit'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-3">{t('applyDancer.pageTitle')}</h1>
            <p className="text-zinc-600 leading-relaxed whitespace-pre-line">{t('applyDancer.noticeIntro')}</p>
            <p className="text-zinc-600 leading-relaxed mt-4">{t('applyDancer.noticeClosing')}</p>
          </div>

          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="w-5 h-5 shrink-0" />
                {t('applyDancer.areaTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-700">
              <p>{t('applyDancer.areaAds')}</p>
              <p>{t('applyDancer.areaBroadcast')}</p>
              <p>{t('applyDancer.areaChoreo')}</p>
              <p>{t('applyDancer.areaLive')}</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="w-5 h-5 shrink-0" />
                {t('applyDancer.howTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-700 leading-relaxed">{t('applyDancer.howBody')}</CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch className="w-5 h-5 shrink-0" />
                {t('applyDancer.processTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-700">
              <p>{t('applyDancer.process1')}</p>
              <p>{t('applyDancer.process2')}</p>
              <p>{t('applyDancer.process3')}</p>
              <p className="pt-2 text-zinc-600">{t('applyDancer.signoff')}</p>
            </CardContent>
          </Card>

          <Card className="w-full border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="w-5 h-5" />
                <span>{t('applyDancer.title')}</span>
              </CardTitle>
              <p className="text-sm text-zinc-600 font-normal pt-1">{t('applyDancer.subtitle')}</p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <p className="text-sm text-zinc-500 leading-relaxed border-l-2 border-zinc-300 pl-3">
                  {t('applyDancer.privacy')}
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stage_name" className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{t('applyDancer.stageName')} *</span>
                    </Label>
                    <Input id="stage_name" value={stageName} onChange={(e) => setStageName(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{t('applyDancer.fullName')} *</span>
                    </Label>
                    <Input
                      id="full_name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('applyDancer.phone')} *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birth_date" className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{t('applyDancer.birthDate')} *</span>
                      </Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('applyDancer.gender')} *</Label>
                      <Select value={gender || undefined} onValueChange={(v) => setGender(v as Gender)}>
                        <SelectTrigger className="w-full">
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

                  <div className="space-y-2">
                    <Label htmlFor="height">{t('applyDancer.height')} *</Label>
                    <Input
                      id="height"
                      inputMode="numeric"
                      placeholder="170"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value.replace(/[^\d]/g, ''))}
                      required
                    />
                    <p className="text-xs text-zinc-500">{t('applyDancer.heightHint')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolio">{t('applyDancer.portfolio')} *</Label>
                    <Input
                      id="portfolio"
                      type="url"
                      placeholder="https://"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      required
                    />
                    <p className="text-xs text-zinc-500">{t('applyDancer.portfolioHint')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="flex items-center gap-1">
                      <Instagram className="w-4 h-4" />
                      <span>{t('applyDancer.instagram')} *</span>
                    </Label>
                    <Input
                      id="instagram"
                      placeholder="@username"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      autoComplete="off"
                      required
                    />
                    <p className="text-xs text-zinc-500">{t('applyDancer.instagramHint')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agency">{t('applyDancer.agency')}</Label>
                    <Input
                      id="agency"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder=""
                    />
                    <p className="text-xs text-zinc-500">{t('applyDancer.agencyHint')}</p>
                  </div>

                  <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
                    <Label className="text-base">{t('applyDancer.nationalityLabel')}</Label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300"
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
                      <span>{t('applyDancer.koreanNational')}</span>
                    </label>

                    {!isKoreanNational && (
                      <div className="space-y-4 pt-1">
                        <div className="space-y-2">
                          <Label htmlFor="foreign_country">{t('applyDancer.foreignCountry')} *</Label>
                          <Input
                            id="foreign_country"
                            value={foreignCountry}
                            onChange={(e) => setForeignCountry(e.target.value)}
                            autoComplete="country-name"
                          />
                          <p className="text-xs text-zinc-500">{t('applyDancer.foreignCountryHint')}</p>
                        </div>
                        <fieldset className="space-y-2">
                          <legend className="text-sm font-medium mb-2">{t('applyDancer.visaQuestion')} *</legend>
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name="has_visa"
                                className="h-4 w-4"
                                checked={hasVisa === true}
                                onChange={() => setHasVisa(true)}
                              />
                              {t('applyDancer.visaYes')}
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name="has_visa"
                                className="h-4 w-4"
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
                          <div className="space-y-2">
                            <Label htmlFor="visa_details">{t('applyDancer.visaDetails')} *</Label>
                            <Textarea
                              id="visa_details"
                              value={visaDetails}
                              onChange={(e) => setVisaDetails(e.target.value)}
                              rows={3}
                              className="resize-y min-h-[80px]"
                            />
                            <p className="text-xs text-zinc-500">{t('applyDancer.visaDetailsHint')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="careers">{t('applyDancer.careers')} *</Label>
                    <Textarea
                      id="careers"
                      value={careerText}
                      onChange={(e) => setCareerText(e.target.value)}
                      rows={8}
                      className="resize-y min-h-[160px] font-normal"
                      placeholder=""
                    />
                    <p className="text-xs text-zinc-500">{t('applyDancer.careersHint')}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
                  <p className="text-sm font-medium text-zinc-900">{t('applyDancer.termsTitle')}</p>
                  <p className="text-xs text-zinc-600 leading-relaxed">{t('applyDancer.termsBody')}</p>
                  <label className={cn('flex items-start gap-3 text-sm cursor-pointer pt-1')}>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-zinc-300 shrink-0"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                    />
                    <span>{t('applyDancer.privacyConsent')} *</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => router.push('/')}>
                    {t('applyDancer.cancel')}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('applyDancer.sending')}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {t('applyDancer.submit')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
