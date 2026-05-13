# 그리고 엔터테인먼트 (GRIGO Entertainment)

댄서 소속사 **그리고 엔터테인먼트**의 공식 홈페이지입니다.
소속 아티스트(댄서)의 프로필, 경력, 포트폴리오를 소개하고 외부 섭외 및 문의를 받는 창구 역할을 합니다.

> **Live**: [grigoent.co.kr](https://grigoent.co.kr)

---

## 목차

- [기술 스택](#기술-스택)
- [주요 기능](#주요-기능)
- [설치 및 설정](#설치-및-설정)
- [환경변수](#환경변수)
- [프로젝트 구조](#프로젝트-구조)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [API 라우트](#api-라우트)
- [UI/UX 특징](#uiux-특징)
- [보안](#보안)
- [배포](#배포)
- [개발 가이드](#개발-가이드)
- [관련 문서](#관련-문서)
- [기여하기](#기여하기)
- [라이선스](#라이선스)
- [문의](#문의)

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, tw-animate-css |
| **Backend** | Supabase (Database, Auth, Storage) |
| **UI Components** | shadcn/ui, Radix UI, Lucide Icons |
| **Animation** | Framer Motion, Lenis (smooth scroll) |
| **Form** | React Hook Form, Zod |
| **Drag & Drop** | dnd-kit |
| **Email** | Nodemailer |
| **PDF** | @react-pdf/renderer, pdfkit |
| **Analytics** | Vercel Analytics |
| **Deployment** | Vercel |

---

## 주요 기능

### 사용자 관리
- 회원가입/로그인 (Supabase Auth)
- 사용자 유형: 일반, 댄서, 클라이언트, 매니저, 관리자
- 프로필 관리 (이름, 연락처, 소개, SNS 링크)

### 댄서 기능
- 경력 등록/수정/삭제
- 경력 카테고리: 안무제작, 댄서참여, 광고진행, TV프로그램, 워크샵
- 대표작 설정 (카테고리별 최대 2개)
- YouTube 영상 썸네일 자동 추출
- 댄서 지원서 제출

### 팀 관리
- 댄스팀 생성 및 관리
- 팀원 추가/삭제
- 팀 프로필 관리

### 섭외/제안 시스템
- 댄서/팀 섭외 제안서 발송
- 익명/회원 제안 지원
- 견적서 발송 및 응답

### 관리자 기능
- 회원 승인/거절
- 댄서 노출 순서 관리 (Drag & Drop)
- 통계 대시보드
- 댄서 지원서 심사

### 페이지 구성
- 홈페이지 (Hero 영상, About, Artists, Works, Contact)
- 아티스트 목록/상세 페이지
- 팀 목록/상세 페이지
- 마이페이지 (권한별 대시보드)
- 관리자 페이지
- 견적서 조회/응답 페이지

---

## 설치 및 설정

### 요구사항
- Node.js 20 이상
- npm 또는 yarn

### 1. 프로젝트 클론
```bash
git clone https://github.com/tkaykim/grigoent.git
cd grigoent
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경변수 설정
`.env.local` 파일을 생성하고 [환경변수](#환경변수) 섹션 참조

### 4. Supabase 데이터베이스 설정
Supabase 프로젝트를 생성하고 `sql/` 폴더의 SQL 파일들을 순서대로 실행

### 5. 개발 서버 실행
```bash
npm run dev
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 실행됩니다 (Turbopack 사용).

---

## 환경변수

`.env.local` 파일에 다음 환경변수를 설정하세요:

```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 사이트 URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 이메일 발송 (Nodemailer - 선택)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# 관리자 알림 수신 이메일 (선택)
ADMIN_EMAIL=

# Google Apps Script 웹훅 (Contact Form용 - 선택)
NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL=
```

> **참고**: SMTP 설정은 견적서 발송 기능에 필요합니다. Gmail 사용 시 앱 비밀번호를 생성하여 `SMTP_PASS`에 설정하세요.

---

## 프로젝트 구조

```
grigoent/
├── src/
│   ├── app/                    # Next.js App Router 페이지
│   │   ├── [slug]/             # 댄서 상세 (동적 라우트)
│   │   ├── admin/              # 관리자 페이지
│   │   ├── api/                # API 라우트
│   │   ├── apply/              # 댄서 지원 페이지
│   │   ├── artists/            # 아티스트 목록
│   │   ├── inquiries/          # 문의 관리
│   │   ├── intro/              # 소개 페이지
│   │   ├── mypage/             # 마이페이지
│   │   ├── proposals/          # 섭외 제안
│   │   ├── quote/              # 견적서
│   │   ├── report/             # 리포트
│   │   ├── signin/             # 로그인
│   │   ├── signup/             # 회원가입
│   │   └── teams/              # 팀 페이지
│   ├── components/             # React 컴포넌트
│   │   ├── ui/                 # shadcn/ui 컴포넌트
│   │   ├── layout/             # 레이아웃 컴포넌트
│   │   ├── auth/               # 인증 관련
│   │   ├── artists/            # 아티스트 관련
│   │   ├── careers/            # 경력 관련
│   │   ├── dashboard/          # 대시보드
│   │   └── home/               # 홈페이지
│   ├── contexts/               # React Context
│   └── lib/                    # 유틸리티 함수
│       ├── supabase/           # Supabase 클라이언트
│       ├── email.ts            # 이메일 발송
│       └── admin-auth.ts       # 관리자 인증
├── sql/                        # 데이터베이스 스키마
├── public/                     # 정적 파일
├── docs/                       # 추가 문서
└── google-apps-script.gs       # Contact Form 웹훅 스크립트
```

---

## 데이터베이스 스키마

### users 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `name` | TEXT | 이름 |
| `name_en` | TEXT | 영어 이름 |
| `email` | TEXT | 이메일 (Unique) |
| `phone` | TEXT | 연락처 |
| `profile_image` | TEXT | 프로필 이미지 URL |
| `slug` | TEXT | URL용 슬러그 (Unique) |
| `type` | TEXT | 사용자 유형 |
| `pending_type` | TEXT | 승인 대기 유형 |
| `display_order` | INTEGER | 노출 순서 |
| `introduction` | TEXT | 소개 |
| `instagram_url` | TEXT | Instagram URL |
| `twitter_url` | TEXT | Twitter URL |
| `youtube_url` | TEXT | YouTube URL |
| `created_at` | TIMESTAMP | 생성일시 |

### career_entries 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | users 참조 |
| `category` | TEXT | 경력 카테고리 |
| `title` | TEXT | 제목 |
| `video_url` | TEXT | 영상 URL |
| `poster_url` | TEXT | 포스터 URL |
| `is_featured` | BOOLEAN | 대표작 여부 |
| `description` | TEXT | 설명 |
| `country` | TEXT | 진행국가 |
| `start_date` | DATE | 시작일 |
| `end_date` | DATE | 종료일 |
| `created_at` | TIMESTAMP | 생성일시 |

> 추가 테이블 스키마는 `sql/` 폴더의 SQL 파일 참조

---

## API 라우트

| 경로 | 설명 |
|------|------|
| `/api/users` | 사용자 관리 |
| `/api/users/search` | 사용자 검색 |
| `/api/users/claim` | 댄서 계정 클레임 |
| `/api/careers` | 경력 관리 |
| `/api/teams` | 팀 관리 |
| `/api/teams/[id]` | 팀 상세 |
| `/api/teams/[id]/members` | 팀원 관리 |
| `/api/proposals` | 섭외 제안 |
| `/api/proposals/team` | 팀 섭외 제안 |
| `/api/proposals/anonymous` | 익명 섭외 제안 |
| `/api/proposals/general` | 일반 문의 |
| `/api/quotes` | 견적서 관리 |
| `/api/quotes/send` | 견적서 발송 |
| `/api/quotes/view` | 견적서 조회 |
| `/api/quotes/respond` | 견적서 응답 |
| `/api/admin` | 관리자 기능 |
| `/api/admin/claims` | 클레임 심사 |
| `/api/admin/direct-link` | 다이렉트 링크 생성 |
| `/api/admin/dancer-applications` | 댄서 지원서 관리 |
| `/api/dancer-applications` | 댄서 지원서 제출 |

---

## UI/UX 특징

- **디자인**: 흑백 모노톤 기반의 미니멀한 디자인
- **테마**: shadcn/ui zinc 테마
- **반응형**: 모바일 우선 설계
- **접근성**: 적절한 aria-label, semantic HTML 사용
- **애니메이션**: Framer Motion을 활용한 부드러운 전환 효과
- **스크롤**: Lenis를 활용한 smooth scroll

---

## 보안

- Supabase Row Level Security (RLS) 적용
- 사용자별 데이터 접근 제어
- 관리자 권한 검증
- Service Role Key는 서버 사이드에서만 사용

---

## 배포

| 항목 | 값 |
|------|------|
| **Production URL** | [grigoent.co.kr](https://grigoent.co.kr) |
| **Vercel Project** | `grigo` |
| **CI/CD** | GitHub main 브랜치 push 시 자동 배포 |

### Vercel 배포 절차
1. Vercel 계정에서 GitHub 저장소 연결
2. 환경변수 설정 (Settings > Environment Variables)
3. main 브랜치 push 시 자동 배포

### Preview 배포
- PR 생성 시 자동으로 Preview URL 생성
- 패턴: `grigoent-git-<branch>-grigoents-projects.vercel.app`

---

## 개발 가이드

### 스크립트
```bash
npm run dev      # 개발 서버 실행 (Turbopack)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행
```

### 코드 컨벤션
- TypeScript strict mode
- ESLint + Next.js 권장 규칙
- 컴포넌트는 PascalCase, 유틸리티는 camelCase

### 새 컴포넌트 추가
```bash
npx shadcn-ui@latest add <component-name>
```

---

## 관련 문서

- [Contact Form 이메일 설정](./CONTACT_EMAIL_SETUP.md)
- [대량 경력 등록 가이드](./BULK_CAREER_REGISTRATION_GUIDE.md)
- [사용자 권한 규칙](./USER_PERMISSIONS_RULES.md)
- [다국어 번역 TODO](./LANGUAGE_TRANSLATION_TODO.md)

---

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

## 문의

- **공식 웹사이트**: [grigoent.co.kr](https://grigoent.co.kr)
- **섭외 및 문의**: 웹사이트 Contact 페이지 이용
- **기술 이슈**: [GitHub Issues](https://github.com/tkaykim/grigoent/issues)
