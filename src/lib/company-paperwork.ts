// 거래 서류(사업자등록증·통장사본·사업자 정보) 정본.
// 모든 사업부(GRIGO·deetz·원샷크루·REACT)는 같은 법인 (주)그리고엔터테인먼트로 청구한다.
// 통장만 두 개다: REACT(영상 제작) 전용 계좌와 그 외 전부(엔터)의 계좌.
// 파일은 Supabase public 버킷 `company-paperwork`에 고정 경로로 두고, 교체는 같은 경로 덮어쓰기로 한다(재배포 불필요).

export type PaperworkAccount = 'enter' | 'react'
export type PaperworkShareItem = 'brn' | 'bank' | 'info'

export const PAPERWORK_ITEMS: PaperworkShareItem[] = ['brn', 'bank', 'info']

// ⚠️ 상호·주소는 사업자등록증 표기와 글자 단위로 일치해야 한다(2026-04-13 재발급본 기준).
export const COMPANY = {
  name: '(주) 그리고엔터테인먼트',
  ceo: '김현준',
  businessNumber: '116-81-96848',
  corporateNumber: '110111-8072003',
  address: '서울특별시 마포구 성지3길 55, 2층 202호 (합정동, 아진)',
  businessType: '정보통신업, 서비스업 외',
  businessItem: '미디어콘텐츠창작업, 공연 기획업, 광고 대행업 외',
  phone: '02-6229-9229',
  taxInvoiceEmail: 'finance@grigoent.co.kr',
} as const

export const BANK_ACCOUNTS: Record<PaperworkAccount, {
  label: string
  usage: string
  bank: string
  number: string
  holder: string
  file: string
  downloadName: string
}> = {
  enter: {
    label: '엔터·캐스팅 대금',
    usage: '출연료·섭외료·공연료, deetz 캐스팅, 원샷크루 출연',
    bank: '우리은행',
    number: '1005-304-267399',
    holder: '(주)그리고 엔터테인먼트',
    file: 'bank-account-enter.pdf',
    downloadName: '그리고엔터테인먼트_통장사본.pdf',
  },
  react: {
    label: '영상 제작 대금',
    usage: 'REACT Studio 촬영·편집·후반작업 등 영상 제작비',
    bank: '우리은행',
    number: '1005-404-833438',
    holder: '(주)그리고 엔터테인먼트',
    file: 'bank-account-react.pdf',
    downloadName: '그리고엔터테인먼트_통장사본_영상제작.pdf',
  },
}

export const BUSINESS_REGISTRATION = {
  file: 'business-registration.pdf',
  downloadName: '그리고엔터테인먼트_사업자등록증.pdf',
}

const BUCKET = 'company-paperwork'

export function paperworkFileUrl(file: string, downloadName?: string): string {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${file}`
  return downloadName ? `${base}?download=${encodeURIComponent(downloadName)}` : base
}

export function parsePaperworkParams(sp: Record<string, string | string[] | undefined>) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
  const account: PaperworkAccount = one(sp.for) === 'react' ? 'react' : 'enter'
  const requested = one(sp.items).split(',').filter((i): i is PaperworkShareItem => PAPERWORK_ITEMS.includes(i as PaperworkShareItem))
  const items = requested.length ? requested : PAPERWORK_ITEMS
  return {
    account,
    items,
    to: one(sp.to).slice(0, 60),
    project: one(sp.project).slice(0, 80),
    from: one(sp.from).slice(0, 40),
  }
}

export function buildPaperworkUrl(origin: string, opts: {
  account: PaperworkAccount
  items: PaperworkShareItem[]
  to?: string
  project?: string
  from?: string
}): string {
  const p = new URLSearchParams()
  if (opts.account === 'react') p.set('for', 'react')
  if (opts.items.length && opts.items.length < PAPERWORK_ITEMS.length) p.set('items', opts.items.join(','))
  if (opts.to) p.set('to', opts.to)
  if (opts.project) p.set('project', opts.project)
  if (opts.from) p.set('from', opts.from)
  const qs = p.toString().replace(/%2C/g, ',')
  return `${origin}/paperwork${qs ? `?${qs}` : ''}`
}

// 카톡·메일 본문에 그대로 붙여 넣는 사업자 정보 텍스트. 한 항목 = 한 줄.
export function companyInfoText(account: PaperworkAccount): string {
  const bank = BANK_ACCOUNTS[account]
  return [
    `상호: ${COMPANY.name}`,
    `대표자: ${COMPANY.ceo}`,
    `사업자등록번호: ${COMPANY.businessNumber}`,
    `주소: ${COMPANY.address}`,
    `업태/종목: ${COMPANY.businessType} / ${COMPANY.businessItem}`,
    `입금 계좌: ${bank.bank} ${bank.number} (예금주 ${bank.holder})`,
    `세금계산서 담당 이메일: ${COMPANY.taxInvoiceEmail}`,
  ].join('\n')
}
