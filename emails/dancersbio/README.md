# DancersBio Email System

그리고 엔터테인먼트 -> DancersBio 온보딩 및 프로젝트 알림 이메일 시스템입니다.

## 이메일 종류

| 타입 | 파일 | 설명 | 사용 시점 |
|---|---|---|---|
| `dancersbio-invite` | `send-invite.js` | 온보딩/웰컴 메일 | 댄서 프로필이 DancersBio에 등록될 때 |
| `project-notification` | `send-project-notification.js` | 프로젝트 알림 | 새 프로젝트 모집 시작 시 |

## 빠른 시작

### 1. 환경 변수 설정

`.env.email` 파일을 생성하고 다음 변수를 설정합니다:

```bash
# 이메일 발송 방식 선택 (기본값: appscript)
EMAIL_MODE=appscript

# AppScript 방식 (권장)
APPSCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# SMTP 방식 (대안)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASS=your-16-char-app-password
EMAIL_FROM_NAME=그리고 엔터테인먼트

# DancersBio URL
DANCERSBIO_URL=https://dancers-bio.vercel.app

# 안전 설정 (기본: SAFE MODE 활성화)
TEST_RECIPIENT=tommy0621@naver.com
EMAIL_SAFE_MODE=  # 비워두면 SAFE MODE, "APPROVED_BY_CEO"면 실제 발송
```

### 2. 단일 이메일 발송

```javascript
const { sendDancersBioInvite } = require('./emails/dancersbio/send-invite');
const { sendProjectNotification } = require('./emails/dancersbio/send-project-notification');

// 온보딩 메일
await sendDancersBioInvite({
  email: 'dancer@example.com',
  name: '홍길동',
  profileUrl: 'https://dancers-bio.vercel.app/dancers/abc123'
});

// 프로젝트 알림 메일
await sendProjectNotification(
  { email: 'dancer@example.com', name: '홍길동' },
  {
    projectName: '2024 Summer MV 촬영',
    description: '인기 아이돌 그룹의 신곡 MV 백댄서 모집',
    deadline: '2024년 8월 15일',
    projectUrl: 'https://dancers-bio.vercel.app/projects/xyz789'
  }
);
```

### 3. 배치 발송 (dancer_applications 테이블)

```bash
# 테스트 이메일 발송 (tommy0621@naver.com으로)
node scripts/send-dancersbio-invites.js --test

# 발송 대상 미리보기 (dry run)
node scripts/send-dancersbio-invites.js --dry-run --status=approved --limit=10

# 실제 발송 (SAFE_MODE가 기본 활성화 상태라 테스트 수신자에게만 발송됨)
node scripts/send-dancersbio-invites.js --status=approved --limit=5 --delay=1000
```

## 안전 장치 (SAFE MODE)

**기본적으로 모든 이메일은 테스트 수신자(`tommy0621@naver.com`)에게만 발송됩니다.**

실제 수신자에게 발송하려면 환경 변수에 다음을 설정해야 합니다:

```bash
EMAIL_SAFE_MODE=APPROVED_BY_CEO
```

**주의**: 이 값을 설정하기 전에 반드시 CEO/책임자의 승인을 받으세요.

## 파일 구조

```
emails/
├── dancersbio/
│   ├── README.md                    # 이 문서
│   ├── send-invite.js               # 온보딩 메일 모듈
│   └── send-project-notification.js # 프로젝트 알림 모듈
├── templates/
│   ├── dancersbio-invite.html       # 온보딩 메일 HTML
│   └── project-notification.html    # 프로젝트 알림 HTML
├── smtp/                            # 기존 SMTP 모듈
├── appscript/                       # 기존 AppScript 모듈
└── README.md                        # 전체 이메일 시스템 문서

scripts/
└── send-dancersbio-invites.js       # 배치 발송 스크립트
```

## HTML 템플릿

모노톤 디자인의 반응형 이메일 템플릿이 `templates/` 디렉토리에 있습니다.

- 600px 최대 너비
- Apple SD Gothic Neo / Malgun Gothic 폰트
- 모바일 대응 (viewport meta)
- 단색 (#000, #424242, #757575) 색상 체계
- 수신거부 링크 포함

### 템플릿 변수

**dancersbio-invite.html:**
- `{{name}}` - 수신자 이름
- `{{profile_url}}` - 프로필 페이지 URL

**project-notification.html:**
- `{{name}}` - 수신자 이름
- `{{project_name}}` - 프로젝트 제목
- `{{description}}` - 프로젝트 설명
- `{{deadline}}` - 마감일
- `{{project_url}}` - 프로젝트 상세 페이지 URL

## 배치 스크립트 옵션

```
node scripts/send-dancersbio-invites.js [options]

Options:
  --test              테스트 이메일 1통 발송 (TEST_RECIPIENT로)
  --dry-run           실제 발송 없이 대상자 목록만 출력
  --status=<status>   review_status로 필터링 (예: approved, pending)
  --limit=<n>         최대 발송 건수 제한
  --delay=<ms>        이메일 간 딜레이 (기본: 500ms)
  --help, -h          도움말 출력
```

## 환경 변수 전체 목록

| 변수명 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `EMAIL_MODE` | - | `appscript` | 발송 방식: `appscript` 또는 `smtp` |
| `APPSCRIPT_WEBHOOK_URL` | appscript 모드 | - | Google Apps Script Web App URL |
| `EMAIL_SMTP_HOST` | smtp 모드 | `smtp.gmail.com` | SMTP 서버 호스트 |
| `EMAIL_SMTP_PORT` | smtp 모드 | `587` | SMTP 포트 |
| `EMAIL_SMTP_USER` | smtp 모드 | - | Gmail 주소 |
| `EMAIL_SMTP_PASS` | smtp 모드 | - | Gmail App Password |
| `EMAIL_FROM_NAME` | - | `그리고 엔터테인먼트` | 발신자 표시 이름 |
| `DANCERSBIO_URL` | - | `https://dancers-bio.vercel.app` | DancersBio URL |
| `TEST_RECIPIENT` | - | `tommy0621@naver.com` | 테스트 수신자 |
| `EMAIL_SAFE_MODE` | - | (비어있음 = SAFE) | `APPROVED_BY_CEO`면 실제 발송 |
| `GRIGOENT_SUPABASE_URL` | 배치 발송 시 | - | Grigoent Supabase URL |
| `GRIGOENT_SUPABASE_ANON_KEY` | 배치 발송 시 | - | Grigoent Supabase anon key |

## 의존성

```json
{
  "nodemailer": "^8.0.5",
  "dotenv": "^17.4.2",
  "@supabase/supabase-js": "^2.52.0"
}
```

모두 이미 `package.json`에 포함되어 있습니다.

## 트러블슈팅

### AppScript 요청 실패
- `APPSCRIPT_WEBHOOK_URL`이 올바른지 확인
- Apps Script가 Web App으로 배포되었는지 확인
- 배포 시 "누구나 접근 가능"으로 설정했는지 확인

### SMTP 인증 실패
- 2단계 인증이 활성화되어 있는지 확인
- App Password가 올바른지 확인 (16자리, 공백 없이)
- Gmail 보안 설정에서 "보안 수준이 낮은 앱"이 차단되어 있을 수 있음

### Supabase 연결 실패
- 환경 변수명이 정확한지 확인
- Supabase URL이 `https://xxx.supabase.co` 형식인지 확인
- anon key가 올바른지 확인
