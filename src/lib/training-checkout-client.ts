export function paypalSdkLocale(lang: string): string {
  return lang === 'ja' ? 'ja_JP' : lang === 'ko' ? 'ko_KR' : 'en_US'
}

const PRODUCT_PATHS: Record<string, string> = {
  'training-and-placement': '/training',
  'audition-fee': '/audition-fee',
  'monthly-training': '/monthly-training',
  'monthly-training-100': '/monthly-training-100',
  'village-deposit': '/village-deposit',
  'payment-test': '/payment-test',
}

export function trainingRetryPath(productSlug?: string | null, ref?: string | null, lang?: string | null): string {
  const path = PRODUCT_PATHS[productSlug ?? ''] ?? '/training'
  const query = new URLSearchParams()
  if (ref) query.set('ref', ref)
  if (lang === 'en' || lang === 'ko' || lang === 'ja') query.set('lang', lang)
  return `${path}${query.size ? `?${query}` : ''}`
}
