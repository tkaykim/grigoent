export type TrainingPaymentFailureLanguage = 'ko' | 'en' | 'ja'

type FailureCopy = {
  title: string
  message: string
}

const NOT_CHARGED_TITLE: Record<TrainingPaymentFailureLanguage, string> = {
  ko: '결제가 승인되지 않았습니다.',
  en: 'Your payment was not approved.',
  ja: '決済は承認されませんでした。',
}

const INSTALLMENT_NOT_SUPPORTED: Record<TrainingPaymentFailureLanguage, string> = {
  ko: '선택한 할부 조건을 이 카드에서 사용할 수 없어 결제가 승인되지 않았습니다. 체크카드는 일시불로 다시 시도하거나, 할부 가능한 국내 신용카드를 사용해 주세요. 이번 결제는 카드에 청구되지 않았습니다.',
  en: 'The selected installment plan is not available for this card, so the payment was not approved. Retry as a one-time payment for a debit card, or use a Korean-issued credit card that supports installments. Your card was not charged.',
  ja: '選択した分割払いをこのカードでは利用できないため、決済は承認されませんでした。チェックカードは一括払いで再試行するか、分割払いに対応した韓国発行のクレジットカードをご利用ください。カードへの請求はありません。',
}

const NOT_CHARGED_SUFFIX: Record<TrainingPaymentFailureLanguage, string> = {
  ko: '이번 결제는 카드에 청구되지 않았습니다.',
  en: 'Your card was not charged.',
  ja: 'カードへの請求はありません。',
}

export function trainingPaymentFailureCopy(
  code: string | null | undefined,
  lang: TrainingPaymentFailureLanguage,
  fallback?: string | null,
  charged?: boolean,
): FailureCopy {
  if (
    code === 'NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT' ||
    code === 'NOT_SUPPORTED_MONTHLY_INSTALLMENT_PLAN'
  ) {
    return { title: NOT_CHARGED_TITLE[lang], message: INSTALLMENT_NOT_SUPPORTED[lang] }
  }

  const base = fallback?.trim()
  if (charged === false) {
    return {
      title: NOT_CHARGED_TITLE[lang],
      message: base ? `${base} ${NOT_CHARGED_SUFFIX[lang]}` : NOT_CHARGED_SUFFIX[lang],
    }
  }

  return {
    title: NOT_CHARGED_TITLE[lang],
    message: base || NOT_CHARGED_SUFFIX[lang],
  }
}
