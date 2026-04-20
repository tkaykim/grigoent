import type { Language } from '@/contexts/LanguageContext'

export const DANCE_SPECIALTIES = [
  { value: 'hiphop', label_ko: '힙합', label_en: 'Hip-hop', label_ja: 'ヒップホップ' },
  { value: 'kpop', label_ko: 'K-pop', label_en: 'K-pop', label_ja: 'K-POP' },
  { value: 'choreography', label_ko: '코레오그래피', label_en: 'Choreography', label_ja: '振付' },
  { value: 'jazz', label_ko: '재즈', label_en: 'Jazz', label_ja: 'ジャズ' },
  { value: 'girls_hiphop', label_ko: '걸스힙합', label_en: 'Girls hip-hop', label_ja: 'ガールズヒップホップ' },
  { value: 'house', label_ko: '하우스', label_en: 'House', label_ja: 'ハウス' },
  { value: 'waacking', label_ko: '왁킹', label_en: 'Waacking', label_ja: 'ワッキング' },
  { value: 'locking', label_ko: '락킹', label_en: 'Locking', label_ja: 'ロッキング' },
  { value: 'popping', label_ko: '팝핑', label_en: 'Popping', label_ja: 'ポッピング' },
  { value: 'breaking', label_ko: '브레이킹', label_en: 'Breaking', label_ja: 'ブレイキン' },
  { value: 'krump', label_ko: '크럼프', label_en: 'Krump', label_ja: 'クランプ' },
  { value: 'contemporary', label_ko: '컨템포러리', label_en: 'Contemporary', label_ja: 'コンテンポラリー' },
  { value: 'vogue', label_ko: '보깅', label_en: 'Vogue', label_ja: 'ヴォーギング' },
  { value: 'other', label_ko: '기타', label_en: 'Other', label_ja: 'その他' },
] as const

export type DanceSpecialty = (typeof DANCE_SPECIALTIES)[number]['value']

export const DANCE_SPECIALTY_VALUES = DANCE_SPECIALTIES.map((s) => s.value) as DanceSpecialty[]

export function specialtyLabel(value: string, lang: Language): string {
  const found = DANCE_SPECIALTIES.find((s) => s.value === value)
  if (!found) return value
  if (lang === 'ja') return found.label_ja
  if (lang === 'en') return found.label_en
  return found.label_ko
}
