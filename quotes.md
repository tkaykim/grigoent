# 견적서 작성·발송 시스템 기술 문서

> React Studio 프로젝트의 견적서(Quote) 생성, PDF 첨부, 이메일 발송, 고객 응답 처리에 대한 전체 기술 문서

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [데이터베이스 (Supabase)](#2-데이터베이스-supabase)
3. [API 라우트](#3-api-라우트)
4. [PDF 생성](#4-pdf-생성)
5. [이메일 발송](#5-이메일-발송)
6. [프론트엔드 페이지](#6-프론트엔드-페이지)
7. [한글 폰트 오류 및 해결](#7-한글-폰트-오류-및-해결)
8. [과거 발생 오류 및 해결 이력](#8-과거-발생-오류-및-해결-이력)
9. [환경변수](#9-환경변수)
10. [파일 구조 요약](#10-파일-구조-요약)

---

## 1. 시스템 개요

### 전체 플로우

```
문의 접수 → 관리자 견적서 작성 → 저장(draft) → PDF 생성 + 이메일 발송(sent)
                                                         ↓
                                              고객 이메일 수신
                                              (견적서 PDF 첨부 + 본문에 견적 요약)
                                                         ↓
                                              고객 온라인 페이지에서 응답
                                              (승인 / 수정 요청 / 거절)
                                                         ↓
                                              관리자에게 응답 알림 메일 발송
```

### 핵심 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| DB | Supabase (PostgreSQL) |
| PDF 생성 | `@react-pdf/renderer` (`renderToBuffer`) |
| 이메일 | `nodemailer` (SMTP, Gmail 앱 비밀번호) |
| PDF 한글 폰트 | 나눔고딕 (NanumGothic) TTF, 로컬 파일 |

---

## 2. 데이터베이스 (Supabase)

### `quotes` 테이블

프로젝트에 SQL 마이그레이션 파일은 없으며, 아래는 `types/index.ts`의 타입 정의와 API insert/update 필드로 역추적한 스키마이다.

```sql
-- 실제 DDL은 Supabase 대시보드에서 확인 필요. 아래는 코드 기반 추정 스키마.
CREATE TABLE quotes (
  id             SERIAL PRIMARY KEY,
  bu_code        TEXT NOT NULL,            -- 사업부 코드 ('REACT')
  inquiry_id     INTEGER NOT NULL,         -- inquiries 테이블 FK
  items          JSONB NOT NULL,           -- QuoteItem[] 배열
  supply_amount  NUMERIC NOT NULL,         -- 공급가액
  vat            NUMERIC NOT NULL,         -- 부가세
  total_amount   NUMERIC NOT NULL,         -- 합계
  valid_until    DATE,                     -- 견적 유효기간
  notes          TEXT,                     -- 비고
  status         TEXT DEFAULT 'draft',     -- 'draft' | 'sent'
  sent_at        TIMESTAMPTZ,             -- 발송 시각
  view_token     UUID,                    -- 고객 열람용 고유 토큰
  client_response      TEXT,              -- 'pending' | 'approved' | 'revision_requested' | 'rejected'
  client_response_at   TIMESTAMPTZ,       -- 고객 응답 시각
  client_response_note TEXT,              -- 고객 응답 메모
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### TypeScript 타입 정의 (`types/index.ts`)

```typescript
export interface QuoteItem {
  name: string;
  qty: number;
  unit_price: number;
  amount: number;
}

export interface Quote {
  id: number;
  bu_code: BuCode;
  inquiry_id: number;
  items: QuoteItem[];
  supply_amount: number;
  vat: number;
  total_amount: number;
  valid_until: string;
  notes: string;
  status: 'draft' | 'sent';
  sent_at: string | null;
  view_token: string | null;
  client_response: 'pending' | 'approved' | 'revision_requested' | 'rejected' | null;
  client_response_at: string | null;
  client_response_note: string | null;
  created_at: string;
}
```

### `inquiries` 테이블과의 관계

- `quotes.inquiry_id` → `inquiries.id` (N:1)
- 견적 조회 시 `select('*, inquiries(*)')` 형태로 조인
- 문의(inquiry)로부터 고객 이름, 이메일, 회사명, 프로젝트 제목 등을 참조

---

## 3. API 라우트

### 3-1. 견적 생성/수정 — `app/api/quote/route.ts`

| 메서드 | 역할 |
|--------|------|
| **POST** | 새 견적 생성 (status: `draft`, view_token: UUID 자동 생성) |
| **PUT** | 기존 견적 수정 (id 기준, `cc_emails`는 DB 저장 대상에서 제외) |

```typescript
// POST — 견적 생성
const { inquiry_id, items, supply_amount, vat, total_amount, valid_until, notes } = body;
await supabase.from('quotes').insert({
  bu_code: CURRENT_BU_CODE,
  inquiry_id, items, supply_amount, vat, total_amount, valid_until, notes,
  status: 'draft',
  view_token: randomUUID(),
});

// PUT — 견적 수정 (cc_emails는 destructuring으로 제거)
const { id, cc_emails, ...updates } = body;
await supabase.from('quotes').update(updates).eq('id', id);
```

> **주의**: `cc_emails`는 DB에 컬럼이 없기 때문에 PUT 시 body에서 제거 후 update한다. CC는 발송 시에만 사용.

---

### 3-2. 견적 발송 — `app/api/quote/send/route.ts`

**처리 순서:**

1. `quoteId`로 견적 + 연결된 문의(inquiries) 조회
2. 고객 이메일 존재 여부 확인
3. `@react-pdf/renderer`의 `renderToBuffer`로 PDF 버퍼 생성
4. `sendQuoteEmail()`로 이메일 발송 (PDF 첨부 + HTML 본문)
5. 성공 시 `status: 'sent'`, `sent_at`, `client_response: 'pending'` 업데이트

```typescript
// PDF 생성
const rawBuffer = await renderToBuffer(
  buildQuoteDocument({
    quote,
    clientName: inquiry.name,
    clientCompany: inquiry.company,
    projectTitle: inquiry.project_title,
  })
);
pdfBuffer = Buffer.from(rawBuffer);

// 이메일 발송
const viewUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/quote/${quote.view_token}`;
const cc = ccEmails?.length ? ccEmails : undefined;
await sendQuoteEmail(inquiry.email, inquiry.name, pdfBuffer, viewUrl, quote, inquiry.company, inquiry.project_title, cc);

// DB 상태 업데이트
await supabase.from('quotes').update({
  status: 'sent',
  sent_at: new Date().toISOString(),
  client_response: 'pending',
}).eq('id', quoteId);
```

**에러 분리**: PDF 생성 실패와 이메일 발송 실패를 별도 try-catch로 분리하여 원인 파악이 용이하도록 처리.

---

### 3-3. 견적 조회 (고객용) — `app/api/quote/view/route.ts`

- **메서드**: GET
- **파라미터**: `?token={view_token}`
- **조건**: `view_token` 일치 + `status === 'sent'`인 행만 반환
- 문의 정보는 `inquiries(name, email, phone, company, services)` 조인

```typescript
const { data: quote } = await supabase
  .from('quotes')
  .select('*, inquiries(name, email, phone, company, services)')
  .eq('view_token', token)
  .eq('status', 'sent')
  .single();
```

---

### 3-4. 고객 응답 처리 — `app/api/quote/respond/route.ts`

- **메서드**: POST
- **파라미터**: `{ token, response, note? }`
- **response 유효값**: `'approved'` | `'revision_requested'` | `'rejected'`

**처리 흐름:**

1. `view_token`으로 견적 조회 (status: `sent`)
2. 이미 응답 완료(`client_response !== 'pending'`)면 400 반환
3. 응답 저장: `client_response`, `client_response_at`, `client_response_note`
4. 관리자에게 알림 이메일 발송 (견적 번호, 금액, 응답 유형, 메모)

```typescript
// 관리자 알림 메일 내용
subject: `[견적 ${responseLabel}] ${inquiry.name}님 (${inquiry.company || '개인'})`,
html: `
  <h2>견적서 응답이 도착했습니다</h2>
  <table>
    <tr><td>고객</td><td>${inquiry.name} (${inquiry.company})</td></tr>
    <tr><td>견적 번호</td><td>RS-${String(quote.id).padStart(6, '0')}</td></tr>
    <tr><td>견적 금액</td><td>${Number(quote.total_amount).toLocaleString()}원</td></tr>
    <tr><td>응답</td><td>${responseLabel}</td></tr>
  </table>
`
```

---

## 4. PDF 생성

### 구성 파일

| 파일 | 역할 |
|------|------|
| `lib/pdf-fonts.ts` | 나눔고딕 폰트 등록 (side-effect import) |
| `components/sections/QuoteDocument.tsx` | PDF 레이아웃 컴포넌트 |

### 폰트 등록 (`lib/pdf-fonts.ts`)

```typescript
import { Font } from '@react-pdf/renderer';
import path from 'path';

const fontsDir = path.join(process.cwd(), 'public', 'fonts');

Font.register({
  family: 'NanumGothic',
  fonts: [
    { src: path.join(fontsDir, 'NanumGothic-Regular.ttf'), fontWeight: 400 },
    { src: path.join(fontsDir, 'NanumGothic-Bold.ttf'),    fontWeight: 700 },
  ],
});

export const PDF_FONT_FAMILY = 'NanumGothic';
```

- 폰트 파일 위치: `public/fonts/NanumGothic-Regular.ttf`, `public/fonts/NanumGothic-Bold.ttf`
- `QuoteDocument.tsx` 상단에서 `import '@/lib/pdf-fonts'`로 side-effect 임포트

### PDF 문서 구조 (`QuoteDocument.tsx`)

| 섹션 | 내용 |
|------|------|
| **헤더** | REACT STUDIO 로고 + "견 적 서" 타이틀 + 문서번호 (RS-000001 형식) |
| **발행자 정보** | (주) 그리고 엔터테인먼트, 사업자등록번호, 업태/종목, 주소, 대표자명 |
| **프로젝트 제목** | 프로젝트명 표시 (있을 경우) |
| **수신/발행일/유효기간** | 고객 정보 + 날짜 정보 3열 카드 |
| **품목 테이블** | 품목명, 수량, 단가, 금액 (홀짝 행 교차 배경) |
| **합계** | 공급가액, 부가세(10%), 합계 (브랜드 컬러 강조) |
| **비고** | 좌측 오렌지 보더 박스 |
| **푸터** | 회사 정보 + 문서번호 |

**스타일 특징:**
- A4 사이즈, 50px 패딩
- `fontFamily: 'NanumGothic'` (한글 지원)
- 브랜드 컬러: `#FF4D00`
- 테이블 헤더: `#111111` 배경 + 흰색 텍스트

**금액 포맷 함수:**

```typescript
function formatKRW(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString('ko-KR') + '원';
}
```

---

## 5. 이메일 발송

### 설정 (`lib/email.ts`)

**SMTP 설정:**

```typescript
nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
```

- Gmail 앱 비밀번호 사용 (2단계 인증 필요)
- `getTransporter()` 팩토리 함수로 지연 초기화 (환경변수 누락 시 명확한 에러 메시지)

### 견적서 이메일 — `sendQuoteEmail()`

**함수 시그니처:**

```typescript
export async function sendQuoteEmail(
  to: string,           // 고객 이메일
  clientName: string,   // 고객 이름
  pdfBuffer: Buffer,    // PDF 바이너리
  viewUrl?: string,     // 온라인 응답 페이지 URL
  quote?: QuoteEmailData, // 견적 데이터 (본문 렌더링용)
  clientCompany?: string,
  projectTitle?: string,
  cc?: string[],        // CC 이메일 목록
)
```

**이메일 구성:**

| 항목 | 내용 |
|------|------|
| **발신자** | `"React Studio" <SMTP_USER>` |
| **제목** | `[React Studio] 견적서 - {프로젝트명} ({문서번호})` |
| **본문** | HTML — 견적서 전체 내용을 인라인 스타일로 렌더링 |
| **첨부파일** | `ReactStudio_견적서_RS-000001.pdf` |
| **CC** | 선택 사항, 관리자가 지정 |

**이메일 본문 HTML 구조:**

```
┌─────────────────────────────────────────┐
│ REACT STUDIO          견 적 서  No.RS-… │  ← 헤더
├─────────────────────────────────────────┤
│ [PROJECT]  프로젝트명                     │  ← 프로젝트 블록 (있을 경우)
├─────────────────────────────────────────┤
│ 수신: 홍길동님  │  발행일  │  유효기간    │  ← 정보 카드
├─────────────────────────────────────────┤
│ 품목 │ 수량 │ 단가  │ 금액              │  ← 품목 테이블
│ ─────┼──────┼───────┼──────             │
│ ...  │ ...  │ ...   │ ...               │
├─────────────────────────────────────────┤
│              공급가액  1,000,000원       │  ← 합계
│              부가세      100,000원       │
│              합계      1,100,000원       │
├─────────────────────────────────────────┤
│ 비고: ...                                │  ← 비고 (있을 경우)
├─────────────────────────────────────────┤
│ [온라인에서 견적 승인/응답하기] 버튼       │  ← CTA 버튼
├─────────────────────────────────────────┤
│ React Studio | (주) 그리고 엔터테인먼트    │  ← 푸터
└─────────────────────────────────────────┘
```

**이메일 본문 폰트:**

```css
font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif
```

> PDF는 나눔고딕 TTF를 사용하지만, HTML 이메일은 클라이언트 시스템 폰트에 의존한다.

### PDF 첨부 코드

```typescript
attachments: [
  {
    filename: `ReactStudio_견적서${docNumber ? `_${docNumber}` : ''}.pdf`,
    content: pdfBuffer,
    contentType: 'application/pdf',
  },
],
```

### 고객 응답 알림 이메일

고객이 온라인 페이지에서 응답(승인/수정요청/거절)하면, `app/api/quote/respond/route.ts`에서 관리자(`ADMIN_EMAIL`)에게 알림 메일 발송:

```typescript
transporter.sendMail({
  from: `"React Studio" <${process.env.SMTP_USER}>`,
  to: process.env.ADMIN_EMAIL,
  subject: `[견적 승인] 홍길동님 (회사명)`,
  html: `<h2>견적서 응답이 도착했습니다</h2><table>...</table>`,
});
```

---

## 6. 프론트엔드 페이지

### 6-1. 관리자 견적 작성 — `app/admin/quotes/[id]/page.tsx`

- **경로**: `/admin/quotes/{inquiry_id}`
- **기능**: 품목 추가/삭제, 금액 자동 계산, 저장, 이메일 발송, CC 입력

**금액 자동 계산:**

```typescript
function calcAmounts(items: QuoteItem[]) {
  const supply = items.reduce((sum, i) => sum + i.amount, 0);
  const vat = Math.round(supply * 0.1);
  return { supply_amount: supply, vat, total_amount: supply + vat };
}
```

**발송 플로우:**

```
sendQuote() → saveQuote() → (저장 성공?) → fetch('/api/quote/send') → 완료 메시지
```

- 발송 전 반드시 저장을 먼저 실행 (저장 실패 시 발송 중단)

**CC 이메일 입력:**

- 태그 형식 UI (Enter 또는 "추가" 버튼으로 추가)
- 이메일 형식 정규식 검증: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- 중복 방지

**고객 응답 상태 표시:**

- `pending`: 파란색 박스 "발송 완료 — 고객 응답 대기 중"
- `approved`: 초록색 "승인"
- `revision_requested`: 노란색 "수정 요청"
- `rejected`: 빨간색 "거절"

### 6-2. 고객 견적 열람 — `app/quote/[token]/page.tsx`

- **경로**: `/quote/{view_token}` (공개 페이지, 인증 불필요)
- **기능**: 견적서 내용 확인 + 응답(승인/수정요청/거절)

**응답 버튼:**

| 버튼 | 동작 |
|------|------|
| **승인합니다** (초록) | 즉시 `respond('approved')` |
| **수정 요청** (노란) | 첫 클릭 → 메모 입력폼 표시, 두 번째 클릭 → `respond('revision_requested')` |
| **거절** (회색) | 첫 클릭 → 메모 입력폼 표시, 두 번째 클릭 → `respond('rejected')` |

---

## 7. 한글 폰트 오류 및 해결

### 문제

`@react-pdf/renderer`의 기본 내장 폰트(Helvetica 등)는 한글을 지원하지 않아, PDF 생성 시 한글 텍스트가 **깨지거나 빈칸으로 표시**되는 문제가 발생했다.

추가로 Vercel 서버리스 환경에는 Chromium이 없기 때문에, Puppeteer 기반 PDF 생성은 사용할 수 없었다.

### 해결

1. **`@react-pdf/renderer` 채택**: Chromium 없이 순수 JavaScript로 PDF를 생성하는 라이브러리를 사용하여 Vercel 호환성 확보

2. **나눔고딕 TTF 파일 번들링**: `public/fonts/` 디렉토리에 TTF 폰트 파일 배치
   - `public/fonts/NanumGothic-Regular.ttf` (400)
   - `public/fonts/NanumGothic-Bold.ttf` (700)

3. **폰트 등록 모듈 (`lib/pdf-fonts.ts`)**: `Font.register()`로 나눔고딕 등록, 로컬 파일 경로 사용 (`path.join(process.cwd(), 'public', 'fonts', ...)`)

4. **PDF 컴포넌트 적용**: `QuoteDocument.tsx`의 `StyleSheet`에서 `fontFamily: 'NanumGothic'` 설정

### 변경 이력 (초기 → 최종)

| 단계 | 상태 |
|------|------|
| 초기 | 기본 폰트(Helvetica) → 한글 깨짐 |
| 1차 시도 | Google Fonts CDN URL로 등록 → Vercel에서 네트워크 지연/실패 가능성 |
| 최종 | 로컬 TTF 파일(`public/fonts/`)로 등록 → 안정적 |

---

## 8. 과거 발생 오류 및 해결 이력

### 8-1. PDF 한글 깨짐

- **원인**: 기본 폰트(Helvetica)로 한글 미지원
- **해결**: NanumGothic TTF 등록 + 문서 컴포넌트 폰트 지정
- **관련 파일**: `lib/pdf-fonts.ts`, `components/sections/QuoteDocument.tsx`

### 8-2. 견적/계약 저장 시 500 오류 (`cc_emails` 컬럼 부재)

- **원인**: 프론트에서 `cc_emails`를 body에 포함하여 API로 전송 → DB에 해당 컬럼이 없어 insert/update 실패
- **해결**: POST/PUT에서 `cc_emails`를 destructuring으로 제거, CC는 발송 API(`/api/quote/send`) 요청 body로만 전달

```typescript
// PUT에서 cc_emails 제거
const { id, cc_emails, ...updates } = body;
await supabase.from('quotes').update(updates).eq('id', id);
```

### 8-3. 견적 발송 시 500 오류 (inquiry_id 유실)

- **원인**: 수정 모드에서 저장 실패를 무시하고 발송 시도 + 리다이렉트 후 `inquiry_id`가 URL에서 사라짐
- **해결**: `saveQuote()` 실패 시 발송 중단, `savedQuoteId` state로 ID 유지

### 8-4. 이메일 발송 실패 (SMTP 미설정)

- **원인**: `.env.local`에 `SMTP_USER`/`SMTP_PASS` 환경변수 없음
- **해결**: Gmail 앱 비밀번호 발급 후 환경변수 설정, `getTransporter()` 지연 초기화로 환경변수 누락 시 명확한 에러 메시지 반환

```typescript
if (!user || !pass) {
  throw new Error(`SMTP 환경변수 누락: ${!user ? 'SMTP_USER' : ''} ${!pass ? 'SMTP_PASS' : ''}`);
}
```

### 8-5. `formatKRW` / `items` null 방어 부재

- **원인**: `quote.items`가 null/undefined일 수 있는데 직접 `.map()` 호출
- **해결**: `(quote.items ?? []).map(...)`, `formatKRW`에 `(amount ?? 0)` nullish coalescing 추가

### 8-6. 문의 API 500 오류 (스키마 불일치)

- **원인**: `inquiries` 테이블에 `description`/`reference_urls` 컬럼 부재 상태에서 insert 시도
- **해결**: Supabase에 컬럼 추가 (기존 `reference_url` 유지, `reference_urls` 배열 컬럼 신규)

---

## 9. 환경변수

| 변수명 | 용도 | 예시 |
|--------|------|------|
| `SMTP_USER` | Gmail 발신 계정 | `react.studio.kr@gmail.com` |
| `SMTP_PASS` | Gmail 앱 비밀번호 | `xxxx xxxx xxxx xxxx` |
| `SMTP_HOST` | SMTP 호스트 (기본값: `smtp.gmail.com`) | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP 포트 (기본값: `587`) | `587` |
| `ADMIN_EMAIL` | 관리자 알림 수신 이메일 | `admin@reactstudio.kr` |
| `NEXT_PUBLIC_SITE_URL` | 사이트 기본 URL (고객 페이지 링크 생성용) | `https://www.reactstudio.kr` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (서버 전용) | - |

---

## 10. 파일 구조 요약

```
reactstudio/
├── app/
│   ├── api/quote/
│   │   ├── route.ts           # 견적 생성(POST) / 수정(PUT)
│   │   ├── send/route.ts      # PDF 생성 + 이메일 발송
│   │   ├── view/route.ts      # 고객용 견적 조회 (view_token)
│   │   └── respond/route.ts   # 고객 응답 처리 + 관리자 알림
│   ├── admin/quotes/
│   │   └── [id]/page.tsx      # 관리자 견적 작성/편집 페이지
│   └── quote/
│       └── [token]/page.tsx   # 고객 견적 열람 + 응답 페이지
├── components/sections/
│   └── QuoteDocument.tsx      # PDF 레이아웃 (@react-pdf/renderer)
├── lib/
│   ├── email.ts               # nodemailer 설정 + sendQuoteEmail()
│   ├── pdf-fonts.ts           # 나눔고딕 폰트 등록
│   └── supabase.ts            # Supabase 클라이언트
├── public/fonts/
│   ├── NanumGothic-Regular.ttf
│   └── NanumGothic-Bold.ttf
└── types/
    └── index.ts               # Quote, QuoteItem 타입 정의
```

---

*마지막 업데이트: 2026-04-15*
