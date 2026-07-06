import { NextRequest, NextResponse } from 'next/server'

// 평판/미수·정산 제보는 deetz(에이전시 플랫폼)로 데이터 일원화 — deetz DB `fee_payment_reports`에 적재.
// 이 라우트는 deetz 접수 API로 서버-서버 위임(프록시)만 한다.
const DEETZ_API_BASE = process.env.DEETZ_API_BASE || 'https://www.deetz.kr'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const res = await fetch(`${DEETZ_API_BASE}/api/fee-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'proxy_error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
