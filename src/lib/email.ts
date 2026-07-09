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
  const user = process.env.SMTP_USER || process.env.EMAIL_SMTP_USER
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SMTP_PASS

  if (!user || !pass) {
    throw new Error(
      `SMTP 환경변수 누락: ${!user ? 'SMTP_USER ' : ''}${!pass ? 'SMTP_PASS' : ''}`
    )
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || process.env.EMAIL_SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  })
}

function getSmtpUser() {
  return process.env.SMTP_USER || process.env.EMAIL_SMTP_USER || ''
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
    from: `"그리고 엔터테인먼트" <${getSmtpUser()}>`,
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
    from: `"그리고 엔터테인먼트" <${getSmtpUser()}>`,
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

type ReceiptLanguage = 'ko' | 'en' | 'ja'

const DANCER_RECEIPT_COPY: Record<ReceiptLanguage, {
  subject: string
  greeting: (name: string) => string
  intro: string[]
  nextTitle: string
  next: string[]
  footer: string[]
}> = {
  ko: {
    subject: '[그리고 엔터테인먼트] 지원서가 접수되었습니다',
    greeting: (name) => `${name}님, 안녕하세요.`,
    intro: [
      '보내주신 지원서는 정상적으로 접수되었습니다.',
      '입력하신 이메일과 비밀번호로 deetz 프로필에 로그인할 수 있습니다.',
    ],
    nextTitle: '다음 안내',
    next: [
      '보내주신 정보와 포트폴리오를 바탕으로 프로그램 구성을 확인하겠습니다.',
      '프로그램 구성이 준비되는 대로 담당자가 입력하신 이메일로 개별 연락드리겠습니다.',
      '추가 확인이 필요한 경우 이 메일 또는 입력하신 연락처로 안내드리겠습니다.',
    ],
    footer: [
      '감사합니다.',
      '그리고 엔터테인먼트',
    ],
  },
  en: {
    subject: '[GRIGO ENTERTAINMENT] Your application has been received',
    greeting: (name) => `Hi ${name},`,
    intro: [
      'Your application has been received.',
      'You can log in to your deetz profile with the email and password you entered.',
    ],
    nextTitle: 'What happens next',
    next: [
      'We will review your information and portfolio to prepare the program plan.',
      'Our team will contact you individually by email once the plan is ready.',
      'If we need anything else, we will reach out by email or through the contact details you submitted.',
    ],
    footer: [
      'Thank you.',
      'GRIGO ENTERTAINMENT',
    ],
  },
  ja: {
    subject: '[GRIGO ENTERTAINMENT] お申し込みを受け付けました',
    greeting: (name) => `${name}様`,
    intro: [
      'お申し込みを受け付けました。',
      'ご入力のメールアドレスとパスワードでdeetzプロフィールにログインできます。',
    ],
    nextTitle: '次のご案内',
    next: [
      'ご入力内容とポートフォリオを確認し、プログラム構成を準備いたします。',
      '構成が整い次第、担当者よりご記入のメールへ個別にご連絡いたします。',
      '追加確認が必要な場合は、メールまたはご入力の連絡先へご案内いたします。',
    ],
    footer: [
      'ありがとうございます。',
      'GRIGO ENTERTAINMENT',
    ],
  },
}

export async function sendDancerApplicationReceiptEmail(params: {
  to: string
  name: string
  lang?: string | null
}) {
  const transporter = getTransporter()
  const lang: ReceiptLanguage =
    params.lang === 'en' || params.lang === 'ja' || params.lang === 'ko' ? params.lang : 'ko'
  const copy = DANCER_RECEIPT_COPY[lang]
  const name = params.name.trim() || 'dancer'

  const text = [
    copy.greeting(name),
    '',
    ...copy.intro,
    '',
    `[${copy.nextTitle}]`,
    ...copy.next,
    '',
    ...copy.footer,
    'grigoent.co.kr',
    'deetz.kr',
  ].join('\n')

  const htmlLines = [...copy.intro, '', ...copy.next].filter(Boolean)
  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Apple SD Gothic Neo','Malgun Gothic','Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="padding:34px 40px 0;">
    <div style="font-size:20px;font-weight:800;color:#111;letter-spacing:0.5px;">GRIGO ENTERTAINMENT</div>
    <div style="font-size:11px;color:#999;margin-top:4px;">Dancer agency pool</div>
    <div style="border-bottom:2.5px solid #111;margin-top:16px;"></div>
  </div>
  <div style="padding:28px 40px 34px;">
    <div style="display:inline-block;border:1px solid #111;padding:6px 10px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#111;">${escapeHtml(copy.nextTitle)}</div>
    <p style="font-size:17px;font-weight:700;color:#111;line-height:1.7;margin:20px 0 10px;">${escapeHtml(copy.greeting(name))}</p>
    <p style="font-size:14px;color:#444;line-height:1.85;margin:0;">${htmlLines.map(escapeHtml).join('<br>')}</p>
    <div style="margin-top:24px;padding:16px 18px;background:#f6f6f6;border:1px solid #e8e8e8;">
      <p style="font-size:13px;color:#333;line-height:1.75;margin:0;">deetz profile login: <a href="https://www.deetz.kr/login?next=/me" style="color:#111;font-weight:700;">https://www.deetz.kr/login?next=/me</a></p>
    </div>
    <p style="font-size:14px;color:#111;line-height:1.8;margin:22px 0 0;">${copy.footer.map(escapeHtml).join('<br>')}</p>
  </div>
  <div style="padding:20px 40px;border-top:1px solid #eee;background:#fafafa;">
    <div style="font-size:13px;font-weight:700;color:#111;">그리고 엔터테인먼트</div>
    <div style="font-size:11px;color:#888;margin-top:4px;line-height:1.7;">grigoent.co.kr<br>deetz.kr</div>
  </div>
</div>
</body>
</html>`

  await transporter.sendMail({
    from: `"그리고 엔터테인먼트" <${getSmtpUser()}>`,
    to: params.to,
    subject: copy.subject,
    text,
    html,
  })
}
