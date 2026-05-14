# Google Apps Script Email Deployment Guide

Grigoent 이메일 시스템의 Google Apps Script 배포 가이드입니다.

## 배포 방법

### 1. Apps Script 프로젝트 생성

1. [script.google.com](https://script.google.com) 접속
2. **새 프로젝트** 클릭
3. 프로젝트 이름을 `Grigoent Email Service`로 변경

### 2. 코드 복사

1. `send-email.gs` 파일의 전체 내용을 복사
2. Apps Script 에디터의 `Code.gs` 파일에 붙여넣기
3. 저장 (Ctrl+S)

### 3. 스크립트 속성 설정

1. 좌측 메뉴에서 **프로젝트 설정** (톱니바퀴 아이콘) 클릭
2. 스크립트 속성 섹션에서 **스크립트 속성 추가** 클릭
3. 다음 속성들을 추가:

| 속성 이름 | 값 | 설명 |
|---|---|---|
| `TEST_RECIPIENT` | `tommy0621@naver.com` | 테스트 모드에서 사용할 이메일 |
| `DANCERSBIO_URL` | `https://dancers-bio.vercel.app` | DancersBio 플랫폼 URL |
| `SAFE_MODE` | (비워두기) | 비어있으면 테스트 모드. `APPROVED_BY_CEO` 입력 시 실제 발송 |

### 4. 웹 앱으로 배포

1. 상단 메뉴에서 **배포** > **새 배포** 클릭
2. **유형 선택** 옆 톱니바퀴 클릭 > **웹 앱** 선택
3. 설정:
   - **설명**: `Grigoent Email v1.0`
   - **다음 사용자 인증 정보로 실행**: 나 (본인 계정)
   - **액세스 권한이 있는 사용자**: **모든 사용자**
4. **배포** 클릭
5. Gmail 권한 승인 요청이 나오면 승인
6. **배포 URL** 복사 (형식: `https://script.google.com/macros/s/SCRIPT_ID/exec`)

### 5. 환경 변수 설정

복사한 배포 URL을 `.env.email` 파일에 추가:

```
APPSCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## 테스트 방법

### Apps Script 에디터에서 직접 테스트

1. `testWelcomeEmail` 또는 `testProjectEmail` 함수 선택
2. **실행** 클릭
3. **실행 로그**에서 결과 확인

### Node.js에서 테스트

```bash
# .env.email 설정 후
node -e "
require('dotenv').config({ path: '.env.email' });
const { sendEmailViaAppScript } = require('./emails/appscript/caller');
sendEmailViaAppScript({
  type: 'welcome',
  to: 'test@example.com',
  data: { name: '테스트' }
}).then(console.log).catch(console.error);
"
```

### cURL로 테스트

```bash
curl -X POST "YOUR_DEPLOYED_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"welcome","to":"test@example.com","data":{"name":"테스트 댄서"}}'
```

## 버전 업데이트

코드 수정 후 재배포할 때:

1. **배포** > **배포 관리** 클릭
2. 기존 배포 옆 **연필** 아이콘 클릭
3. **버전** 드롭다운에서 **새 버전** 선택
4. **배포** 클릭

> URL은 동일하게 유지됩니다.

## 주의사항

- **SAFE_MODE 해제**: `SAFE_MODE` 속성을 `APPROVED_BY_CEO`로 설정해야 실제 수신자에게 발송됩니다
- **할당량**: Gmail 일일 발송 한도 (무료: 100통, Workspace: 1,500통)
- **권한**: 최초 배포 시 Gmail 접근 권한 승인 필요

## 문제 해결

### "권한이 필요합니다" 오류
- 배포 시 "모든 사용자" 액세스로 설정했는지 확인

### 이메일이 발송되지 않음
- Apps Script 실행 로그 확인
- Gmail 할당량 초과 여부 확인
- SAFE_MODE 설정 확인 (테스트 모드에서는 TEST_RECIPIENT로만 발송)

### "Invalid JSON" 오류
- POST 요청의 Content-Type이 `application/json`인지 확인
- JSON 형식이 올바른지 확인
