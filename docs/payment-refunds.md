# grigoent 결제 환불 실행기

grigoent는 트레이닝 상품 결제의 원천 시스템이며 실제 판매 주문은 deetz 통합 결제 장부에서 승인된 취소·환불 명령만 실행한다.

관리자 화면의 기존 직접 환불 API는 중단했으며 `/api/admin/training-orders/refund`는 deetz 통합 결제 장부를 안내한다.

`payment-test` 상품의 1,000원 이하 전액환불은 기존 제한형 점검 경로를 유지하며 실제 판매 주문에는 사용할 수 없다.

## 내부 명령 API

deetz는 `POST /api/internal/payment-operations`로 명령을 보낸다.

요청 본문과 밀리초 타임스탬프를 `${timestamp}.${rawBody}` 형태로 묶어 HMAC-SHA256 서명을 만든다.

grigoent는 `x-payment-timestamp`, `x-payment-signature`를 확인하고 5분이 지난 요청을 거부한다.

`PAYMENT_COMMAND_SECRET`은 32자 이상이어야 하며 두 앱에 같은 값을 등록한다.

명령 본문의 `executionMode`가 `two_person`이면 요청자와 승인자가 달라야 한다.

`executionMode=direct`는 deetz 서버의 직접 실행 허용 목록을 통과한 명령이며 요청자와 승인자가 동일하고 모두 존재할 때만 받는다.

실행 방식과 두 실행자 ID는 `training_payment_refunds`에 함께 저장한다.

## 환불 원장

`training_payment_refunds`는 부분환불을 포함한 모든 PG 환불을 건별로 보관한다.

원결제인 `training_order_payments.amount`와 `raw`는 환불 후에도 수정하지 않는다.

순납부액은 승인된 원결제 합계에서 완료된 환불 원장 합계를 빼서 계산한다.

Toss에는 통제 원장의 작업 ID를 `Idempotency-Key`로 전달한다.

PayPal에는 같은 작업 ID를 `PayPal-Request-Id`로 전달한다.

PayPal 부분환불은 원장 원화 금액을 원승인 외화 금액에 비례해 계산하며 마지막 전액환불은 남은 PG 잔액을 사용한다.

## 상태 처리

- `completed`는 PG가 환불 완료를 명시한 상태다.

- `pending`은 PG가 요청을 접수했지만 완료되지 않은 상태다.

- `reconciliation_required`는 네트워크 오류나 PG 잔액 불일치로 결과를 단정할 수 없는 상태다.

- `failed`는 PG가 환불 실패를 명시한 상태다.

`pending`과 `reconciliation_required`는 새 환불을 막는다.

같은 작업 ID를 다시 보내면 새 PG 요청을 만들지 않고 기존 원장을 반환한다.

PG 완료 뒤 결제·주문 상태 반영이 실패하면 원장을 `reconciliation_required`로 되돌리고 재대사 때 내부 상태 반영을 다시 수행한다.

여러 토스 부분환불은 `lastTransactionKey`로 이번 거래를 식별하며, 거래 ID 없이 같은 금액과 사유가 여러 건이면 자동 확정하지 않는다.

## 결제 전 취소

`pending` 또는 `failed` 결제만 취소할 수 있다.

Toss 주문이나 PayPal 주문이 이미 승인된 것으로 확인되면 취소를 거부하고 환불 절차를 안내한다.

취소된 주문은 이후 Toss confirm과 PayPal capture 요청을 차단한다.

## 검증 명령

```text
npm run typecheck:payment-refunds
npm run test:payment-refunds
npm run build
```
