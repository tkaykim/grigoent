'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Camera,
  CarFront,
  Check,
  FileText,
  Languages,
  Loader2,
  Mail,
  MonitorPlay,
  Upload,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  RECRUITING_AI_TOOL_LEVELS,
  RECRUITING_AI_TOOL_OPTIONS,
  RECRUITING_OVERVIEW,
  RECRUITING_PREFERRED,
  RECRUITING_TRACKS,
  RECRUITING_TOOL_LEVELS,
  RECRUITING_TOOL_OPTIONS,
} from '@/lib/recruiting-content'
import { cn } from '@/lib/utils'

const MAX_RESUME_BYTES = 4 * 1024 * 1024

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="mb-2 block text-sm font-semibold text-zinc-950">
      {children}
      {required ? <span className="ml-1 text-zinc-950">*</span> : null}
    </span>
  )
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="mb-8 grid gap-3 border-t border-zinc-300 pt-7 md:grid-cols-[80px_1fr]">
      <div className="font-mono text-sm font-semibold text-zinc-500">{number}</div>
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950 [word-break:keep-all]">{title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 [word-break:keep-all]">{description}</p>
      </div>
    </div>
  )
}

function CapabilityChoice({
  name,
  options,
}: {
  name: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => (
        <label key={option.value} className="relative min-w-0 cursor-pointer">
          <input className="peer sr-only" type="radio" name={name} value={option.value} required />
          <span className="flex min-h-11 items-center justify-center border border-zinc-300 bg-white px-3 text-center text-sm font-medium text-zinc-600 transition peer-checked:border-zinc-950 peer-checked:bg-zinc-950 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-950 peer-focus-visible:ring-offset-2">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  )
}

export function CareersClient() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [clientSubmissionId, setClientSubmissionId] = useState('')
  const [resumeName, setResumeName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [positionError, setPositionError] = useState('')

  useEffect(() => {
    setClientSubmissionId(crypto.randomUUID())
  }, [])

  const scrollToApplication = () => {
    document.getElementById('application')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')
    setPositionError('')

    const form = event.currentTarget
    const formData = new FormData(form)
    if (formData.getAll('position_slugs').length === 0) {
      setPositionError('지원할 직무를 하나 이상 선택해 주세요.')
      form.querySelector<HTMLInputElement>('input[name="position_slugs"]')?.focus()
      return
    }
    if (!form.reportValidity()) return

    const resume = formData.get('resume')
    if (!(resume instanceof File) || resume.size === 0) {
      setSubmitError('이력서 PDF 파일을 첨부해 주세요.')
      return
    }
    if (resume.size > MAX_RESUME_BYTES) {
      setSubmitError('이력서는 4MB 이하 PDF 파일만 첨부할 수 있습니다.')
      return
    }
    if (resume.type !== 'application/pdf' && !resume.name.toLowerCase().endsWith('.pdf')) {
      setSubmitError('이력서는 PDF 형식만 첨부할 수 있습니다.')
      return
    }

    formData.set('client_submission_id', clientSubmissionId || crypto.randomUUID())
    setSubmitting(true)

    try {
      const response = await fetch('/api/recruiting-applications', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json()) as { id?: string; emailSent?: boolean; notificationSent?: boolean; error?: string }
      if (!response.ok || !payload.id) {
        const messageByCode: Record<string, string> = {
          invalid_body: '입력한 내용을 다시 확인해 주세요.',
          resume_required: '이력서 PDF 파일을 첨부해 주세요.',
          resume_too_large: '이력서는 4MB 이하 PDF 파일만 첨부할 수 있습니다.',
          resume_type: '이력서는 PDF 형식만 첨부할 수 있습니다.',
          invalid_position: '현재 지원 가능한 포지션을 확인해 주세요.',
          submission_failed: '지원서를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        }
        throw new Error(messageByCode[payload.error || ''] || '제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      }

      const params = new URLSearchParams({
        id: payload.id,
        mail: payload.emailSent === false ? 'warning' : 'sent',
      })
      router.push(`/careers/success?${params.toString()}`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '제출 중 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header />
      <main className="bg-white pt-16">
        <section className="border-b border-zinc-800 bg-zinc-950 text-white">
          <div className="mx-auto grid min-h-[560px] max-w-7xl gap-12 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
            <div className="flex flex-col justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">GRIGO Careers</p>
              <div className="py-12 lg:py-16">
                <h1 className="max-w-4xl text-4xl font-black leading-[1.08] tracking-normal [text-wrap:balance] [word-break:keep-all] sm:text-5xl lg:text-6xl">
                  그리고와 함께 다음 프로젝트를 움직일 사람을 찾습니다.
                </h1>
                <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-300 [word-break:keep-all] sm:text-lg sm:leading-8">
                  아티스트와 현장, 클라이언트와 제작팀 사이에서 필요한 일을 발견하고 끝까지 책임지는 동료를 기다립니다.
                </p>
              </div>
              <button
                type="button"
                onClick={scrollToApplication}
                className="inline-flex w-fit items-center gap-3 text-sm font-semibold text-white transition hover:text-zinc-300"
              >
                온라인 지원서 작성
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col justify-end border-t border-white/20 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
              <div className="mb-8 flex h-12 w-12 items-center justify-center bg-white text-zinc-950">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>
              <span className="w-fit border border-white/35 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                {RECRUITING_OVERVIEW.status}
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight [word-break:keep-all]">{RECRUITING_OVERVIEW.title}</h2>
              <p className="mt-5 text-sm leading-6 text-zinc-400 [word-break:keep-all]">{RECRUITING_OVERVIEW.summary}</p>
              <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/15 pt-6 text-sm">
                <div>
                  <div className="text-zinc-500">Positions</div>
                  <div className="mt-1 font-semibold">4개 모집 직무</div>
                </div>
                <div>
                  <div className="text-zinc-500">Employment</div>
                  <div className="mt-1 font-semibold">{RECRUITING_OVERVIEW.employment}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Open Positions</p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-normal text-zinc-950 md:text-4xl">모집 부문</h2>
              <p className="mt-5 text-base leading-7 text-zinc-600 [word-break:keep-all]">
                각 직무는 독립적으로 모집합니다.
                한 사람이 아래 업무를 모두 담당하는 구조가 아니며, 경험이 겹치는 경우 여러 직무에 함께 지원할 수 있습니다.
              </p>
            </div>
            <Button onClick={scrollToApplication} className="h-11 w-fit px-5">
              지원 직무 선택
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-10 grid border-y border-zinc-300 md:grid-cols-2">
            {RECRUITING_TRACKS.map((track, index) => (
              <article
                key={track.slug}
                className={cn(
                  'border-b border-zinc-300 py-8 last:border-b-0 md:min-h-[360px] md:p-8',
                  index % 2 === 0 && 'md:border-r',
                  index >= RECRUITING_TRACKS.length - 2 && 'md:border-b-0'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Position {String(index + 1).padStart(2, '0')}
                  </p>
                  <span className="shrink-0 border border-zinc-300 bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-700">채용 중</span>
                </div>
                <h3 className="mt-5 text-2xl font-black text-zinc-950">{track.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600 [word-break:keep-all]">{track.shortDescription}</p>
                <ul className="mt-6 space-y-3 border-t border-zinc-200 pt-5">
                  {track.responsibilities.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-700 [word-break:keep-all]">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-zinc-950" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-12 grid gap-8 border-y border-zinc-300 py-8 lg:grid-cols-[240px_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Common Preference</p>
              <h3 className="mt-3 text-xl font-bold text-zinc-950">공통 우대 사항</h3>
            </div>
            <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
              {RECRUITING_PREFERRED.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-700 [word-break:keep-all]">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-zinc-950" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 border border-zinc-300 bg-zinc-50 p-6 md:p-8">
            <div className="flex gap-4">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-zinc-950" />
              <div>
                <h3 className="font-bold text-zinc-950">지원 포지션 외의 기회를 제안드릴 수 있습니다.</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 [word-break:keep-all]">
                  지원자의 경험과 강점이 다른 포지션에 더 적합하다고 판단되는 경우, 동의해 주신 분에 한해 별도의 채용 기회를 이메일 또는 전화로 제안드릴 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="application" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Application</p>
              <h2 className="mt-4 text-3xl font-black tracking-normal text-zinc-950 [word-break:keep-all] md:text-5xl">온라인 지원서</h2>
              <p className="mt-5 text-base leading-7 text-zinc-600 [word-break:keep-all]">
                회원가입이나 로그인 없이 제출할 수 있습니다.
                접수 완료 안내와 이후 채용 결과는 입력하신 이메일로 전달드립니다.
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-500">* 표시는 필수 입력 항목입니다.</p>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-14" noValidate={false}>
              <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="company_website">회사 웹사이트</label>
                <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
              </div>

              <section>
                <SectionHeading number="01" title="기본 정보" description="채용 안내와 결과를 정확히 전달하기 위한 필수 정보입니다." />
                <div className="grid gap-6 md:grid-cols-2">
                  <fieldset className="md:col-span-2">
                    <legend>
                      <FieldLabel required>지원 포지션</FieldLabel>
                    </legend>
                    <p className="mb-4 text-sm leading-6 text-zinc-500">복수 선택할 수 있습니다.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {RECRUITING_TRACKS.map((track) => (
                        <label
                          key={track.slug}
                          className="group flex min-h-[88px] min-w-0 cursor-pointer items-center gap-4 border border-zinc-300 bg-white p-4 transition has-[:checked]:border-zinc-950 has-[:checked]:bg-zinc-950 has-[:checked]:text-white"
                        >
                          <input
                            type="checkbox"
                            name="position_slugs"
                            value={track.slug}
                            className="h-5 w-5 shrink-0 accent-zinc-950 group-has-[:checked]:accent-white"
                            onChange={() => setPositionError('')}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold">{track.title}</span>
                            <span className="mt-1 block text-xs leading-5 text-zinc-500 group-has-[:checked]:text-zinc-300">{track.shortDescription}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {positionError ? <p className="mt-3 text-sm font-medium text-zinc-700" role="alert">{positionError}</p> : null}
                  </fieldset>
                  <label>
                    <FieldLabel required>이름</FieldLabel>
                    <Input name="full_name" required maxLength={100} autoComplete="name" className="h-11" placeholder="이름을 입력해 주세요" />
                  </label>
                  <label>
                    <FieldLabel required>이메일</FieldLabel>
                    <Input name="email" type="email" required maxLength={200} autoComplete="email" className="h-11" placeholder="name@example.com" />
                    <span className="mt-2 block text-xs leading-5 text-zinc-500">접수 완료와 채용 결과를 받을 이메일을 입력해 주세요.</span>
                  </label>
                  <label>
                    <FieldLabel required>전화번호</FieldLabel>
                    <Input name="phone" type="tel" required minLength={8} maxLength={30} autoComplete="tel" className="h-11" placeholder="010-0000-0000" />
                  </label>
                </div>
              </section>

              <section>
                <SectionHeading number="02" title="경험과 지원 동기" description="화려한 표현보다 실제로 맡았던 일과 해결했던 과정을 구체적으로 적어 주세요." />
                <div className="space-y-6">
                  <label className="block">
                    <FieldLabel required>주요 경력과 프로젝트 경험</FieldLabel>
                    <Textarea name="career_summary" required minLength={20} maxLength={3000} className="min-h-36 resize-y" placeholder="담당 업무, 프로젝트 규모, 본인의 역할과 결과를 중심으로 작성해 주세요." />
                  </label>
                  <label className="block">
                    <FieldLabel required>지원 동기</FieldLabel>
                    <Textarea name="motivation" required minLength={20} maxLength={2000} className="min-h-32 resize-y" placeholder="그리고 엔터테인먼트와 이 역할에 지원한 이유를 작성해 주세요." />
                  </label>
                </div>
              </section>

              <section>
                <SectionHeading number="03" title="디자인·영상 툴" description="각 도구의 현재 실무 활용 수준을 상·중·하로 표시해 주세요." />
                <div className="divide-y divide-zinc-200 border-y border-zinc-300">
                  {RECRUITING_TOOL_OPTIONS.map((tool) => (
                    <fieldset key={tool.key} className="grid gap-4 py-5 md:grid-cols-[180px_1fr] md:items-center">
                      <legend className="contents">
                        <span className="flex items-center gap-3 text-sm font-semibold text-zinc-950">
                          <MonitorPlay className="h-4 w-4 text-zinc-500" />
                          <span>{tool.label}</span>
                          <span className="text-xs font-normal text-zinc-400">{tool.category}</span>
                        </span>
                      </legend>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {RECRUITING_TOOL_LEVELS.map((level) => (
                          <label key={level.value} className="relative min-w-0 cursor-pointer">
                            <input className="peer sr-only" type="radio" name={`tool_${tool.key}`} value={level.value} required />
                            <span className="flex min-h-10 items-center justify-center border border-zinc-300 px-2 text-center text-xs font-semibold text-zinc-600 transition peer-checked:border-zinc-950 peer-checked:bg-zinc-950 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-950 peer-focus-visible:ring-offset-2 sm:text-sm">
                              {level.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <label className="mt-6 block">
                  <FieldLabel>기타 활용 도구</FieldLabel>
                  <Input name="other_tools" maxLength={500} className="h-11" placeholder="예: Final Cut Pro 중, Canva 상, Blender 하" />
                </label>
              </section>

              <section>
                <SectionHeading number="04" title="AI 툴" description="각 도구에 대한 현재 경험 수준을 선택해 주세요." />
                <div className="divide-y divide-zinc-200 border-y border-zinc-300">
                  {RECRUITING_AI_TOOL_OPTIONS.map((tool) => (
                    <fieldset key={tool.key} className="grid gap-4 py-5 md:grid-cols-[220px_1fr] md:items-center">
                      <legend className="contents">
                        <span className="flex items-center gap-3 text-sm font-semibold text-zinc-950">
                          <Bot className="h-4 w-4 shrink-0 text-zinc-500" />
                          <span>{tool.label}</span>
                        </span>
                      </legend>
                      <div className="grid grid-cols-3 gap-2">
                        {RECRUITING_AI_TOOL_LEVELS.map((level) => (
                          <label key={level.value} className="relative min-w-0 cursor-pointer">
                            <input className="peer sr-only" type="radio" name={`ai_tool_${tool.key}`} value={level.value} required />
                            <span className="flex min-h-10 items-center justify-center border border-zinc-300 px-2 text-center text-xs font-semibold text-zinc-600 transition peer-checked:border-zinc-950 peer-checked:bg-zinc-950 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-950 peer-focus-visible:ring-offset-2 sm:text-sm">
                              {level.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </section>

              <section>
                <SectionHeading number="05" title="현장 업무 역량" description="촬영·현장 운영과 커뮤니케이션에 필요한 실무 역량을 확인합니다." />
                <div className="grid gap-8 md:grid-cols-2">
                  <fieldset>
                    <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                      <Camera className="h-4 w-4" />
                      카메라 사용 가능 여부 <span className="text-zinc-950">*</span>
                    </legend>
                    <CapabilityChoice
                      name="camera_capability"
                      options={[
                        { value: 'yes', label: '실무 사용 가능' },
                        { value: 'basic', label: '기초 사용 가능' },
                        { value: 'no', label: '사용 어려움' },
                      ]}
                    />
                    <Input name="camera_details" maxLength={500} className="mt-3 h-11" placeholder="사용 가능한 카메라·장비가 있다면 입력해 주세요" />
                  </fieldset>
                  <fieldset>
                    <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                      <CarFront className="h-4 w-4" />
                      운전 가능 여부 <span className="text-zinc-950">*</span>
                    </legend>
                    <CapabilityChoice
                      name="driving_capability"
                      options={[
                        { value: 'yes', label: '실제 운전 가능' },
                        { value: 'license_only', label: '면허만 보유' },
                        { value: 'no', label: '운전 불가' },
                      ]}
                    />
                  </fieldset>
                </div>
                <label className="mt-8 block">
                  <FieldLabel required>
                    <span className="inline-flex items-center gap-2"><Languages className="h-4 w-4" />외국어 활용 수준</span>
                  </FieldLabel>
                  <Textarea name="foreign_languages" required maxLength={1000} className="min-h-24 resize-y" placeholder="예: 일본어 비즈니스 회화, 영어 일상 회화 / 해당 없음" />
                </label>
              </section>

              <section>
                <SectionHeading number="06" title="이력서와 포트폴리오" description="이력서는 PDF로 첨부하고, 작업물을 확인할 수 있는 포트폴리오 링크가 있다면 함께 입력해 주세요." />
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="block">
                    <FieldLabel required>이력서 PDF</FieldLabel>
                    <span className={cn('flex min-h-28 cursor-pointer flex-col items-center justify-center border border-dashed px-4 text-center transition', resumeName ? 'border-zinc-950 bg-zinc-50' : 'border-zinc-400 hover:border-zinc-950')}>
                      {resumeName ? <FileText className="mb-2 h-5 w-5" /> : <Upload className="mb-2 h-5 w-5" />}
                      <span className="max-w-full truncate text-sm font-semibold text-zinc-950">{resumeName || '클릭해서 이력서 선택'}</span>
                      <span className="mt-1 text-xs text-zinc-500">PDF · 4MB 이하</span>
                      <input
                        className="sr-only"
                        type="file"
                        name="resume"
                        accept="application/pdf,.pdf"
                        required
                        onChange={(event) => setResumeName(event.target.files?.[0]?.name || '')}
                      />
                    </span>
                  </label>
                  <label>
                    <FieldLabel>포트폴리오 링크</FieldLabel>
                    <Input name="portfolio_url" type="url" maxLength={2000} className="h-11" placeholder="https://" />
                    <span className="mt-2 block text-xs leading-5 text-zinc-500">Notion, Google Drive, Behance 등 외부에서 열람 가능한 링크를 입력해 주세요.</span>
                  </label>
                </div>
              </section>

              <section>
                <SectionHeading number="07" title="동의 및 제출" description="제출 전 개인정보 이용 범위와 다른 포지션 제안 여부를 확인해 주세요." />
                <div className="space-y-4 border-y border-zinc-300 py-6">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" name="privacy_consent" value="true" required className="mt-1 h-4 w-4 accent-zinc-950" />
                    <span className="text-sm leading-6 text-zinc-700 [word-break:keep-all]">
                      채용 검토와 연락을 위한 개인정보 수집·이용에 동의합니다.
                      <span className="ml-1 font-semibold text-zinc-950">필수</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" name="alternative_position_consent" value="true" className="mt-1 h-4 w-4 accent-zinc-950" />
                    <span className="text-sm leading-6 text-zinc-700 [word-break:keep-all]">
                      지원한 포지션 외에 제 경험과 강점에 적합한 다른 포지션을 이메일 또는 전화로 제안받는 것에 동의합니다.
                      <span className="ml-1 font-medium text-zinc-500">선택</span>
                    </span>
                  </label>
                </div>

                {submitError ? (
                  <div role="alert" className="mt-6 border border-zinc-400 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-800">
                    {submitError}
                  </div>
                ) : null}

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-xl text-xs leading-5 text-zinc-500 [word-break:keep-all]">
                    제출 후에는 접수 완료 안내가 이메일로 발송되며, 서류 검토와 이후 채용 결과도 같은 이메일로 안내합니다.
                  </p>
                  <Button type="submit" disabled={submitting || !clientSubmissionId} className="h-12 min-w-40 px-6 text-base">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BriefcaseBusiness className="h-4 w-4" />}
                    {submitting ? '제출 중' : '지원서 제출'}
                  </Button>
                </div>
              </section>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
