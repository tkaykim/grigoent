// 한국 활동 준비 트레이닝 패키지 판매 공용 타입/헬퍼.
// slug 은 training-and-placement 로 유지한다(주문·정산 식별자라 변경 시 기존 주문이 끊긴다).
// 상품·요금제 정본은 grigoent Supabase `training_products` / `training_price_plans` 이며,
// 금액은 서버가 항상 DB 값으로 재계산한다 (클라이언트 값 신뢰 금지).
// 결제 통화는 언어와 무관하게 항상 원화(KRW)다.

export const TRAINING_PRODUCT_SLUG = 'training-and-placement'

export type TrainingLang = 'ko' | 'en' | 'ja'

type PlanI18n = { label?: string; note?: string }
type ProductI18n = {
  title?: string
  subtitle?: string
  description?: string
  highlights?: string[]
}

export type TrainingPlan = {
  id: string
  code: string
  label: string
  plan_type: 'onetime' | 'installment'
  installment_months: number
  amount_per_charge: number
  total_amount: number
  currency: string
  note: string | null
  sort_order: number
  i18n?: Record<string, PlanI18n> | null
}

export type TrainingProduct = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  highlights: string[]
  currency: string
  i18n?: Record<string, ProductI18n> | null
}

// 금액 표기는 언어별 표기만 다르고 통화는 항상 원화다.
export function formatKrw(value: number, lang: TrainingLang = 'ko'): string {
  const number = value.toLocaleString('ko-KR')
  if (lang === 'en') return `KRW ${number}`
  if (lang === 'ja') return `${number}ウォン`
  return `${number}원`
}

export function planLabel(plan: TrainingPlan, lang: TrainingLang): string {
  if (lang === 'ko') return plan.label
  return plan.i18n?.[lang]?.label || plan.label
}

export function planNote(plan: TrainingPlan, lang: TrainingLang): string | null {
  if (lang === 'ko') return plan.note
  return plan.i18n?.[lang]?.note ?? plan.note
}

export function productTitle(product: TrainingProduct, lang: TrainingLang): string {
  if (lang === 'ko') return product.title
  return product.i18n?.[lang]?.title || product.title
}

export function productSubtitle(product: TrainingProduct, lang: TrainingLang): string | null {
  if (lang === 'ko') return product.subtitle
  return product.i18n?.[lang]?.subtitle ?? product.subtitle
}

export function productDescription(product: TrainingProduct, lang: TrainingLang): string | null {
  if (lang === 'ko') return product.description
  return product.i18n?.[lang]?.description ?? product.description
}

export function productHighlights(product: TrainingProduct, lang: TrainingLang): string[] {
  if (lang === 'ko') return product.highlights
  const translated = product.i18n?.[lang]?.highlights
  return Array.isArray(translated) && translated.length > 0 ? translated : product.highlights
}

export function describePlan(plan: TrainingPlan, lang: TrainingLang): string {
  const amount = formatKrw(plan.amount_per_charge, lang)
  if (plan.plan_type === 'onetime') {
    if (lang === 'en') return `${amount} paid at once`
    if (lang === 'ja') return `${amount}を一括でお支払い`
    return `${amount} 일시 결제`
  }
  if (lang === 'en') return `${amount} per month x ${plan.installment_months}`
  if (lang === 'ja') return `毎月${amount} × ${plan.installment_months}回`
  return `매월 ${amount} × ${plan.installment_months}회`
}

// 결제번호: GRT-YYMMDD-XXXXXX (사람이 읽기 쉬운 형태)
export function buildOrderNo(now: Date, random: string): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const yy = String(kst.getUTCFullYear()).slice(2)
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(kst.getUTCDate()).padStart(2, '0')
  return `GRT-${yy}${mm}${dd}-${random.toUpperCase()}`
}

// 회차별 청구 예정일: 1회차는 결제일, 이후 매월 같은 날.
export function buildDueDates(start: Date, months: number): string[] {
  const dates: string[] = []
  for (let i = 0; i < months; i += 1) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, start.getUTCDate()))
    // 말일 보정 (예: 1/31 + 1개월 → 2/28)
    if (d.getUTCDate() !== start.getUTCDate()) d.setUTCDate(0)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// 판매 페이지 정적 카피 (한국어 정본 + 영어/일본어).
export const TRAINING_COPY: Record<TrainingLang, {
  eyebrow: string
  heroCta: string
  processTitle: string
  process: { title: string; body: string }[]
  planTitle: string
  planIntro: string
  planOnce: string
  planTimes: (n: number) => string
  planTotal: string
  planPayNow: string
  infoTitle: string
  infoIntro: string
  fieldName: string
  fieldEmail: string
  fieldPhone: string
  fieldNationality: string
  fieldMemo: string
  fieldMemoHelp: string
  agree: string
  startCheckout: string
  preparing: string
  paymentNo: string
  payOnce: (amount: string) => string
  payInstallment: (amount: string, months: number) => string
  methodCard: string
  methodCardDesc: string
  methodTransfer: string
  methodTransferDesc: string
  methodOverseas: string
  methodOverseasDesc: string
  paypalCurrencyNotice: (foreign: string, krw: string) => string
  paySubmit: (amount: string) => string
  editInfo: string
  notice: string
  emptyTitle: string
  emptyBody: string
  successTitle: string
  successBody: string
  successChecking: string
  labelSequence: string
  labelPaidTotal: string
  receipt: string
  home: string
  failTitle: string
  failBody: string
  failContact: string
  retry: string
  confirmFailTitle: string
  currencyNotice: string
}> = {
  ko: {
    eyebrow: 'GRIGO PROGRAM',
    heroCta: '결제하고 시작하기',
    processTitle: '진행 방식',
    process: [
      { title: '상담', body: '현재 상황과 목표를 확인하고 필요한 과정을 함께 정리합니다.' },
      { title: '댄스 트레이닝', body: '전문 트레이닝 과정을 통해 실무에 필요한 기준까지 끌어올립니다.' },
      { title: '한국어·업계 교육', body: '한국어와 한국 댄스 업계의 실무 지식을 함께 익힙니다.' },
      { title: '플랫폼 등록', body: '댄서 활동 플랫폼에 등록해 한국에서의 활동 기반을 마련합니다.' },
    ],
    planTitle: '결제 방식 선택',
    planIntro:
      '결제 금액과 결제 수단을 확인한 뒤 결제를 진행합니다.',
    planOnce: '한 번에 결제',
    planTimes: (n) => `${n}회 결제`,
    planTotal: '총',
    planPayNow: '지금 결제할 금액',
    infoTitle: '신청자 정보',
    infoIntro: '결제 확인과 이후 안내에 사용됩니다.',
    fieldName: '이름',
    fieldEmail: '이메일',
    fieldPhone: '연락처',
    fieldNationality: '국적',
    fieldMemo: '남기실 말씀',
    fieldMemoHelp: '상담에서 미리 확인이 필요한 내용이 있으면 적어주세요.',
    agree: '결제 금액과 진행 방식을 확인했으며, 이에 동의합니다.',
    startCheckout: '결제 진행하기',
    preparing: '준비 중…',
    paymentNo: '결제번호',
    payOnce: (amount) => `${amount}을 결제합니다.`,
    payInstallment: (amount, months) => `${months}회 중 1회차 ${amount}을 결제합니다.`,
    methodCard: '카드결제',
    methodCardDesc: '국내외 신용·체크카드 (원화 결제)',
    methodTransfer: '계좌이체',
    methodTransferDesc: '국내 은행 실시간 계좌이체 (원화 결제)',
    methodOverseas: 'PayPal',
    methodOverseasDesc: '해외 카드 · PayPal 잔액',
    paypalCurrencyNotice: (foreign, krw) =>
      `PayPal은 원화 결제를 지원하지 않아 ${foreign}로 청구됩니다. 기준 금액은 ${krw}이며, 환율 변동에 대비한 여유분이 포함되어 있습니다.`,
    paySubmit: (amount) => `${amount} 결제하기`,
    editInfo: '정보 수정하기',
    notice:
      '카드결제와 계좌이체는 토스페이먼츠, PayPal은 PayPal에서 처리됩니다. 진행 경로와 필요한 범위는 상담 후 확정되며, 확정 전 변경이 필요한 경우 안내드립니다.',
    emptyTitle: '현재 판매 중인 과정이 없습니다.',
    emptyBody: '잠시 후 다시 확인해 주세요.',
    successTitle: '결제가 완료되었습니다.',
    successBody: '담당자가 확인 후 진행 일정을 안내드립니다.',
    successChecking: '결제를 확인하고 있습니다.',
    labelSequence: '결제 회차',
    labelPaidTotal: '결제 누계',
    receipt: '영수증 보기',
    home: '홈으로',
    failTitle: '결제가 취소되었습니다.',
    failBody: '결제가 완료되지 않았습니다. 다시 시도해 주세요.',
    failContact: '결제가 이루어졌는데 이 화면이 보이면 결제번호와 함께 문의해 주세요.',
    retry: '다시 시도하기',
    confirmFailTitle: '결제를 확인하지 못했습니다.',
    currencyNotice: '기본 결제 통화는 원화(KRW)입니다. PayPal만 원화를 지원하지 않아 외화로 청구됩니다.',
  },
  en: {
    eyebrow: 'GRIGO PROGRAM',
    heroCta: 'Pay and get started',
    processTitle: 'How it works',
    process: [
      { title: 'Consultation', body: 'We review your situation and goals, then map out what you actually need.' },
      { title: 'Dance training', body: 'Professional training brings you up to the standard the field requires.' },
      { title: 'Korean and industry', body: 'You learn Korean along with how the Korean dance industry actually works.' },
      { title: 'Platform registration', body: 'You are registered on a dancer activity platform to build your base in Korea.' },
    ],
    planTitle: 'Choose how you pay',
    planIntro:
      'Review the amount and choose how you want to pay.',
    planOnce: 'Paid at once',
    planTimes: (n) => `${n} payments`,
    planTotal: 'Total',
    planPayNow: 'Due now',
    infoTitle: 'Your details',
    infoIntro: 'Used to confirm your payment and to contact you afterwards.',
    fieldName: 'Name',
    fieldEmail: 'Email',
    fieldPhone: 'Phone',
    fieldNationality: 'Nationality',
    fieldMemo: 'Anything you want to tell us',
    fieldMemoHelp: 'Write anything you would like us to check before the consultation.',
    agree:
      'I have reviewed the amount and how the programme runs, and I agree to proceed.',
    startCheckout: 'Continue to payment',
    preparing: 'Preparing…',
    paymentNo: 'Payment number',
    payOnce: (amount) => `You are paying ${amount}.`,
    payInstallment: (amount, months) => `You are paying ${amount}, the 1st of ${months} charges.`,
    methodCard: 'Card',
    methodCardDesc: 'Korean and international cards, charged in KRW',
    methodTransfer: 'Bank transfer',
    methodTransferDesc: 'Real-time transfer from a Korean bank, charged in KRW',
    methodOverseas: 'PayPal',
    methodOverseasDesc: 'International cards · PayPal balance',
    paypalCurrencyNotice: (foreign, krw) =>
      `PayPal cannot charge Korean won, so you will be billed ${foreign}. The base price is ${krw}, and the amount includes a buffer for exchange rate movement.`,
    paySubmit: (amount) => `Pay ${amount}`,
    editInfo: 'Edit my details',
    notice:
      'Card and bank transfer are processed by Toss Payments, and PayPal is processed by PayPal. The route and scope are confirmed after your consultation, and we will let you know if anything needs to change.',
    emptyTitle: 'No programme is on sale right now.',
    emptyBody: 'Please check again shortly.',
    successTitle: 'Your payment is complete.',
    successBody: 'Our team will confirm it and share the schedule with you.',
    successChecking: 'Confirming your payment.',
    labelSequence: 'Charge',
    labelPaidTotal: 'Paid so far',
    receipt: 'View receipt',
    home: 'Go to home',
    failTitle: 'The payment was cancelled.',
    failBody: 'The payment did not go through. Please try again.',
    failContact: 'If you were charged but still see this screen, contact us with your payment number.',
    retry: 'Try again',
    confirmFailTitle: 'We could not confirm your payment.',
    currencyNotice: 'The base currency is Korean won (KRW). Only PayPal is billed in a foreign currency, since PayPal does not support KRW.',
  },
  ja: {
    eyebrow: 'GRIGO PROGRAM',
    heroCta: '決済して始める',
    processTitle: '進行の流れ',
    process: [
      { title: '相談', body: '現在の状況と目標を確認し、必要な過程を一緒に整理します。' },
      { title: 'ダンストレーニング', body: '専門トレーニングで実務に必要な水準まで引き上げます。' },
      { title: '韓国語・業界教育', body: '韓国語と韓国ダンス業界の実務知識を一緒に学びます。' },
      { title: 'プラットフォーム登録', body: 'ダンサー活動プラットフォームに登録し、韓国での活動基盤を整えます。' },
    ],
    planTitle: 'お支払い方法の選択',
    planIntro:
      'お支払い金額とお支払い方法をご確認のうえ、決済へお進みください。',
    planOnce: '一括でお支払い',
    planTimes: (n) => `${n}回払い`,
    planTotal: '合計',
    planPayNow: '今回のお支払い金額',
    infoTitle: 'お申し込み情報',
    infoIntro: '決済確認とその後のご案内に使用します。',
    fieldName: 'お名前',
    fieldEmail: 'メールアドレス',
    fieldPhone: '連絡先',
    fieldNationality: '国籍',
    fieldMemo: 'ご要望・ご質問',
    fieldMemoHelp: '相談前に確認しておきたい内容があればご記入ください。',
    agree:
      '金額と進行方法を確認しました。内容に同意します。',
    startCheckout: '決済に進む',
    preparing: '準備中…',
    paymentNo: '決済番号',
    payOnce: (amount) => `${amount}をお支払いいただきます。`,
    payInstallment: (amount, months) => `${months}回のうち1回目の${amount}をお支払いいただきます。`,
    methodCard: 'カード決済',
    methodCardDesc: '国内外のクレジット・デビットカード（ウォン建て）',
    methodTransfer: '口座振替',
    methodTransferDesc: '韓国の銀行からのリアルタイム振替（ウォン建て）',
    methodOverseas: 'PayPal',
    methodOverseasDesc: '海外カード · PayPal残高',
    paypalCurrencyNotice: (foreign, krw) =>
      `PayPalはウォン建て決済に対応していないため${foreign}で請求されます。基準金額は${krw}で、為替変動に備えた余裕分が含まれています。`,
    paySubmit: (amount) => `${amount}を決済する`,
    editInfo: '情報を修正する',
    notice:
      'カード決済と口座振替はトスペイメンツ、PayPalはPayPalで処理されます。進行経路と必要な範囲は相談後に確定し、変更が必要な場合はご案内します。',
    emptyTitle: '現在販売中の課程はありません。',
    emptyBody: 'しばらくしてから再度ご確認ください。',
    successTitle: '決済が完了しました。',
    successBody: '担当者が確認のうえ、進行スケジュールをご案内します。',
    successChecking: '決済を確認しています。',
    labelSequence: '決済回次',
    labelPaidTotal: '決済累計',
    receipt: '領収書を見る',
    home: 'ホームへ',
    failTitle: '決済がキャンセルされました。',
    failBody: '決済が完了しませんでした。もう一度お試しください。',
    failContact: '決済されたのにこの画面が表示される場合は、決済番号を添えてお問い合わせください。',
    retry: 'もう一度試す',
    confirmFailTitle: '決済を確認できませんでした。',
    currencyNotice: '基本の決済通貨は韓国ウォン(KRW)です。PayPalのみウォンに対応していないため外貨で請求されます。',
  },
}
