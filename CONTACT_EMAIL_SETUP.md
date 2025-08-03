# Contact Form Email Setup Guide

## Google Apps Script 설정

### 1. Google Apps Script 프로젝트 생성
1. [Google Apps Script](https://script.google.com/)에 접속
2. "새 프로젝트" 클릭
3. 프로젝트 이름을 "Contact Form Webhook"으로 설정

### 2. 코드 복사
`google-apps-script.gs` 파일의 내용을 Google Apps Script 편집기에 복사

### 3. 배포 설정
1. "배포" > "새 배포" 클릭
2. "유형 선택" > "웹 앱" 선택
3. 설정:
   - **실행할 사용자**: "나" 선택
   - **액세스 권한**: "모든 사용자" 선택
4. "배포" 클릭

### 4. 웹 앱 URL 복사
배포 후 생성된 웹 앱 URL을 복사 (예: `https://script.google.com/macros/s/SCRIPT_ID/exec`)

## 환경 변수 설정

### 1. .env.local 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 2. Vercel 환경 변수 설정 (배포용)
1. Vercel 대시보드에서 프로젝트 선택
2. "Settings" > "Environment Variables" 이동
3. 다음 변수 추가:
   - **Name**: `NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL`
   - **Value**: Google Apps Script 웹 앱 URL
   - **Environment**: Production, Preview, Development 모두 선택

## 테스트

### 1. 웹훅 테스트
브라우저에서 Google Apps Script URL에 접속하여 다음 메시지가 나오는지 확인:
```json
{
  "message": "Contact form webhook is active",
  "timestamp": "..."
}
```

### 2. 문의 폼 테스트
1. 웹사이트의 Contact 섹션에서 문의 폼 작성
2. 제출 후 다음 확인:
   - 성공 메시지 표시
   - Gmail로 문의 이메일 수신
   - 데이터베이스에 문의 저장

## 문제 해결

### 이메일이 수신되지 않는 경우
1. Google Apps Script 로그 확인
2. Gmail 설정에서 스팸 필터 확인
3. 웹훅 URL이 올바른지 확인

### 권한 오류가 발생하는 경우
1. Google Apps Script에서 Gmail API 권한 확인
2. 배포 설정에서 "실행할 사용자"를 올바르게 설정했는지 확인

## 보안 고려사항

1. **CORS 설정**: Google Apps Script에서 특정 도메인만 허용하도록 설정
2. **요청 검증**: 추가적인 보안 검증 로직 구현 고려
3. **Rate Limiting**: 과도한 요청 방지 로직 추가 고려 