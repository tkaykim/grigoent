// 토스페이먼츠 키 선택 — 테스트/라이브 전환 스위치.
//
// 라이브 키는 미리 넣어두되, 카드사 심사가 끝나기 전에는 실결제가 열리지 않아야 한다.
// (승인된 카드사가 없는 상태로 라이브를 켜면 결제창에서 그대로 실패한다.)
// 전환은 NEXT_PUBLIC_TOSS_USE_LIVE 를 'true' 로 바꾸고 재배포하면 끝난다.
//
// ⚠️ 키 종류 주의: 우리 결제는 payment.requestPayment() 방식이라
//    "API 개별 연동 키"(live_ck_ / live_sk_)만 동작한다.
//    "주문서형·결제창형 연동 키"(live_gck_ / live_gsk_)를 넣으면
//    "API 개별 연동 키의 클라이언트 키로 SDK를 연동해주세요" 오류가 난다.
//    API 개별 연동 키는 상점아이디(MID)별로 다르며 우리 MID 는 gtrain4o8d 다.

export const TOSS_USE_LIVE = process.env.NEXT_PUBLIC_TOSS_USE_LIVE === 'true'

// 브라우저에서 읽어야 하므로 두 값 모두 NEXT_PUBLIC_ 이어야 한다.
export function tossClientKey(): string | undefined {
  return TOSS_USE_LIVE
    ? process.env.NEXT_PUBLIC_TOSS_LIVE_CLIENT_KEY || process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
    : process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
}

// 서버 전용. 승인 전에는 테스트 시크릿을 그대로 쓴다.
export function tossSecretKey(): string | undefined {
  return TOSS_USE_LIVE
    ? process.env.TOSS_LIVE_SECRET_KEY || process.env.TOSS_SECRET_KEY
    : process.env.TOSS_SECRET_KEY
}
