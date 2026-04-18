# 미수·정산 제보 이메일 웹훅 (`unpaid_fee_report`)

제보가 DB에 저장된 뒤, 클라이언트가 `/api/email-webhook`으로 다음 형태의 JSON을 한 번 더 보냅니다.

```json
{
  "type": "unpaid_fee_report",
  "work_categories": ["choreography", "performance"],
  "client_type": "company",
  "amount_note": "…",
  "pay_type_note": "…",
  "reporter_name": "…",
  "reporter_contact": "…",
  "reporter_instagram": "아이디만(@ 없이)",
  "summary": "상대방·채권 정보 앞부분 최대 500자"
}
```

Google Apps Script(또는 수신 서버)에서 `type === 'unpaid_fee_report'`일 때

- 메일 제목에 `[미수제보]` 등 구분 접두사를 붙이고
- 본문에 `summary`, `amount_note`, `pay_type_note`, `work_categories`, `client_type`, 제보자 이름·연락처·인스타그램을 나열 (대외 공개용이 아님)

하도록 분기하면 운영 알림을 분리할 수 있습니다. 기존 `contact` 타입 처리는 그대로 두면 됩니다.
