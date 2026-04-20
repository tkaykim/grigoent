export const KOREA_REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const

export type KoreaRegion = (typeof KOREA_REGIONS)[number]

export const OVERSEAS_OPTION = '해외' as const

export const RESIDENCE_OPTIONS = [...KOREA_REGIONS, OVERSEAS_OPTION] as const
export type ResidenceOption = (typeof RESIDENCE_OPTIONS)[number]
