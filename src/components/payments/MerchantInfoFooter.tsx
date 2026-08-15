// 결제(PG) 심사 요건에 따라 결제 상품 페이지에만 노출하는 사업자 정보.
// 이 컴포넌트는 /training 계열 페이지에서만 사용한다 (사이트 공통 푸터와 별개).

import Link from 'next/link'
import type { TrainingLang } from '@/lib/training-package'

const MERCHANT = {
  // ⚠️ 상호·주소는 사업자등록증 표기와 글자 단위로 일치해야 한다(토스 카드사 심사 요건).
  // 정본: 2025-09-17 재발급 사업자등록증 — 층수·동호수·법정동까지 그대로.
  companyName: '(주) 그리고엔터테인먼트',
  ceo: '김현준',
  businessNumber: '116-81-96848',
  address: '서울특별시 마포구 성지3길 55, 2층 202호 (합정동, 아진)',
  phone: '02-6229-9229',
  email: 'contact@grigoent.co.kr',
  bankAccount: '우리은행 1005-304-267399 (예금주: 주식회사 그리고엔터테인먼트)',
  hours: '평일 09:00 ~ 18:00 (KST)',
}

const COPY: Record<TrainingLang, {
  title: string
  companyName: string
  ceo: string
  businessNumber: string
  address: string
  phone: string
  email: string
  bankAccount: string
  hours: string
  servicePeriod: string
  servicePeriodValue: string
  methods: string
  methodsValue: string
  notice: string
  terms: string
  privacy: string
  refund: string
  orders: string
}> = {
  ko: {
    title: '판매자 정보',
    companyName: '상호명',
    ceo: '대표자',
    businessNumber: '사업자등록번호',
    address: '사업장 주소',
    phone: '고객센터',
    email: '이메일',
    bankAccount: '입금 계좌',
    hours: '상담 가능 시간',
    servicePeriod: '서비스 제공 기간',
    servicePeriodValue: '결제일로부터 최소 3개월 ~ 최대 6개월 (진행 상황에 따라 변동)',
    methods: '결제 수단',
    methodsValue: '신용·체크카드, 실시간 계좌이체, PayPal',
    notice:
      '결제 및 환불 관련 문의는 위 고객센터 또는 이메일로 연락해 주세요. 상담 가능 시간 내에 순차적으로 안내드립니다.',
    terms: '이용약관',
    privacy: '개인정보처리방침',
    refund: '취소·환불 규정',
    orders: '결제 내역 조회',
  },
  en: {
    title: 'Seller information',
    companyName: 'Company',
    ceo: 'Representative',
    businessNumber: 'Business registration no.',
    address: 'Address',
    phone: 'Customer service',
    email: 'Email',
    bankAccount: 'Bank account',
    hours: 'Support hours',
    servicePeriod: 'Service period',
    servicePeriodValue: 'From 3 months up to 6 months from the payment date',
    methods: 'Payment methods',
    methodsValue: 'Credit and debit cards, real-time bank transfer, PayPal',
    notice:
      'For payment or refund enquiries, please contact us by phone or email. We reply during the support hours above.',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    refund: 'Cancellation & Refund Policy',
    orders: 'Look up your payment',
  },
  ja: {
    title: '販売者情報',
    companyName: '商号',
    ceo: '代表者',
    businessNumber: '事業者登録番号',
    address: '所在地',
    phone: 'カスタマーセンター',
    email: 'メール',
    bankAccount: '振込口座',
    hours: '対応時間',
    servicePeriod: 'サービス提供期間',
    servicePeriodValue: 'お支払い日から最短3ヶ月〜最長6ヶ月',
    methods: 'お支払い方法',
    methodsValue: 'クレジット・デビットカード、リアルタイム口座振替、PayPal',
    notice:
      'お支払い・返金に関するお問い合わせは、上記のカスタマーセンターまたはメールへご連絡ください。対応時間内に順次ご案内いたします。',
    terms: '利用規約',
    privacy: 'プライバシーポリシー',
    refund: 'キャンセル・返金規定',
    orders: 'お支払い履歴の照会',
  },
}

export function MerchantInfoFooter({
  lang = 'ko',
  servicePeriod,
}: {
  lang?: TrainingLang
  // 상품마다 제공 기간이 다르다. 생략하면 트레이닝 패키지 기준(3~6개월).
  servicePeriod?: string
}) {
  const t = COPY[lang]
  const rows: [string, string][] = [
    [t.companyName, MERCHANT.companyName],
    [t.ceo, MERCHANT.ceo],
    [t.businessNumber, MERCHANT.businessNumber],
    [t.address, MERCHANT.address],
    [t.phone, MERCHANT.phone],
    [t.email, MERCHANT.email],
    [t.hours, MERCHANT.hours],
    [t.bankAccount, MERCHANT.bankAccount],
    [t.servicePeriod, servicePeriod || t.servicePeriodValue],
    [t.methods, t.methodsValue],
  ]

  return (
    <section className="border-t border-zinc-300 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{t.title}</h2>
        <dl className="mt-4 grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3 border-b border-zinc-200 py-2 text-[13px] leading-6">
              <dt className="w-32 shrink-0 text-zinc-500">{label}</dt>
              <dd className="min-w-0 flex-1 break-words text-zinc-900">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-medium">
          <Link href="/terms" className="text-zinc-900 underline underline-offset-4 hover:text-zinc-600">
            {t.terms}
          </Link>
          <Link href="/privacy" className="text-zinc-900 underline underline-offset-4 hover:text-zinc-600">
            {t.privacy}
          </Link>
          <Link href="/refund" className="text-zinc-900 underline underline-offset-4 hover:text-zinc-600">
            {t.refund}
          </Link>
          <Link href="/training/orders" className="text-zinc-900 underline underline-offset-4 hover:text-zinc-600">
            {t.orders}
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-6 text-zinc-500">{t.notice}</p>
      </div>
    </section>
  )
}
