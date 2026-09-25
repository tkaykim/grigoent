import nodemailer from 'nodemailer'
import { BANK_ACCOUNTS, BUSINESS_REGISTRATION, COMPANY } from '@/lib/company-paperwork'
import { isPaperworkFile, loadPaperworkFile } from '@/lib/paperwork-files'
import { DOC_TYPE_LABELS, type PaperworkDocRow } from '@/lib/paperwork-docs'
import { paperworkPdfFilename } from '@/lib/paperwork-pdf'

// 견적서·거래명세서 발송 메일. 규칙: 한 문장 = 한 줄(<br>), 단락 사이 빈 줄.
// 수신=거래처, 숨은참조=finance@(경영지원 확인용), 회신=작성 담당자.

function transporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) throw new Error('SMTP 환경변수 누락')
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  })
}

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`

async function fetchAttachment(file: string, filename: string) {
  if (!isPaperworkFile(file)) throw new Error(`알 수 없는 첨부 파일: ${file}`)
  return { filename, content: await loadPaperworkFile(file), contentType: 'application/pdf' }
}

export async function sendPaperworkEmail(opts: {
  row: PaperworkDocRow
  pdf: Buffer
  to: string
  viewUrl: string
}) {
  const { row, pdf, to, viewUrl } = opts
  const label = DOC_TYPE_LABELS[row.doc_type]
  const subject = `[그리고엔터테인먼트] ${row.project_title ? `${row.project_title} ` : ''}${label} (${row.doc_no})`

  const greet = row.client_contact ? `${row.client_company} ${row.client_contact}님, 안녕하세요.` : `${row.client_company} 담당자님, 안녕하세요.`
  const bodyLines = [
    `(주)그리고엔터테인먼트 ${row.author_name}입니다.`,
    `${row.project_title ? `「${row.project_title}」 ` : ''}${label}를 보내드립니다.`,
    `합계 금액은 ${won(row.total_amount)}(${row.vat_mode === 'included' ? '부가세 포함' : `공급가액 ${won(row.supply_amount)} + 부가세 ${won(row.vat_amount)}`})입니다.`,
  ]
  if (row.version > 1) bodyLines.push(`이전에 보내드린 ${label}를 수정한 ${row.version}차 문서입니다.`)
  const attachNames = [`${label} PDF`]
  if (row.attach_docs.includes('brn')) attachNames.push('사업자등록증')
  if (row.attach_docs.includes('bank')) attachNames.push('통장사본')
  const linkLines = [
    `${attachNames.join('·')}를 첨부했습니다.`,
    `아래 링크에서도 문서와 사업자 서류를 확인하고 내려받으실 수 있습니다.`,
  ]
  const closing = [
    `세금계산서 발행이 필요하시면 ${COMPANY.taxInvoiceEmail}로 알려주세요.`,
    `문의 사항은 이 메일에 회신해 주시면 담당자가 답변드리겠습니다.`,
    `감사합니다.`,
  ]
  const bank = BANK_ACCOUNTS[row.account]

  const p = (lines: string[]) => `<p style="margin:0 0 16px;line-height:1.7">${lines.map(esc).join('<br>')}</p>`
  const html = `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:14px;color:#111;max-width:560px">
${p([greet])}
${p(bodyLines)}
${p(linkLines)}
<p style="margin:0 0 16px"><a href="${esc(viewUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600">${esc(label)} 확인하기</a></p>
${p(closing)}
<p style="margin:0;font-size:12px;color:#777;line-height:1.7">${esc(COMPANY.name)}<br>담당 ${esc(row.author_name)}${row.author_email ? ` · ${esc(row.author_email)}` : ''}<br>입금 계좌 ${esc(`${bank.bank} ${bank.number} (예금주 ${bank.holder})`)}<br>사업자등록번호 ${esc(COMPANY.businessNumber)} · ${esc(COMPANY.phone)}</p>
</div>`
  const text = [greet, '', ...bodyLines, '', ...linkLines, viewUrl, '', ...closing, '', COMPANY.name, `담당 ${row.author_name}`].join('\n')

  const attachments: { filename: string; content: Buffer; contentType: string }[] = [
    { filename: paperworkPdfFilename(row), content: pdf, contentType: 'application/pdf' },
  ]
  if (row.attach_docs.includes('brn')) attachments.push(await fetchAttachment(BUSINESS_REGISTRATION.file, BUSINESS_REGISTRATION.downloadName))
  if (row.attach_docs.includes('bank')) attachments.push(await fetchAttachment(bank.file, bank.downloadName))

  await transporter().sendMail({
    from: `"그리고엔터테인먼트" <${process.env.SMTP_USER}>`,
    to,
    bcc: to === COMPANY.taxInvoiceEmail ? undefined : COMPANY.taxInvoiceEmail,
    replyTo: row.author_email || COMPANY.taxInvoiceEmail,
    subject,
    html,
    text,
    attachments,
  })
}
