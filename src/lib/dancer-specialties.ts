export const DANCE_SPECIALTIES = [
  { value: 'hiphop', label_ko: '힙합', label_en: 'Hip-hop' },
  { value: 'kpop', label_ko: 'K-pop', label_en: 'K-pop' },
  { value: 'choreography', label_ko: '코레오그래피', label_en: 'Choreography' },
  { value: 'jazz', label_ko: '재즈', label_en: 'Jazz' },
  { value: 'girls_hiphop', label_ko: '걸스힙합', label_en: 'Girls hip-hop' },
  { value: 'house', label_ko: '하우스', label_en: 'House' },
  { value: 'waacking', label_ko: '왁킹', label_en: 'Waacking' },
  { value: 'locking', label_ko: '락킹', label_en: 'Locking' },
  { value: 'popping', label_ko: '팝핑', label_en: 'Popping' },
  { value: 'breaking', label_ko: '브레이킹', label_en: 'Breaking' },
  { value: 'krump', label_ko: '크럼프', label_en: 'Krump' },
  { value: 'contemporary', label_ko: '컨템포러리', label_en: 'Contemporary' },
  { value: 'vogue', label_ko: '보깅', label_en: 'Vogue' },
  { value: 'other', label_ko: '기타', label_en: 'Other' },
] as const

export type DanceSpecialty = (typeof DANCE_SPECIALTIES)[number]['value']

export const DANCE_SPECIALTY_VALUES = DANCE_SPECIALTIES.map((s) => s.value) as DanceSpecialty[]

export function specialtyLabel(value: string, lang: 'ko' | 'en'): string {
  const found = DANCE_SPECIALTIES.find((s) => s.value === value)
  if (!found) return value
  return lang === 'ko' ? found.label_ko : found.label_en
}
