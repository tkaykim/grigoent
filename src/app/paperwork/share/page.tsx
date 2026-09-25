'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { CopyButton } from '@/components/paperwork/CopyButton'
import {
  BANK_ACCOUNTS,
  buildPaperworkUrl,
  type PaperworkAccount,
  type PaperworkItem,
} from '@/lib/company-paperwork'

const ITEM_LABELS: Record<PaperworkItem, string> = {
  brn: '사업자등록증',
  bank: '통장사본',
  info: '사업자 정보(복사용)',
}

// 담당자용 링크 만들기. 로그인 없이 쓰는 이유: 결과물은 공개 서류 링크일 뿐이고 서버에 아무것도 쓰지 않는다.
// 각 앱(원샷크루·deetz·grigo-artist)은 ?project=&to=&for=&from= 를 채워서 이 화면으로 보낸다.
function ShareBuilder() {
  const sp = useSearchParams()
  const [account, setAccount] = useState<PaperworkAccount>(sp.get('for') === 'react' ? 'react' : 'enter')
  const [items, setItems] = useState<PaperworkItem[]>(['brn', 'bank', 'info'])
  const [to, setTo] = useState(sp.get('to') ?? '')
  const [project, setProject] = useState(sp.get('project') ?? '')
  const [from, setFrom] = useState(sp.get('from') ?? '')
  const [origin, setOrigin] = useState('https://grigoent.co.kr')

  useEffect(() => setOrigin(window.location.origin), [])

  const url = useMemo(
    () => buildPaperworkUrl(origin, { account, items, to: to.trim(), project: project.trim(), from: from.trim() }),
    [origin, account, items, to, project, from],
  )

  const message = useMemo(() => {
    const names = items.filter((i) => i !== 'info').map((i) => ITEM_LABELS[i])
    const what = names.length ? names.join('·') : '사업자 정보'
    return [
      `${to.trim() ? `${to.trim()} 담당자님, ` : ''}안녕하세요.`,
      `${project.trim() ? `「${project.trim()}」 ` : ''}진행 관련 (주)그리고엔터테인먼트 ${what}입니다.`,
      `아래 링크에서 바로 확인·다운로드하실 수 있습니다.`,
      url,
    ].join('\n')
  }, [items, to, project, url])

  const toggle = (i: PaperworkItem) =>
    setItems((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">담당자용</p>
      <h1 className="mt-2 text-2xl font-bold">거래 서류 보내기</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">보낼 서류를 고르고, 만들어진 문구를 카톡이나 메일에 붙여 넣으세요.</p>

      <section className="mt-6 space-y-5 rounded-xl border border-zinc-200 bg-white p-4">
        <fieldset>
          <legend className="text-sm font-semibold">보낼 서류</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(ITEM_LABELS) as PaperworkItem[]).map((i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${items.includes(i) ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-700'}`}
              >
                <input type="checkbox" className="sr-only" checked={items.includes(i)} onChange={() => toggle(i)} />
                {ITEM_LABELS[i]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold">어떤 대금인가요? (통장 선택)</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(Object.keys(BANK_ACCOUNTS) as PaperworkAccount[]).map((a) => (
              <label
                key={a}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${account === a ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-300'}`}
              >
                <input type="radio" name="account" className="sr-only" checked={account === a} onChange={() => setAccount(a)} />
                <span className="font-semibold">{BANK_ACCOUNTS[a].label}</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">{BANK_ACCOUNTS[a].usage}</span>
                <span className="mt-1 block text-xs text-zinc-700">{BANK_ACCOUNTS[a].bank} {BANK_ACCOUNTS[a].number}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="받는 곳 (선택)" value={to} onChange={setTo} placeholder="예: OO기획" />
          <Field label="프로젝트명 (선택)" value={project} onChange={setProject} placeholder="예: OO 뮤직비디오" />
          <Field label="보내는 담당자 (선택)" value={from} onChange={setFrom} placeholder="예: 원샷크루 홍길동 010-0000-0000" />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold">보낼 문구</h2>
          <div className="flex gap-2">
            <CopyButton text={url} label="링크만 복사" />
            <CopyButton text={message} label="문구 복사" />
          </div>
        </div>
        <pre className="whitespace-pre-wrap break-all px-4 py-3 font-sans text-[13px] leading-6 text-zinc-800">{message}</pre>
        <div className="border-t border-zinc-200 px-4 py-3">
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 underline underline-offset-4">
            <ExternalLink className="h-4 w-4" /> 받는 사람 화면 미리보기
          </a>
        </div>
      </section>
    </main>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
      />
    </label>
  )
}

export default function PaperworkSharePage() {
  return (
    <Suspense>
      <ShareBuilder />
    </Suspense>
  )
}
