# 댄서-클라이언트 플랫폼

안무가(댄서)와 클라이언트를 연결하는 전문 플랫폼입니다.

## 🚀 기술 스택

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Database, Auth, Storage)
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

## 📋 주요 기능

### 사용자 관리
- 회원가입/로그인 (Supabase Auth)
- 사용자 유형: 일반, 댄서, 클라이언트, 매니저, 관리자
- 프로필 관리 (이름, 연락처, 소개, SNS 링크)

### 댄서 기능
- 경력 등록/수정/삭제
- 경력 카테고리: 안무제작, 댄서참여, 광고진행, TV프로그램, 워크샵
- 대표작 설정 (카테고리별 최대 2개)
- YouTube 영상 썸네일 자동 추출

### 관리자 기능
- 회원 승인/거절
- 댄서 노출 순서 관리
- 통계 대시보드

### 페이지 구성
- 홈페이지 (Hero 영상, About, Artists, Works, Contact)
- 아티스트 목록 페이지
- 아티스트 상세 페이지
- 마이페이지 (권한별 대시보드)
- 관리자 페이지

## 🛠️ 설치 및 설정

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd dancer-platform
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경변수 설정
`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 기타 설정
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Supabase 데이터베이스 설정

Supabase 프로젝트를 생성하고 `database-schema.sql` 파일의 내용을 SQL 편집기에서 실행하세요.

### 5. 개발 서버 실행
```bash
npm run dev
```

## 📊 데이터베이스 스키마

### users 테이블
- `id`: UUID (Primary Key)
- `name`: TEXT (이름)
- `name_en`: TEXT (영어 이름)
- `email`: TEXT (이메일, Unique)
- `phone`: TEXT (연락처)
- `profile_image`: TEXT (프로필 이미지 URL)
- `slug`: TEXT (URL용 슬러그, Unique)
- `type`: TEXT (사용자 유형)
- `pending_type`: TEXT (승인 대기 유형)
- `display_order`: INTEGER (노출 순서)
- `introduction`: TEXT (소개)
- `instagram_url`: TEXT (Instagram URL)
- `twitter_url`: TEXT (Twitter URL)
- `youtube_url`: TEXT (YouTube URL)
- `created_at`: TIMESTAMP

### career_entries 테이블
- `id`: UUID (Primary Key)
- `user_id`: UUID (users 테이블 참조)
- `category`: TEXT (경력 카테고리)
- `title`: TEXT (제목)
- `video_url`: TEXT (영상 URL)
- `poster_url`: TEXT (포스터 URL)
- `is_featured`: BOOLEAN (대표작 여부)
- `description`: TEXT (설명)
- `country`: TEXT (진행국가)
- `start_date`: DATE (시작일)
- `end_date`: DATE (종료일)
- `created_at`: TIMESTAMP

## 🎨 UI/UX 특징

- **디자인**: 흑백 모노톤 기반
- **테마**: shadcn/ui zinc 테마
- **반응형**: 모바일 우선 설계
- **접근성**: 적절한 aria-label, semantic HTML 사용

## 🔐 보안

- Supabase Row Level Security (RLS) 적용
- 사용자별 데이터 접근 제어
- 관리자 권한 검증

## 🚀 배포

### Vercel 배포
1. Vercel 계정 생성
2. GitHub 저장소 연결
3. 환경변수 설정
4. 배포 완료

## 📝 개발 가이드

### 컴포넌트 구조
```
src/
├── components/
│   ├── ui/          # shadcn/ui 컴포넌트
│   ├── layout/      # 레이아웃 컴포넌트
│   ├── auth/        # 인증 관련 컴포넌트
│   ├── artists/     # 아티스트 관련 컴포넌트
│   ├── careers/     # 경력 관련 컴포넌트
│   ├── dashboard/   # 대시보드 컴포넌트
│   └── home/        # 홈페이지 컴포넌트
```

### API 라우트
- `/api/users` - 사용자 관리
- `/api/careers` - 경력 관리
- `/api/admin` - 관리자 기능

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.
