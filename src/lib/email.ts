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
  return `GRG-${numericPart.padStart(6, '0')}`
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
  const title = projectTitle || '프로젝트'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Apple SD Gothic Neo','Malgun Gothic','Helvetica Neue',sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">

  <div style="padding:36px 40px 0;">
    <table style="width:100%;" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-size:20px;font-weight:800;color:#111;letter-spacing:0.5px;">그리고 엔터테인먼트</div>
          <div style="font-size:11px;color:#999;margin-top:2px;">(주)그리고 엔터테인먼트</div>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <div style="font-size:18px;font-weight:300;color:#333;letter-spacing:6px;">견 적 서</div>
          <div style="font-size:10px;color:#999;margin-top:3px;">No. ${docNumber}</div>
        </td>
      </tr>
    </table>
    <div style="border-bottom:2.5px solid #111;margin-top:16px;"></div>
  </div>

  <div style="padding:28px 40px 36px;">
    <div style="font-size:15px;color:#111;line-height:1.8;">
      안녕하세요, <strong>${clientName}</strong>님.
    </div>
    <div style="font-size:14px;color:#111;margin-top:4px;line-height:1.8;">
      그리고 엔터테인먼트입니다.
    </div>
    <div style="font-size:14px;color:#444;margin-top:16px;line-height:1.8;">
      문의해주신 건에 대한 견적서를 전달드립니다.<br/>
      첨부된 PDF 파일에서 상세 내역을 확인하실 수 있습니다.
    </div>

    <table style="width:100%;border-collapse:collapse;margin:24px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:12px 16px;background:#f5f5f5;border-bottom:1px solid #e8e8e8;font-size:13px;color:#666;width:130px;">견적명</td>
        <td style="padding:12px 16px;background:#f5f5f5;border-bottom:1px solid #e8e8e8;font-size:14px;font-weight:600;color:#111;">${title}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#f5f5f5;font-size:13px;color:#666;">합계 (VAT 포함)</td>
        <td style="padding:12px 16px;background:#f5f5f5;font-size:16px;font-weight:800;color:#111;">${formatKRW(quote.total_amount)}</td>
      </tr>
    </table>

    <div style="font-size:14px;color:#444;line-height:1.8;margin-top:20px;">
      견적 내용 관련 문의사항이나 조정이 필요하신 부분이 있으시면<br/>
      편하게 연락주시기 바랍니다.
    </div>
    <div style="font-size:14px;color:#111;margin-top:16px;">
      감사합니다.
    </div>

    <div style="text-align:center;margin:28px 0 0;">
      <a href="${viewUrl}" style="display:inline-block;padding:12px 36px;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:0.5px;">
        온라인에서 견적 확인/응답하기
      </a>
    </div>
  </div>

  <div style="padding:20px 40px;border-top:1px solid #eee;">
    <div style="font-size:13px;font-weight:700;color:#111;">그리고 엔터테인먼트</div>
    <div style="font-size:11px;color:#888;margin-top:4px;line-height:1.6;">
      (주)그리고 엔터테인먼트<br/>
      사업자등록번호 116-81-96848 | 서울특별시 마포구 성지3길 55, 3층<br/>
      연락처 02-6229-9229
    </div>
  </div>
</div>
</body>
</html>`

  await transporter.sendMail({
    from: `"그리고 엔터테인먼트" <${process.env.SMTP_USER}>`,
    to,
    cc: cc?.length ? cc : undefined,
    subject: `[그리고 엔터테인먼트] 견적서 전달 - ${title} (${docNumber})`,
    html,
    attachments: [
      {
        filename: `그리고엔터_견적서_${docNumber}.pdf`,
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
