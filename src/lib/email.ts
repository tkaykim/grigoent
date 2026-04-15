import nodemailer from 'nodemailer'
import type { QuoteItem } from './types'

export interface QuoteEmailData {
  id: string
  items: QuoteItem[]
  supply_amount: number
  vat: number
  total_amount: number
  valid_until: string
  notes: string
}

function getTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    throw new Error(
      `SMTP 환경변수 누락: ${!user ? 'SMTP_USER ' : ''}${!pass ? 'SMTP_PASS' : ''}`
    )
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  })
}

function formatKRW(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString('ko-KR') + '원'
}

function getDocNumber(id: string): string {
  const numericPart = id.replace(/\D/g, '').slice(-6)
  return `GE-${numericPart.padStart(6, '0')}`
}

export async function sendQuoteEmail(
  to: string,
  clientName: string,
  pdfBuffer: Buffer,
  viewUrl: string,
  quote: QuoteEmailData,
  clientCompany?: string,
  projectTitle?: string,
  cc?: string[]
) {
  const transporter = getTransporter()
  const docNumber = getDocNumber(quote.id)

  const itemRows = (quote.items ?? [])
    .map(
      (item, i) => `
    <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px;">${item.category || ''}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px;">${item.name}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: center; font-size: 14px;">${item.qty}${item.unit || ''}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: right; font-size: 14px;">${formatKRW(item.unit_price)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: right; font-size: 14px; font-weight: 600;">${formatKRW(item.amount)}</td>
    </tr>`
    )
    .join('')

  const projectBlock = projectTitle
    ? `<div style="margin: 20px 0; padding: 14px 20px; background: #f8f8f8; border-left: 4px solid #111; border-radius: 4px;">
        <span style="font-size: 12px; color: #888; letter-spacing: 1px;">PROJECT</span>
        <div style="font-size: 16px; font-weight: 700; margin-top: 4px;">${projectTitle}</div>
      </div>`
    : ''

  const notesBlock = quote.notes
    ? `<div style="margin: 20px 0; padding: 14px 20px; background: #fffaf0; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <div style="font-size: 12px; color: #888; margin-bottom: 6px;">비고</div>
        <div style="font-size: 14px; white-space: pre-wrap;">${quote.notes}</div>
      </div>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; background: #f4f4f4; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
<div style="max-width: 680px; margin: 0 auto; background: #ffffff;">
  <!-- 헤더 -->
  <div style="padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #111;">
    <div>
      <div style="font-size: 20px; font-weight: 800; letter-spacing: 1px;">그리고 엔터테인먼트</div>
      <div style="font-size: 12px; color: #888; margin-top: 2px;">GRIGO Entertainment</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 22px; font-weight: 300; letter-spacing: 8px; color: #333;">견 적 서</div>
      <div style="font-size: 12px; color: #888; margin-top: 4px;">No. ${docNumber}</div>
    </div>
  </div>

  <div style="padding: 30px 40px;">
    ${projectBlock}

    <!-- 정보 카드 -->
    <table style="width: 100%; margin: 20px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width: 33%; padding: 14px 16px; background: #f8f8f8; border-radius: 6px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">수신</div>
          <div style="font-size: 15px; font-weight: 700;">${clientName}님${clientCompany ? ` (${clientCompany})` : ''}</div>
        </td>
        <td style="width: 4%;"></td>
        <td style="width: 30%; padding: 14px 16px; background: #f8f8f8; border-radius: 6px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">발행일</div>
          <div style="font-size: 15px; font-weight: 700;">${new Date().toLocaleDateString('ko-KR')}</div>
        </td>
        <td style="width: 3%;"></td>
        <td style="width: 30%; padding: 14px 16px; background: #f8f8f8; border-radius: 6px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 4px;">유효기간</div>
          <div style="font-size: 15px; font-weight: 700;">${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('ko-KR') : '-'}</div>
        </td>
      </tr>
    </table>

    <!-- 품목 테이블 -->
    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;" cellpadding="0" cellspacing="0">
      <thead>
        <tr style="background: #111;">
          <th style="padding: 12px; color: #fff; text-align: left; font-size: 13px; font-weight: 600;">카테고리</th>
          <th style="padding: 12px; color: #fff; text-align: left; font-size: 13px; font-weight: 600;">품목</th>
          <th style="padding: 12px; color: #fff; text-align: center; font-size: 13px; font-weight: 600;">수량</th>
          <th style="padding: 12px; color: #fff; text-align: right; font-size: 13px; font-weight: 600;">단가</th>
          <th style="padding: 12px; color: #fff; text-align: right; font-size: 13px; font-weight: 600;">금액</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- 합계 -->
    <table style="width: 100%; margin: 0 0 24px;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width: 60%;"></td>
        <td style="padding: 8px 16px; text-align: right; font-size: 14px; color: #666;">공급가액</td>
        <td style="padding: 8px 16px; text-align: right; font-size: 14px;">${formatKRW(quote.supply_amount)}</td>
      </tr>
      <tr>
        <td></td>
        <td style="padding: 8px 16px; text-align: right; font-size: 14px; color: #666;">부가세 (10%)</td>
        <td style="padding: 8px 16px; text-align: right; font-size: 14px;">${formatKRW(quote.vat)}</td>
      </tr>
      <tr style="border-top: 2px solid #111;">
        <td></td>
        <td style="padding: 12px 16px; text-align: right; font-size: 16px; font-weight: 800;">합계</td>
        <td style="padding: 12px 16px; text-align: right; font-size: 18px; font-weight: 800; color: #111;">${formatKRW(quote.total_amount)}</td>
      </tr>
    </table>

    ${notesBlock}

    <!-- CTA 버튼 -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${viewUrl}" style="display: inline-block; padding: 14px 40px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 1px;">
        온라인에서 견적 승인/응답하기
      </a>
    </div>
  </div>

  <!-- 푸터 -->
  <div style="padding: 20px 40px; background: #f8f8f8; border-top: 1px solid #eee; text-align: center;">
    <div style="font-size: 13px; font-weight: 700;">그리고 엔터테인먼트 | GRIGO Entertainment</div>
    <div style="font-size: 11px; color: #888; margin-top: 4px;">(주) 그리고 엔터테인먼트 | ${docNumber}</div>
  </div>
</div>
</body>
</html>`

  await transporter.sendMail({
    from: `"그리고 엔터테인먼트" <${process.env.SMTP_USER}>`,
    to,
    cc: cc?.length ? cc : undefined,
    subject: `[그리고 엔터테인먼트] 견적서 - ${projectTitle || '프로젝트'} (${docNumber})`,
    html,
    attachments: [
      {
        filename: `그리고엔터_견적서${docNumber ? `_${docNumber}` : ''}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}

export async function sendQuoteResponseNotification(
  quoteId: string,
  clientName: string,
  clientCompany: string | undefined,
  totalAmount: number,
  response: string,
  note?: string
) {
  const transporter = getTransporter()
  const adminEmail = process.env.ADMIN_EMAIL

  if (!adminEmail) {
    console.error('ADMIN_EMAIL 환경변수가 설정되지 않았습니다.')
    return
  }

  const responseLabels: Record<string, string> = {
    approved: '승인',
    revision_requested: '수정 요청',
    rejected: '거절',
  }
  const responseLabel = responseLabels[response] || response
  const docNumber = getDocNumber(quoteId)

  await transporter.sendMail({
    from: `"그리고 엔터테인먼트" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `[견적 ${responseLabel}] ${clientName}님 (${clientCompany || '개인'})`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:40px;">
  <h2 style="margin:0 0 24px;font-size:20px;">견적서 응답이 도착했습니다</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;width:120px;">고객</td><td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600;">${clientName} ${clientCompany ? `(${clientCompany})` : ''}</td></tr>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;">견적 번호</td><td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600;">${docNumber}</td></tr>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;">견적 금액</td><td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600;">${formatKRW(totalAmount)}</td></tr>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;">응답</td><td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:700;color:${response === 'approved' ? '#16a34a' : response === 'rejected' ? '#dc2626' : '#d97706'};">${responseLabel}</td></tr>
    ${note ? `<tr><td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;">메모</td><td style="padding:10px 12px;border-bottom:1px solid #eee;">${note}</td></tr>` : ''}
  </table>
</div>
</body>
</html>`,
  })
}
