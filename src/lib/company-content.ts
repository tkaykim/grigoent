export type CompanyDivisionSlug =
  | 'grigo'
  | 'deetz'
  | 'flowmaker'
  | 'reactstudio'

export type CompanyDivision = {
  slug: CompanyDivisionSlug
  eyebrow: string
  title: string
  shortTitle: string
  description: string
  capabilities: string[]
  href: string
  cta: string
  status: string
  logo?: {
    src: string
    alt: string
    className?: string
  }
  external?: boolean
}

export type ArchiveCategory = 'company' | 'work' | 'media' | 'case'

export type ArchiveItem = {
  id: string
  date: string
  year: string
  category: ArchiveCategory
  division: string
  title: string
  summary: string
  tags: string[]
  featured?: boolean
  sourceUrl?: string
  sourceLabel?: string
}

export const companyDivisions: CompanyDivision[] = [
  {
    slug: 'grigo',
    eyebrow: 'GRIGO Management',
    title: '전속 안무가 매니지먼트',
    shortTitle: 'GRIGO',
    description:
      '전속 안무가와 댄서의 활동을 매니지먼트하고, 안무 제작부터 아티스트 브랜딩과 콘텐츠 운영까지 함께 설계합니다.',
    capabilities: ['전속 아티스트 매니지먼트', '안무 제작·디렉팅', '브랜딩·콘텐츠 운영'],
    href: '/artists',
    cta: '아티스트 보기',
    status: 'Core business',
    logo: {
      src: '/brand/grigo-ent-black.png',
      alt: 'GRIGO Entertainment logo',
      className: 'h-14 max-w-[190px]',
    },
  },
  {
    slug: 'deetz',
    eyebrow: 'deetz',
    title: '댄서 에이전시 & 매거진',
    shortTitle: 'deetz',
    description:
      '댄서 매거진에서 출발해 프로필, 구인구직, 커뮤니티, 섭외를 연결하는 댄서 에이전시 플랫폼으로 확장했습니다.',
    capabilities: ['댄서 매거진', '구인구직·커뮤니티', '에이전시·프로젝트 매칭'],
    href: 'https://deetz.kr/',
    cta: 'deetz',
    status: 'Platform',
    external: true,
    logo: {
      src: '/brand/deetz-logo-black.png',
      alt: 'deetz logo',
      className: 'h-12 max-w-[135px]',
    },
  },
  {
    slug: 'flowmaker',
    eyebrow: 'Flowmaker',
    title: '공연제작사',
    shortTitle: 'Flowmaker',
    description:
      '댄서를 기반으로 한 배틀과 대회, 팬 이벤트, 페스티벌을 기획하고 무대와 현장 운영까지 완성합니다.',
    capabilities: ['댄스 배틀·대회 제작', '공연·행사 기획', '현장 운영·무대 연출'],
    href: 'https://flowmaker.co.kr/',
    cta: 'Flowmaker',
    status: 'Show production',
    external: true,
    logo: {
      src: '/brand/flowmaker-logo.png',
      alt: 'Flowmaker logo',
      className: 'h-10 max-w-[190px]',
    },
  },
  {
    slug: 'reactstudio',
    eyebrow: 'React Studio',
    title: '영상제작사',
    shortTitle: 'React',
    description:
      '댄스와 엔터테인먼트에 특화된 제작진이 뮤직비디오, 웹예능, 퍼포먼스 비디오를 기획하고 제작합니다.',
    capabilities: ['뮤직비디오', '웹예능·브랜디드 콘텐츠', '퍼포먼스 비디오'],
    href: 'https://reactstudio.kr/',
    cta: 'React Studio',
    status: 'Media production',
    external: true,
    logo: {
      src: '/brand/react-logo-black.png',
      alt: 'React Studio logo',
      className: 'h-9 max-w-[170px]',
    },
  },
]

export const companyHistory = [
  {
    year: '2018',
    items: ['연습실과 유튜브 콘텐츠 제작 기능을 결합한 <그리고 스튜디오> 설립'],
  },
  {
    year: '2019',
    items: ["댄서 '리안' 유튜브 채널 개설 및 기획·촬영·편집·운영 시작"],
  },
  {
    year: '2020',
    items: ["댄스팀 '라치카'(가비·시미즈·리안) 전속계약 및 매니지먼트 시작"],
  },
  {
    year: '2021',
    items: [
      "댄스팀 '라치카' 유튜브 채널 개설 및 기획·촬영·편집·운영",
      "댄스팀 '라치카' Mnet <스트릿 우먼 파이터> 출연 매니지먼트",
    ],
  },
  {
    year: '2022',
    items: [
      '댄스 공연·행사 운영사 <Flowmaker> 인수합병',
      '댄서 매거진 <deetz> 개설 및 유튜브 채널 운영 시작',
    ],
  },
  {
    year: '2023',
    items: ['유튜브 웹예능 <대세갑이주> 기획 및 채널 운영'],
  },
  {
    year: '2024',
    items: [
      '유튜브 웹예능 <디바마을 퀸가비> 시즌 1 기획·채널 운영·광고 운영',
      "댄서 '유메키' 전속계약",
      "댄서 '레난' 전속계약",
    ],
  },
  {
    year: '2025',
    items: [
      '<디바마을 퀸가비> 광고 운영',
      '유메키 Mnet <보이즈 2 플래닛> 출연 매니지먼트 및 국내 팬미팅',
      '유메키·우와 유튜브 채널 개설 및 운영 시작',
    ],
  },
  {
    year: '2026',
    items: [
      '유메키 일본 팬콘서트 투어: 오사카 2회·도쿄 2회·요코하마 1회',
      '요코하마 팬콘서트 Sky Perfect TV! 라이브 편성',
      '레난 Mnet <스트릿 우먼 파이터: 디렉터스 워> 출연',
      'deetz를 댄서 구인구직·소통·에이전시 플랫폼으로 확장',
    ],
  },
]

export const archiveCategories: { value: 'all' | ArchiveCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'company', label: 'Company' },
  { value: 'work', label: 'Works' },
  { value: 'media', label: 'Media' },
  { value: 'case', label: 'Case Study' },
]

export const archiveItems: ArchiveItem[] = [
  {
    id: 'group-system-2026',
    date: '2026',
    year: '2026',
    category: 'company',
    division: 'GRIGO Group',
    title: '그리고 엔터테인먼트, 네 개 전문 사업축을 연결한 엔터테인먼트 그룹으로 확장',
    summary:
      '전속 안무가 매니지먼트를 중심으로 댄서 에이전시와 매거진 deetz, 공연제작 Flowmaker, 영상제작 REACT Studio를 연결하는 운영 체계를 정비했습니다.',
    tags: ['회사군', '사업 확장', '브랜드 구조'],
    featured: true,
  },
  {
    id: 'yumeki-japan-tour-2026',
    date: '2026',
    year: '2026',
    category: 'work',
    division: 'GRIGO Management',
    title: '유메키 일본 팬콘서트 투어, 3개 도시 5회 공연 매니지먼트',
    summary:
      '오사카 2회, 도쿄 2회, 요코하마 1회로 이어진 일본 팬콘서트 투어를 진행했으며, 요코하마 공연은 Sky Perfect TV! 라이브로 편성됐습니다.',
    tags: ['유메키', '일본 투어', '팬콘서트'],
    featured: true,
  },
  {
    id: 'deetz-platform-expansion-2026',
    date: '2026',
    year: '2026',
    category: 'company',
    division: 'deetz',
    title: '댄서 매거진 deetz, 구인구직·소통·에이전시 플랫폼으로 확장',
    summary:
      '댄스 씬을 기록해 온 매거진의 편집 역량과 네트워크를 기반으로 댄서 프로필, 구인구직, 커뮤니티, 프로젝트 섭외를 연결하는 서비스로 사업 영역을 넓혔습니다.',
    tags: ['댄서 플랫폼', '에이전시', '커뮤니티'],
    featured: true,
    sourceUrl: 'https://deetz.kr/',
    sourceLabel: 'deetz 바로가기',
  },
  {
    id: 'rean-directors-war-2026',
    date: '2026',
    year: '2026',
    category: 'media',
    division: 'GRIGO Management',
    title: '소속 댄서 레난, Mnet <스트릿 우먼 파이터: 디렉터스 워> 출연',
    summary:
      '2024년 전속계약 이후 레난의 방송 활동과 안무가 커리어를 함께 매니지먼트하며 대중과의 접점을 확장했습니다.',
    tags: ['레난', '방송', '매니지먼트'],
  },
  {
    id: 'uwa-youtube-2025',
    date: '2025',
    year: '2025',
    category: 'media',
    division: 'GRIGO Management',
    title: '오죠갱 소속 댄서 우와, 유튜브 채널 개설',
    summary:
      'Mnet <월드 오브 스트릿 우먼 파이터> 오죠갱 팀으로 활동한 우와의 개성과 퍼포먼스를 지속적으로 보여줄 수 있는 공식 채널 운영을 시작했습니다.',
    tags: ['우와', '유튜브', '아티스트 브랜딩'],
  },
  {
    id: 'yumeki-boys-planet',
    date: '2025',
    year: '2025',
    category: 'media',
    division: 'GRIGO Management',
    title: '유메키, Mnet <보이즈 2 플래닛> 출연과 국내 팬미팅 진행',
    summary:
      '방송 출연 매니지먼트와 국내 팬미팅을 연계하고, 유튜브 채널을 개설해 유메키의 국내 활동과 팬 커뮤니케이션 기반을 확장했습니다.',
    tags: ['유메키', '방송', '팬미팅'],
  },
  {
    id: 'queen-gabi-ads-2025',
    date: '2025',
    year: '2025',
    category: 'case',
    division: 'GRIGO Entertainment',
    title: '<디바마을 퀸가비> 브랜드 광고 운영',
    summary:
      '콘텐츠의 높은 화제성과 캐릭터 IP를 바탕으로 브랜드 협업과 광고 운영을 담당했으며, 콘텐츠 기획·촬영·편집·채널 운영은 외부 제작 파트너가 수행했습니다.',
    tags: ['광고 운영', '브랜드 협업', '퀸가비'],
  },
  {
    id: 'diva-town-queen-gabi',
    date: '2024',
    year: '2024',
    category: 'media',
    division: 'GRIGO Entertainment',
    title: '유튜브 웹예능 <디바마을 퀸가비> 시즌 1 기획·운영',
    summary:
      '프로그램 방향과 채널 운영, 광고 운영을 맡아 댄서 IP를 웹예능으로 확장했으며, 세부 기획과 촬영·편집은 외부 제작 파트너와 협업했습니다.',
    tags: ['웹예능', '채널 운영', '광고 운영'],
    sourceUrl: 'https://www.youtube.com/watch?v=paUnad8msh8&list=PL5J4LnE09V3SWgqy6e0Cq6f085cBb1MJA',
    sourceLabel: '시즌 1 재생목록',
  },
  {
    id: 'yumeki-rean-contracts-2024',
    date: '2024',
    year: '2024',
    category: 'company',
    division: 'GRIGO Management',
    title: '댄서 유메키·레난 전속계약',
    summary:
      '서로 다른 스타일과 글로벌 활동 기반을 가진 유메키와 레난을 영입하며 전속 안무가 매니지먼트 라인업을 확장했습니다.',
    tags: ['전속계약', '유메키', '레난'],
  },
  {
    id: 'daesegabi-zu',
    date: '2023',
    year: '2023',
    category: 'media',
    division: 'GRIGO Entertainment',
    title: '유튜브 웹예능 <대세갑이주> 기획·운영',
    summary:
      '댄서 IP와 웹예능 포맷을 결합해 프로그램을 기획하고 채널을 운영했으며, 촬영과 편집은 외부 제작 파트너와 협업했습니다.',
    tags: ['웹예능', '콘텐츠 기획', '채널 운영'],
    sourceUrl: 'https://www.youtube.com/watch?v=Q-Ldxlm6FiM&list=PL5J4LnE09V3QueYeceWBVc_scx-o9I5PP',
    sourceLabel: '재생목록 보기',
  },
  {
    id: 'flowmaker-merge',
    date: '2022',
    year: '2022',
    category: 'company',
    division: 'Flowmaker',
    title: '댄스 공연·행사 운영사 Flowmaker 인수합병',
    summary:
      '공연, 배틀, 행사 제작 역량을 회사 내부 운영 축으로 편입하며 매니지먼트와 공연제작을 연결했습니다.',
    tags: ['M&A', '공연기획', '행사제작'],
    sourceUrl: 'https://flowmaker.co.kr/',
    sourceLabel: 'Flowmaker 바로가기',
  },
  {
    id: 'deetz-magazine-launch-2022',
    date: '2022',
    year: '2022',
    category: 'company',
    division: 'deetz',
    title: '댄서 매거진 deetz 개설',
    summary:
      '댄서와 댄스 씬의 사람·작업·이슈를 기록하는 매거진을 시작하고 유튜브 채널을 함께 운영하며 미디어 기반을 만들었습니다.',
    tags: ['댄서 매거진', '유튜브', '댄스 미디어'],
    sourceUrl: 'https://www.youtube.com/@deetzmagazine',
    sourceLabel: 'deetz 매거진 채널',
  },
  {
    id: 'lachica-swf-2021',
    date: '2021',
    year: '2021',
    category: 'media',
    division: 'GRIGO Management',
    title: '라치카 유튜브 채널 개설 및 Mnet <스트릿 우먼 파이터> 출연',
    summary:
      '라치카 공식 유튜브 채널의 기획·촬영·편집·운영을 시작하고, Mnet <스트릿 우먼 파이터> 출연을 매니지먼트하며 팀의 대중 활동을 확장했습니다.',
    tags: ['라치카', '스트릿 우먼 파이터', '채널 운영'],
  },
  {
    id: 'lachica-contract-2020',
    date: '2020',
    year: '2020',
    category: 'company',
    division: 'GRIGO Management',
    title: '댄스팀 라치카 전속계약 및 매니지먼트 시작',
    summary:
      '가비·시미즈·리안으로 구성된 라치카와 전속계약을 체결하며 댄서와 안무가를 위한 전문 매니지먼트 사업을 본격화했습니다.',
    tags: ['라치카', '전속계약', '매니지먼트'],
  },
  {
    id: 'rian-youtube-2019',
    date: '2019',
    year: '2019',
    category: 'media',
    division: 'GRIGO Studio',
    title: '댄서 리안 유튜브 채널 개설 및 통합 운영 시작',
    summary:
      '채널 기획부터 촬영, 편집, 운영까지 전 과정을 맡아 댄서 개인의 캐릭터와 작업을 지속 가능한 콘텐츠로 만드는 기반을 쌓았습니다.',
    tags: ['리안', '유튜브', '콘텐츠 운영'],
  },
  {
    id: 'grigo-studio-2018',
    date: '2018',
    year: '2018',
    category: 'company',
    division: 'GRIGO Studio',
    title: '연습실 겸 유튜브 제작사 <그리고 스튜디오> 설립',
    summary:
      '댄서가 연습하고 촬영하며 자신의 콘텐츠를 만들 수 있는 공간에서 시작해, 오늘의 매니지먼트와 콘텐츠 사업으로 이어지는 첫 기반을 만들었습니다.',
    tags: ['회사 시작', '연습실', '유튜브 제작'],
  },
]

export const featuredArchiveItems = archiveItems.filter((item) => item.featured)
