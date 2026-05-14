# Grigoent Email System

그리고 엔터테인먼트 -> DancersBio 온보딩 이메일 시스템입니다.

## 이메일 종류

| 타입 | 설명 | 사용 시점 |
|---|---|---|
| `welcome` | 웰컴 메일 | 댄서 지원 승인 후 |
| `project` | 프로젝트 알림 | 새 프로젝트 등록 시 |

## 발송 방법

### 1. SMTP (Nodemailer)

서버에서 직접 SMTP로 발송합니다. Gmail App Password 필요.

```javascript
const { sendEmail } = require('./emails/smtp/send-email');

await sendEmail({
  type: 'welcome',
  to: 'dancer@example.com',
  data: { name: '홍길동' }
});

await sendEmail({
  type: 'project',
  to: 'dancer@example.com',
  data: {
    name: '홍길동',
    project_title: '2024 여름 쇼케이스',
    project_date: '2024년 8월 15일 (목) 14:00',
    project_location: '서울 홍대',
    positions: 'Street Dance 2명',
    project_description: '여름 시즌 쇼케이스 공연입니다.'
  }
});
```

### 2. Google Apps Script

Apps Script Web App을 통해 발송합니다. 서버 SMTP 설정 없이 Gmail 계정으로 발송 가능.

```javascript
const { sendEmailViaAppScript } = require('./emails/appscript/caller');

await sendEmailViaAppScript({
  type: 'welcome',
  to: 'dancer@example.com',
  data: { name: '홍길동' }
});
```

## 설정

### 환경 변수

`.env.email.example`을 `.env.email`로 복사하고 값을 채웁니다:

```bash
cp .env.email.example .env.email
```

### Gmail App Password 생성

1. Google 계정에서 2단계 인증 활성화
2. https://myaccount.google.com/apppasswords 접속
3. 앱: "메일", 기기: "기타(맞춤 이름)" 선택
4. 이름 입력 (예: "Grigoent Email")
5. 생성된 16자리 비밀번호를 `EMAIL_SMTP_PASS`에 입력

## 테스트

```bash
# 웰컴 메일 테스트
node emails/test/test-send.js welcome

# 프로젝트 알림 테스트
node emails/test/test-send.js project
```

## 안전 장치 (SAFE MODE)

**기본적으로 모든 이메일은 `TEST_RECIPIENT`로만 발송됩니다.**

실제 수신자에게 발송하려면:

```bash
# .env.email
EMAIL_SAFE_MODE=APPROVED_BY_CEO
```

> 프로덕션 발송은 CEO 승인 후에만 활성화하세요.

## 파일 구조

```
emails/
├── README.md           # 이 문서
├── smtp/
│   ├── send-email.js   # SMTP 발송 모듈 (Nodemailer)
│   └── config.js       # SMTP 설정 헬퍼
├── appscript/
│   ├── send-email.gs   # Google Apps Script 코드
│   ├── caller.js       # Node.js에서 AppScript 호출
│   └── README.md       # AppScript 배포 가이드
└── test/
    └── test-send.js    # 테스트 스크립트
```

## HTML 템플릿

모노톤 디자인의 반응형 이메일 템플릿이 코드에 인라인으로 포함되어 있습니다.

- 600px 최대 너비
- Noto Sans KR 폰트
- 모바일 대응 (viewport meta)
- 단색 (#111, #333, #999) 색상 체계

## 의존성

```json
{
  "nodemailer": "^8.0.5",
  "dotenv": "^16.0.0"
}
```

> `nodemailer`는 이미 package.json에 포함되어 있습니다. `dotenv`만 추가 설치하면 됩니다.

```bash
npm install dotenv
```
