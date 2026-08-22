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
  discountTitle: string
  discountToggle: string
  discountPlaceholder: string
  discountApply: string
  discountRemove: string
  discountChecking: string
  discountApplied: (label: string, amount: string) => string
  discountFinal: string
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
      `PayPal은 원화 결제를 지원하지 않습니다. 결제 금액 ${krw}은 ${foreign}로 청구됩니다.`,
    discountTitle: '할인코드',
    discountToggle: '할인코드가 있으신가요?',
    discountPlaceholder: '할인코드를 입력하세요',
    discountApply: '적용',
    discountRemove: '해제',
    discountChecking: '확인 중…',
    discountApplied: (label, amount) => `${label} 적용 — ${amount} 할인`,
    discountFinal: '할인 적용 후 결제 금액',
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
      `PayPal cannot charge Korean won. Your payment of ${krw} will be billed as ${foreign}.`,
    discountTitle: 'Discount code',
    discountToggle: 'Have a discount code?',
    discountPlaceholder: 'Enter your discount code',
    discountApply: 'Apply',
    discountRemove: 'Remove',
    discountChecking: 'Checking…',
    discountApplied: (label, amount) => `${label} applied — ${amount} off`,
    discountFinal: 'Amount after discount',
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
      `PayPalはウォン建て決済に対応していません。お支払い金額${krw}は${foreign}で請求されます。`,
    discountTitle: '割引コード',
    discountToggle: '割引コードをお持ちですか？',
    discountPlaceholder: '割引コードを入力してください',
    discountApply: '適用',
    discountRemove: '解除',
    discountChecking: '確認中…',
    discountApplied: (label, amount) => `${label} 適用 — ${amount} 割引`,
    discountFinal: '割引適用後のお支払い金額',
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

// 오디션 참석 확정비(/audition-fee) 전용 카피.
// TRAINING_COPY 의 "진행 방식"은 트레이닝 패키지 4단계라 참가비 상품에는 맞지 않는다.
// 서비스 제공 기간도 상품별로 다르므로 같이 둔다.
export const AUDITION_FEE_COPY: Record<
  TrainingLang,
  {
    process: { title: string; body: string }[]
    servicePeriod: string
    // 결제 전에 반드시 보여야 하는 조건. 규정 전문은 /refund 제4조.
    terms: { title: string; items: string[] }
  }
> = {
  ko: {
    process: [
      { title: '참가비 결제', body: '오디션 참석을 확정하기 위한 참가비를 결제합니다.' },
      { title: '일정·장소 안내', body: '결제 확인 후 오디션 일시와 장소를 개별 안내드립니다.' },
      { title: '오디션 참석', body: '안내받은 일정에 맞춰 오디션에 참석합니다.' },
      { title: '결과 안내', body: '오디션 결과와 이후 진행 방식을 안내드립니다.' },
    ],
    servicePeriod: '결제일로부터 오디션 종료 시점까지 (일정은 개별 안내)',
    terms: {
      title: '결제 전 확인해 주세요',
      items: [
        '이 참가비는 이후 트레이닝 패키지를 결제하실 때 패키지 금액에서 전액 공제됩니다. 별도로 다시 내지 않으셔도 됩니다.',
        '오디션 일정이 확정되어 안내되기 전까지는 사유를 불문하고 전액 환불해 드립니다.',
        '회사 사정으로 오디션이 취소되거나 일정이 바뀌어 참석하지 못하시는 경우에도 전액 환불해 드립니다.',
        '다만 본인 사유로 확정된 오디션에 불참하시거나 사전 연락 없이 오지 않으시는 경우에는 환불되지 않습니다.',
        '일정 변경이 필요하시면 오디션 전에 미리 연락 주세요. 잔여 일정 범위에서 1회 변경을 도와드립니다.',
      ],
    },
  },
  en: {
    process: [
      { title: 'Pay the fee', body: 'Pay the fee that confirms your audition slot.' },
      { title: 'Schedule sent', body: 'Once payment is confirmed we send you the date and venue.' },
      { title: 'Attend', body: 'Attend the audition at the scheduled time.' },
      { title: 'Result', body: 'We share the result and what happens next.' },
    ],
    servicePeriod: 'From the payment date until the audition is completed (schedule sent individually)',
    terms: {
      title: 'Before you pay',
      items: [
        'This fee is fully credited toward the training package if you enroll later. You will not be charged for it twice.',
        'You get a full refund for any reason until the audition date is confirmed and sent to you.',
        'You also get a full refund if we cancel or move the audition and you can no longer attend.',
        'However, the fee is not refunded if you miss a confirmed audition or do not show up without telling us in advance.',
        'If you need a different date, contact us before the audition. We can reschedule you once, subject to remaining slots.',
      ],
    },
  },
  ja: {
    process: [
      { title: '参加費のお支払い', body: 'オーディション参加を確定するための参加費をお支払いいただきます。' },
      { title: '日程・会場のご案内', body: '入金確認後、オーディションの日時と会場を個別にご案内します。' },
      { title: 'オーディション参加', body: 'ご案内した日程に合わせてオーディションにご参加ください。' },
      { title: '結果のご案内', body: 'オーディション結果と今後の進め方をご案内します。' },
    ],
    servicePeriod: 'お支払い日からオーディション終了まで（日程は個別にご案内）',
    terms: {
      title: 'お支払い前にご確認ください',
      items: [
        'この参加費は、後日トレーニングパッケージをお申し込みの際に全額差し引かれます。二重にお支払いいただくことはありません。',
        'オーディションの日程が確定してご案内する前であれば、理由を問わず全額返金いたします。',
        '当社の都合でオーディションが中止・変更となりご参加いただけない場合も、全額返金いたします。',
        'ただし、ご本人の都合で確定したオーディションに参加されない場合や、事前のご連絡なく来られない場合は返金いたしかねます。',
        '日程の変更が必要な場合はオーディション前にご連絡ください。残りの日程の範囲で1回まで変更を承ります。',
      ],
    },
  },
}

// deetz Village 사전예약금(/village-deposit) 전용 카피.
// Village 는 아직 오픈 전이라 "크라우드펀딩형 사전예약"이다 —
// 정원이 차지 않거나 오픈이 무산되면 전액 환불하고, 입주가 시작되면 첫 결제에서 차감한다.
// 이 조건은 결제 전에 반드시 보여야 하므로 terms 로 고정한다.
export const VILLAGE_DEPOSIT_COPY: Record<
  TrainingLang,
  {
    process: { title: string; body: string }[]
    servicePeriod: string
    terms: { title: string; items: string[] }
  }
> = {
  ko: {
    process: [
      { title: '사전예약금 결제', body: '입주 자리를 먼저 확보하기 위한 사전예약금을 결제합니다.' },
      { title: '준비 진행', body: '건물과 방 구성을 확정하고 진행 상황을 개별 안내드립니다.' },
      { title: '오픈·입주 안내', body: '오픈이 확정되면 정확한 주소와 입주 가능일을 가장 먼저 안내드립니다.' },
      { title: '첫 결제에서 차감', body: '입주하시면 사전예약금이 첫 결제 금액에서 전액 차감됩니다.' },
    ],
    servicePeriod: '결제일로부터 입주 시작 시점까지 (오픈 일정은 개별 안내)',
    terms: {
      title: '결제 전 확인해 주세요',
      items: [
        'deetz Village 는 아직 오픈 전이며, 이 결제는 입주 자리를 먼저 확보하는 사전예약금입니다.',
        '입주하시면 이 금액은 첫 결제 금액에서 전액 차감됩니다. 별도로 다시 내지 않으셔도 됩니다.',
        '정원이 차지 않거나 오픈이 무산되는 경우 전액 환불해 드립니다.',
        '입주가 시작되기 전까지는 사유를 불문하고 요청하시면 전액 환불해 드립니다.',
        '비자 발급이 되지 않아 입주하실 수 없게 된 경우에도 전액 환불해 드립니다.',
        '건물·방 구성·요금·오픈 시기는 준비 과정에서 변경될 수 있으며, 변경 시 개별 안내드립니다.',
      ],
    },
  },
  en: {
    process: [
      { title: 'Pay the deposit', body: 'Pay the pre-registration deposit to reserve your place.' },
      { title: 'We prepare', body: 'We confirm the building and room mix, and keep you updated.' },
      { title: 'Opening & move-in', body: 'Once opening is confirmed, you get the exact address and move-in dates first.' },
      { title: 'Credited to your first payment', body: 'When you move in, the deposit is fully deducted from your first payment.' },
    ],
    servicePeriod: 'From the payment date until move-in begins (opening schedule sent individually)',
    terms: {
      title: 'Before you pay',
      items: [
        'deetz Village has not opened yet. This payment is a pre-registration deposit that reserves your place.',
        'When you move in, this amount is fully deducted from your first payment. You will not be charged for it twice.',
        'If we do not reach enough residents, or the opening does not happen, you get a full refund.',
        'You can request a full refund for any reason at any time before move-in begins.',
        'You also get a full refund if your visa is not granted and you cannot move in.',
        'The building, room mix, prices, and opening date may change while we prepare. We will tell you if they do.',
      ],
    },
  },
  ja: {
    process: [
      { title: '事前予約金のお支払い', body: '入居枠を先に確保するための事前予約金をお支払いいただきます。' },
      { title: '準備の進行', body: '物件と部屋構成を確定し、進捗を個別にご案内します。' },
      { title: 'オープン・入居のご案内', body: 'オープンが確定次第、正確な住所と入居可能日を最初にご案内します。' },
      { title: '初回お支払いから差引', body: 'ご入居いただくと、事前予約金は初回のお支払い金額から全額差し引かれます。' },
    ],
    servicePeriod: 'お支払い日から入居開始まで（オープン日程は個別にご案内）',
    terms: {
      title: 'お支払い前にご確認ください',
      items: [
        'deetz Village はまだオープン前で、この決済は入居枠を確保するための事前予約金です。',
        'ご入居いただくと、この金額は初回のお支払い金額から全額差し引かれます。二重にお支払いいただくことはありません。',
        '入居者が定員に満たない場合、またはオープンが実現しない場合は全額返金いたします。',
        '入居開始前であれば、理由を問わずご請求により全額返金いたします。',
        'ビザが発給されず入居できなくなった場合も全額返金いたします。',
        '物件・部屋構成・料金・オープン時期は準備の過程で変更される場合があり、その際は個別にご案内します。',
      ],
    },
  },
}

export const VILLAGE_DEPOSIT_PRODUCT_SLUG = 'village-deposit'

// 1개월 트레이닝 비용(/monthly-training) 전용 카피.
// ⚠ 이 상품은 "400만원 패키지를 나눠 내는 것"이 아니라 월 단위로 판매하는 별개 상품이다.
// 비자 행정 대행이 포함되지 않으며, 매달 그 달의 이용료만 받고 다음 달 계속 여부는 매달 정한다.
// 따라서 총액 합산·회차·분납·할부 표현을 절대 쓰지 않는다 (토스페이먼츠 심사 조건).
export const MONTHLY_TRAINING_COPY: Record<
  TrainingLang,
  {
    process: { title: string; body: string }[]
    servicePeriod: string
    terms: { title: string; items: string[] }
  }
> = {
  ko: {
    process: [
      { title: '1개월권 결제', body: '이용하실 한 달의 이용료를 결제합니다.' },
      { title: '수업 배정', body: '결제 확인 후 수업 일정과 시작일을 개별 안내드립니다.' },
      { title: '한 달 이용', body: '트레이닝 수강, 실무 한국어 교육, 실무 투입 업무교육을 이용하십니다.' },
      { title: '다음 달 선택', body: '다음 달 계속하실지는 매달 다시 정하시면 됩니다.' },
    ],
    servicePeriod: '이용 시작일로부터 1개월',
    terms: {
      title: '결제 전 확인해 주세요',
      items: [
        '이 상품은 한 달 단위 이용권입니다. 결제하신 금액은 이용하실 한 달분이며, 다음 달 이용료가 자동으로 청구되지 않습니다.',
        '다음 달에도 계속 이용하실지는 매달 다시 선택하시면 됩니다. 중단하시면 이후 달은 청구되지 않습니다.',
        '트레이닝 수강권, 실무 한국어 교육, 실무 투입 업무교육이 포함됩니다.',
        '비자 신청·서류 대행 등 행정 지원은 이 상품에 포함되지 않습니다. 해당 지원이 필요하시면 별도로 문의해 주세요.',
        '이용 시작 전에는 전액 환불해 드립니다. 이용을 시작하신 뒤의 환불은 취소·환불 규정을 따릅니다.',
      ],
    },
  },
  en: {
    process: [
      { title: 'Pay for one month', body: 'Pay the fee for the month you plan to attend.' },
      { title: 'Class assignment', body: 'Once payment is confirmed we send your schedule and start date.' },
      { title: 'Attend for a month', body: 'Take training classes, practical Korean lessons, and on-the-job work preparation.' },
      { title: 'Choose again', body: 'You decide each month whether to continue.' },
    ],
    servicePeriod: 'One month from your start date',
    terms: {
      title: 'Before you pay',
      items: [
        'This is a one-month pass. You are paying for one month only, and the next month is not charged automatically.',
        'You decide each month whether to continue. If you stop, nothing further is charged.',
        'It includes training classes, practical Korean lessons, and on-the-job work preparation.',
        'Visa applications and document handling are not included in this product. Please contact us separately if you need that support.',
        'You get a full refund before your start date. After you begin, refunds follow our cancellation and refund policy.',
      ],
    },
  },
  ja: {
    process: [
      { title: '1ヶ月分のお支払い', body: 'ご利用になる1ヶ月分の利用料をお支払いいただきます。' },
      { title: 'クラスのご案内', body: '入金確認後、レッスン日程と開始日を個別にご案内します。' },
      { title: '1ヶ月のご利用', body: 'トレーニング受講、実務韓国語教育、実務投入業務教育をご利用いただきます。' },
      { title: '翌月のご選択', body: '翌月も続けるかどうかは毎月あらためてお選びいただけます。' },
    ],
    servicePeriod: 'ご利用開始日から1ヶ月',
    terms: {
      title: 'お支払い前にご確認ください',
      items: [
        'こちらは1ヶ月単位の利用券です。お支払いいただくのは1ヶ月分のみで、翌月分が自動的に請求されることはありません。',
        '翌月も継続されるかどうかは毎月あらためてお選びいただけます。中止された場合、それ以降のご請求はありません。',
        'トレーニング受講券、実務韓国語教育、実務投入業務教育が含まれます。',
        'ビザ申請・書類代行などの行政サポートは本商品に含まれません。必要な場合は別途お問い合わせください。',
        'ご利用開始前であれば全額返金いたします。ご利用開始後の返金はキャンセル・返金規定に従います。',
      ],
    },
  },
}

export const MONTHLY_TRAINING_PRODUCT_SLUG = 'monthly-training'
