export const RECRUITING_OVERVIEW = {
  status: '4개 직무 채용 중',
  title: '모집 직무를 선택해 지원하세요.',
  employment: '채용 형태 협의',
  summary:
    '매니지먼트, 디자인, 영상 제작, 기획·행사 운영을 각각 독립된 직무로 모집합니다. 경험이 여러 직무에 걸쳐 있다면 복수로 선택할 수 있습니다.',
} as const

export const RECRUITING_TRACKS = [
  {
    slug: 'management',
    title: '매니지먼트',
    shortDescription: '전속 아티스트와 댄스팀의 일정, 현장, 채널을 관리합니다.',
    responsibilities: [
      '전속 안무가 일정 및 매니지먼트',
      '전속 댄스팀 공연·행사 일정 관리',
      '아티스트·프로젝트 SNS 채널 운영',
      '에이전시 플랫폼 deetz 내 섭외 및 프로젝트 커뮤니케이션',
    ],
  },
  {
    slug: 'planning-event-operations',
    title: '기획·행사 운영',
    shortDescription: '댄스를 기반으로 한 공연과 행사를 기획하고 현장을 운영합니다.',
    responsibilities: [
      '댄스 배틀, 대회, 공연 및 기업 행사 기획',
      '공연·행사 준비와 출연자·스태프 일정 관리',
      '행사 제작물과 현장 운영 동선 점검',
      '공연·행사 당일 현장 운영',
    ],
  },
  {
    slug: 'video-production',
    title: '영상 제작',
    shortDescription: '뮤직비디오, 웹예능, 퍼포먼스 비디오를 제작합니다.',
    responsibilities: [
      '뮤직비디오, 웹예능, 퍼포먼스 비디오 기획',
      '카메라 촬영과 촬영 현장 운영',
      '촬영 데이터 및 프로젝트 파일 관리',
      'Premiere Pro, After Effects 등을 활용한 편집',
    ],
  },
  {
    slug: 'design',
    title: '디자인',
    shortDescription: '각 사업부의 프로젝트와 채널에 필요한 디자인을 담당합니다.',
    responsibilities: [
      '사업부별 SNS 콘텐츠 디자인',
      '프로젝트 제안서와 프레젠테이션 디자인',
      '공연·행사 현장 제작물 디자인',
      '브랜드별 비주얼 가이드와 제작 파일 관리',
    ],
  },
] as const

export const RECRUITING_TRACK_SLUGS = [
  'management',
  'planning-event-operations',
  'video-production',
  'design',
] as const

export type RecruitingTrackSlug = (typeof RECRUITING_TRACK_SLUGS)[number]

export const RECRUITING_TRACK_BY_SLUG = Object.fromEntries(
  RECRUITING_TRACKS.map((track) => [track.slug, track])
) as Record<RecruitingTrackSlug, (typeof RECRUITING_TRACKS)[number]>

export const RECRUITING_PREFERRED = [
  '지원 직무와 관련된 실무 경험이 있는 분',
  '댄서와 국내외 댄스 신에 대한 이해가 있는 분',
  '아티스트, 댄서, 출연자 또는 클라이언트와 소통해 본 분',
  '엔터테인먼트, 에이전시, 제작사 또는 공연·행사 현장 경험이 있는 분',
  '업무 일정과 자료를 스스로 정리하고 마감까지 관리할 수 있는 분',
  '운전면허를 보유하고 실제 운전이 가능한 분',
] as const

export const RECRUITING_TOOL_OPTIONS = [
  { key: 'premiere_pro', label: 'Premiere Pro', category: '영상' },
  { key: 'after_effects', label: 'After Effects', category: '영상' },
  { key: 'davinci_resolve', label: 'DaVinci Resolve', category: '영상' },
  { key: 'photoshop', label: 'Photoshop', category: '디자인' },
  { key: 'illustrator', label: 'Illustrator', category: '디자인' },
  { key: 'figma', label: 'Figma', category: '디자인' },
] as const

export const RECRUITING_TOOL_LEVELS = [
  { value: 'high', label: '상' },
  { value: 'medium', label: '중' },
  { value: 'low', label: '하' },
  { value: 'none', label: '사용 안 함' },
] as const

export const RECRUITING_AI_TOOL_OPTIONS = [
  { key: 'gemini', label: 'Gemini (제미나이)' },
  { key: 'chatgpt', label: 'ChatGPT (챗 지피티)' },
  { key: 'claude', label: 'Claude (클로드)' },
  { key: 'codex', label: 'Codex (코덱스)' },
  { key: 'claude_code', label: 'Claude Code (클로드 코드)' },
  { key: 'higgsfield', label: 'Higgsfield (힉스필드)' },
] as const

export const RECRUITING_AI_TOOL_LEVELS = [
  { value: 'heard', label: '들어봤다' },
  { value: 'used', label: '사용해봤다' },
  { value: 'proficient', label: '숙련자이다' },
] as const

export type RecruitingToolKey = (typeof RECRUITING_TOOL_OPTIONS)[number]['key']
export type RecruitingToolLevel = (typeof RECRUITING_TOOL_LEVELS)[number]['value']
export type RecruitingAiToolKey = (typeof RECRUITING_AI_TOOL_OPTIONS)[number]['key']
export type RecruitingAiToolLevel = (typeof RECRUITING_AI_TOOL_LEVELS)[number]['value']
