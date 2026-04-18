'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const WORK_OPTIONS = [
  { id: 'choreography' as const, label: '안무 제작' },
  { id: 'performance' as const, label: '공연' },
  { id: 'dancer_casting' as const, label: '댄서 출연·섭외' },
  { id: 'advertisement' as const, label: '광고' },
  { id: 'other' as const, label: '기타' },
]

type ClientType = 'company' | 'individual' | 'unknown'

export default function ReportPage() {
  const [workCategories, setWorkCategories] = useState<string[]>([])
  const [otherNote, setOtherNote] = useState('')
  const [clientType, setClientType] = useState<ClientType | ''>('')
  const [counterpartyNote, setCounterpartyNote] = useState('')
  const [amountNote, setAmountNote] = useState('')
  const [payTypeNote, setPayTypeNote] = useState('')
  const [facts, setFacts] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [reporterContact, setReporterContact] = useState('')
  const [reporterInstagram, setReporterInstagram] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const toggleWork = (id: string) => {
    setWorkCategories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const validateContact = (contact: string) => {
    if (!contact.trim()) return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^[0-9+\-\s()]+$/
    return emailRegex.test(contact) || phoneRegex.test(contact)
  }

  const validateInstagram = (raw: string) => {
    let s = raw.trim()
    if (s.startsWith('@')) s = s.slice(1).trim()
    if (!s) return false
    return /^[a-zA-Z0-9._]{1,100}$/.test(s)
  }

  const buildFactsPayload = () => {
    let text = facts.trim()
    if (workCategories.includes('other') && otherNote.trim()) {
      text = `[기타 유형]\n${otherNote.trim()}\n\n${text}`
    }
    return text
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (workCategories.length === 0) {
      toast.error('해당되는 업무 유형을 하나 이상 선택해 주세요.')
      return
    }
    if (workCategories.includes('other') && !otherNote.trim()) {
      toast.error('「기타」를 선택하셨다면 구체적으로 적어 주세요.')
      return
    }
    if (!clientType) {
      toast.error('의뢰인 구분을 선택해 주세요.')
      return
    }
    if (!counterpartyNote.trim() || !amountNote.trim() || !payTypeNote.trim() || !facts.trim()) {
      toast.error('필수 항목을 모두 입력해 주세요.')
      return
    }
    if (!consent) {
      toast.error('아래 안내에 동의해 주세요.')
      return
    }
    if (!reporterName.trim()) {
      toast.error('제보자 이름을 입력해 주세요.')
      return
    }
    if (!validateContact(reporterContact)) {
      toast.error('연락처는 이메일 또는 전화번호 형식으로 입력해 주세요.')
      return
    }
    if (!validateInstagram(reporterInstagram)) {
      toast.error('인스타그램 아이디를 확인해 주세요. (@ 없이 영문·숫자·밑줄·마침표만 사용)')
      return
    }

    setLoading(true)
    try {
      const payload = {
        work_categories: workCategories,
        client_type: clientType,
        counterparty_note: counterpartyNote.trim(),
        amount_note: amountNote.trim(),
        pay_type_note: payTypeNote.trim(),
        facts: buildFactsPayload(),
        reporter_name: reporterName.trim(),
        reporter_contact: reporterContact.trim(),
        reporter_instagram: reporterInstagram.trim().startsWith('@')
          ? reporterInstagram.trim().slice(1)
          : reporterInstagram.trim(),
        consent_accepted: true,
      }

      const dbRes = await fetch('/api/fee-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!dbRes.ok) {
        const errJson = await dbRes.json().catch(() => ({}))
        console.error('fee-reports API:', errJson)
        throw new Error('제보 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      }

      try {
        const mailRes = await fetch('/api/email-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'unpaid_fee_report',
            work_categories: workCategories,
            client_type: clientType,
            amount_note: amountNote.trim(),
            pay_type_note: payTypeNote.trim(),
            reporter_name: reporterName.trim(),
            reporter_contact: reporterContact.trim(),
            reporter_instagram: reporterInstagram.trim().startsWith('@')
              ? reporterInstagram.trim().slice(1)
              : reporterInstagram.trim(),
            summary: counterpartyNote.trim().slice(0, 500),
          }),
        })
        if (!mailRes.ok) {
          console.warn('email-webhook unpaid_fee_report status:', mailRes.status)
          toast.message('접수는 완료되었으나 알림 메일 전달에 문제가 있을 수 있습니다.')
        }
      } catch (mailErr) {
        console.warn('email-webhook unpaid_fee_report:', mailErr)
        toast.message('접수는 완료되었으나 알림 메일 전달에 문제가 있을 수 있습니다.')
      }

      setSubmitted(true)
      toast.success('제보가 접수되었습니다. 소중한 정보에 감사드립니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header />
      <main className="pt-16 min-h-screen bg-black text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">미수·정산 제보</h1>
          <p className="text-white/60 text-sm mb-10">
            <Link href="/" className="underline hover:text-white">
              홈
            </Link>
            {' / '}
            제보
          </p>

          <section className="space-y-4 text-white/85 text-sm leading-relaxed mb-10 border border-white/10 rounded-lg p-6 bg-white/[0.03]">
            <p>
              최근 댄서 시장에서 프로젝트를 진행한 뒤 비용 정산이 늦어지거나 받지 못하는 사례를 여럿 접해
              왔고, 그와 관련해 법적 절차를 진행 중인 상황도 있습니다. 다만 개별 사건만으로는 사실관계를
              넓게 파악하기 어려워, <strong className="text-white">비슷한 경험이 있는 분들의 제보</strong>를
              모으고자 이 페이지를 마련했습니다.
            </p>
            <p>
              <strong className="text-white">안무 제작, 공연, 댄서 출연, 광고</strong> 등으로 활동하셨으나
              약정한 대금을 받지 못하셨다면, 아래 양식에 가능한 범위에서 사실관계를 적어 주시면 큰 도움이
              됩니다. 접수된 내용은 사례 정리·내부 검토·추후 소송 등 법적 절차 준비 시{' '}
              <strong className="text-white">참고 자료</strong>로만 활용합니다.
            </p>
            <p className="text-amber-200/90 text-xs border border-amber-500/30 rounded-md p-3 bg-amber-500/5">
              본 제보는 법률 자문이나 대리를 약속하는 것이 아닙니다. 확인되지 않은 추측이나 타인의 명예를
              훼손할 수 있는 표현은 삼가 주시고, 사실에 기반하여 객관적으로 적어 주시기 바랍니다. 개인정보·
              상대방 식별 정보는 필요한 최소한만 기재해 주세요.
            </p>
            <p className="text-sky-100/95 text-xs border border-sky-500/30 rounded-md p-3 bg-sky-500/10">
              아래에 요청하는 <strong className="text-white">이름·연락처·인스타그램 아이디</strong>는{' '}
              <strong className="text-white">허위 제보를 줄이고 사실관계를 내부에서만 확인</strong>하기 위해
              받습니다. 해당 정보는 <strong className="text-white">웹사이트나 대외 자료에 공개되지 않으며</strong>,
              제보자 개인을 드러내는 형태로 사용하지 않습니다.
            </p>
          </section>

          {submitted ? (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-8 text-center space-y-4">
              <p className="text-lg text-green-100 font-medium">제보가 접수되었습니다.</p>
              <p className="text-white/70 text-sm">
                추가 자료나 정정이 필요하시면{' '}
                <a href="mailto:contact@grigoent.co.kr" className="text-white underline">
                  contact@grigoent.co.kr
                </a>
                로 메일을 보내 주세요.
              </p>
              <Button asChild variant="outline" className="border-white/30 text-white mt-4">
                <Link href="/">홈으로</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8 border border-white/10 rounded-lg p-6 bg-white/[0.02]">
              <div>
                <Label className="text-white mb-3 block">업무 유형 (복수 선택)</Label>
                <div className="flex flex-wrap gap-3">
                  {WORK_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 cursor-pointer text-sm text-white/90"
                    >
                      <input
                        type="checkbox"
                        checked={workCategories.includes(opt.id)}
                        onChange={() => toggleWork(opt.id)}
                        className="rounded border-white/30"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {workCategories.includes('other') && (
                  <Input
                    className="mt-3 bg-black/50 border-white/20 text-white"
                    placeholder="기타 유형을 구체적으로 적어 주세요"
                    value={otherNote}
                    onChange={(e) => setOtherNote(e.target.value)}
                    maxLength={500}
                  />
                )}
              </div>

              <div>
                <Label className="text-white mb-3 block">의뢰인(클라이언트) 구분</Label>
                <div className="flex flex-wrap gap-4 text-sm">
                  {(
                    [
                      ['company', '회사·사업자'],
                      ['individual', '개인'],
                      ['unknown', '잘 모르겠음'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer text-white/90">
                      <input
                        type="radio"
                        name="client_type"
                        checked={clientType === value}
                        onChange={() => setClientType(value)}
                        className="border-white/30"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="counterparty" className="text-white">
                  상대방·채권 관련 정보
                </Label>
                <p className="text-xs text-white/50 mt-1 mb-2">
                  업체명, 담당자 표시, 연락 경로 등 알고 계신 범위에서 적어 주세요. 정확히 모르시면 그렇게
                  적어 주셔도 됩니다.
                </p>
                <Textarea
                  id="counterparty"
                  required
                  className="min-h-[100px] bg-black/50 border-white/20 text-white"
                  value={counterpartyNote}
                  onChange={(e) => setCounterpartyNote(e.target.value)}
                  maxLength={4000}
                />
              </div>

              <div>
                <Label htmlFor="amount" className="text-white">
                  받지 못한 금액 (대략 가능)
                </Label>
                <Input
                  id="amount"
                  required
                  className="mt-2 bg-black/50 border-white/20 text-white"
                  placeholder="예: 약 300만 원, USD 2,000 등"
                  value={amountNote}
                  onChange={(e) => setAmountNote(e.target.value)}
                  maxLength={2000}
                />
              </div>

              <div>
                <Label htmlFor="paytype" className="text-white">
                  대금의 성격
                </Label>
                <Input
                  id="paytype"
                  required
                  className="mt-2 bg-black/50 border-white/20 text-white"
                  placeholder="예: 출연 잔금, 안무 제작 계약 잔여, 일당 등"
                  value={payTypeNote}
                  onChange={(e) => setPayTypeNote(e.target.value)}
                  maxLength={2000}
                />
              </div>

              <div>
                <Label htmlFor="facts" className="text-white">
                  구체적인 정황·사실
                </Label>
                <p className="text-xs text-white/50 mt-1 mb-2">
                  계약·일정, 이행 내용, 정산 약속, 연락 시도 등 시간 순서대로 적어 주시면 이해에 도움이
                  됩니다.
                </p>
                <Textarea
                  id="facts"
                  required
                  className="min-h-[200px] bg-black/50 border-white/20 text-white"
                  value={facts}
                  onChange={(e) => setFacts(e.target.value)}
                  maxLength={12000}
                />
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                <p className="text-sm text-white/90 font-medium">제보자 확인 (필수)</p>
                <p className="text-xs text-white/55 -mt-2">
                  허위 제보 방지를 위해 받으며, 공개되지 않습니다.
                </p>
                <div>
                  <Label htmlFor="repName" className="text-white">
                    이름
                  </Label>
                  <Input
                    id="repName"
                    required
                    className="mt-2 bg-black/50 border-white/20 text-white"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    maxLength={200}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label htmlFor="repContact" className="text-white">
                    연락처 (이메일 또는 전화)
                  </Label>
                  <Input
                    id="repContact"
                    required
                    className="mt-2 bg-black/50 border-white/20 text-white"
                    value={reporterContact}
                    onChange={(e) => setReporterContact(e.target.value)}
                    maxLength={500}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="repIg" className="text-white">
                    인스타그램 아이디
                  </Label>
                  <p className="text-xs text-white/50 mt-1 mb-2">
                    @ 없이 입력해도 됩니다. 공개·게시용이 아니라 내부 확인용입니다.
                  </p>
                  <Input
                    id="repIg"
                    required
                    className="bg-black/50 border-white/20 text-white"
                    placeholder="예: grigo_official"
                    value={reporterInstagram}
                    onChange={(e) => setReporterInstagram(e.target.value)}
                    maxLength={100}
                    autoComplete="off"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm text-white/90 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 rounded border-white/30"
                />
                <span>
                  제보 내용은 사례 수집·내부 참고 목적으로만 이용되며, 기재한 이름·연락처·인스타그램은
                  <strong className="text-white"> 외부에 공개되지 않고</strong> 허위 제보 방지·내부 확인을 위해서만
                  이용되는 것에 동의합니다. (필수)
                </span>
              </label>

              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-white text-black hover:bg-white/90"
              >
                {loading ? '접수 중…' : '제보 보내기'}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
