import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import { BANK_ACCOUNTS, COMPANY } from '@/lib/company-paperwork'
import { DOC_TYPE_LABELS, lineAmount, type PaperworkDocRow } from '@/lib/paperwork-docs'

// 견적서·거래명세서 A4 PDF. 회사 정보는 company-paperwork.ts 정본만 쓴다(하드코딩 금지).

const BLACK = '#111111'
const GRAY = '#555555'
const LGRAY = '#8a8a8a'
const LINE = '#dddddd'
const BG = '#f5f5f5'
const PW = 595.28
const PH = 841.89
const M = 40
const CW = PW - M * 2
const FOOTER_Y = PH - 30

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`
const num = (v: number) => Math.round(v).toLocaleString('ko-KR')

function koreanDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return `${y}년 ${m}월 ${day}일`
}

export function paperworkPdfFilename(row: Pick<PaperworkDocRow, 'doc_type' | 'doc_no' | 'client_company'>): string {
  const safe = row.client_company.replace(/[\\/:*?"<>|]/g, '').slice(0, 30)
  return `그리고엔터테인먼트_${DOC_TYPE_LABELS[row.doc_type]}_${safe}_${row.doc_no}.pdf`
}

export async function generatePaperworkPdf(row: PaperworkDocRow): Promise<Buffer> {
  const title = DOC_TYPE_LABELS[row.doc_type]
  const bank = BANK_ACCOUNTS[row.account]

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: `${title} ${row.doc_no}`, Author: COMPANY.name } })
      const chunks: Uint8Array[] = []
      doc.on('data', (c: Uint8Array) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const dir = path.join(process.cwd(), 'public', 'fonts')
      const reg = path.join(dir, 'NanumGothic-Regular.ttf')
      const bold = path.join(dir, 'NanumGothic-Bold.ttf')
      const hasFont = fs.existsSync(reg) && fs.existsSync(bold)
      if (hasFont) {
        doc.registerFont('NG', reg)
        doc.registerFont('NGB', bold)
      }
      const fr = hasFont ? 'NG' : 'Helvetica'
      const fb = hasFont ? 'NGB' : 'Helvetica-Bold'
      const lb = { lineBreak: false }

      let y = M

      // ── 제목 ──
      doc.font(fb).fontSize(22).fillColor(BLACK).text(title.split('').join(' '), M, y, { width: CW, align: 'center', ...lb })
      y += 34
      doc.font(fr).fontSize(8).fillColor(LGRAY).text(`No. ${row.doc_no}${row.version > 1 ? ` (수정 ${row.version}차)` : ''}`, M, y, { width: CW, align: 'right', ...lb })
      y += 12
      doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(2).strokeColor(BLACK).stroke()
      y += 12

      // ── 공급받는자 / 공급자 ──
      const half = (CW - 12) / 2
      const boxH = 118
      const leftX = M
      const rightX = M + half + 12

      doc.rect(leftX, y, half, boxH).fill(BG)
      doc.font(fr).fontSize(7).fillColor(LGRAY).text('공급받는자', leftX + 10, y + 8, lb)
      doc.font(fb).fontSize(12).fillColor(BLACK).text(`${row.client_company} 귀하`, leftX + 10, y + 22, { width: half - 20, ...lb })
      let ly = y + 44
      const leftRows: [string, string | null][] = [
        ['담당자', row.client_contact],
        ['프로젝트', row.project_title],
        [row.doc_type === 'quote' ? '견적일' : '거래일', koreanDate(row.issued_date)],
        ...(row.doc_type === 'quote' && row.valid_until ? ([['유효기간', `${koreanDate(row.valid_until)}까지`]] as [string, string][]) : []),
      ]
      for (const [k, v] of leftRows) {
        if (!v) continue
        doc.font(fr).fontSize(7.5).fillColor(LGRAY).text(k, leftX + 10, ly, lb)
        doc.font(fr).fontSize(7.5).fillColor(BLACK).text(v, leftX + 62, ly, { width: half - 72, ...lb })
        ly += 14
      }

      doc.rect(rightX, y, half, boxH).lineWidth(0.8).strokeColor(BLACK).stroke()
      doc.font(fr).fontSize(7).fillColor(LGRAY).text('공급자', rightX + 10, y + 8, lb)
      const rightRows: [string, string][] = [
        ['상호', COMPANY.name],
        ['대표자', COMPANY.ceo],
        ['등록번호', COMPANY.businessNumber],
        ['주소', COMPANY.address],
        ['업태', COMPANY.businessType],
        ['종목', COMPANY.businessItem],
        ['연락처', COMPANY.phone],
      ]
      let ry = y + 22
      for (const [k, v] of rightRows) {
        doc.font(fr).fontSize(7).fillColor(LGRAY).text(k, rightX + 10, ry, lb)
        doc.font(k === '상호' ? fb : fr).fontSize(7).fillColor(BLACK).text(v, rightX + 52, ry, { width: half - 62, ...lb })
        ry += 13
      }
      y += boxH + 14

      // ── 합계 금액 띠 ──
      doc.rect(M, y, CW, 34).fill(BLACK)
      doc.font(fr).fontSize(8).fillColor('#bbbbbb').text(row.vat_mode === 'included' ? '합계 금액 (부가세 포함)' : '합계 금액 (공급가액 + 부가세)', M + 12, y + 12, lb)
      doc.font(fb).fontSize(15).fillColor('#ffffff').text(won(row.total_amount), M, y + 9, { width: CW - 12, align: 'right', ...lb })
      y += 46

      // ── 품목 표 ──
      const cols = [CW * 0.34, CW * 0.24, CW * 0.1, CW * 0.14, CW * 0.18]
      const heads = ['품목', '내용', '수량', '단가', '금액']
      const aligns: ('left' | 'center' | 'right')[] = ['left', 'left', 'center', 'right', 'right']
      const RH = 22

      const drawHead = () => {
        doc.rect(M, y, CW, RH).fill('#222222')
        let cx = M
        heads.forEach((h, i) => {
          doc.font(fb).fontSize(7.5).fillColor('#ffffff').text(h, cx + 7, y + 7, { width: cols[i] - 14, align: aligns[i], ...lb })
          cx += cols[i]
        })
        y += RH
      }
      drawHead()

      for (const it of row.items) {
        const nameH = doc.font(fr).fontSize(7.5).heightOfString(it.name, { width: cols[0] - 14 })
        const specH = it.spec ? doc.font(fr).fontSize(7).heightOfString(it.spec, { width: cols[1] - 14 }) : 0
        const h = Math.max(RH, Math.ceil(Math.max(nameH, specH)) + 14)
        if (y + h > FOOTER_Y - 150) {
          doc.addPage()
          y = M
          drawHead()
        }
        const cells = [it.name, it.spec ?? '', num(it.qty), num(it.unitPrice), num(lineAmount(it))]
        let cx = M
        cells.forEach((c, i) => {
          const wrap = i <= 1
          doc.font(i === 4 ? fb : fr).fontSize(i === 1 ? 7 : 7.5).fillColor(i === 1 ? GRAY : BLACK)
            .text(c, cx + 7, y + 7, { width: cols[i] - 14, align: aligns[i], ...(wrap ? {} : lb) })
          cx += cols[i]
        })
        y += h
        doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(0.3).strokeColor(LINE).stroke()
      }
      y += 10

      // ── 합계 ──
      const lx = M + CW - 230
      const vx = M + CW - 130
      const sumRow = (label: string, value: string, strong = false) => {
        doc.font(strong ? fb : fr).fontSize(strong ? 9.5 : 8).fillColor(strong ? BLACK : GRAY).text(label, lx, y, { width: 95, align: 'right', ...lb })
        doc.font(strong ? fb : fr).fontSize(strong ? 11 : 8.5).fillColor(BLACK).text(value, vx, y - (strong ? 1 : 0), { width: 130, align: 'right', ...lb })
        y += strong ? 20 : 15
      }
      sumRow('공급가액', won(row.supply_amount))
      sumRow('부가세 (10%)', won(row.vat_amount))
      doc.moveTo(lx, y - 3).lineTo(M + CW, y - 3).lineWidth(1).strokeColor(BLACK).stroke()
      y += 3
      sumRow('합계', won(row.total_amount), true)
      y += 6

      // ── 입금 계좌·비고 ──
      const noteLines: string[] = [`입금 계좌: ${bank.bank} ${bank.number} (예금주 ${bank.holder})`, `세금계산서 문의: ${COMPANY.taxInvoiceEmail}`]
      const notes = row.notes?.trim()
      const notesH = notes ? doc.font(fr).fontSize(7.5).heightOfString(notes, { width: CW - 24, lineGap: 2 }) : 0
      const boxH2 = 26 + noteLines.length * 12 + (notes ? notesH + 16 : 0)
      if (y + boxH2 > FOOTER_Y - 10) {
        doc.addPage()
        y = M
      }
      doc.rect(M, y, 3, boxH2).fill(BLACK)
      doc.rect(M + 3, y, CW - 3, boxH2).fill('#fafafa')
      let ny = y + 8
      doc.font(fb).fontSize(7.5).fillColor(BLACK).text('안내', M + 12, ny, lb)
      ny += 13
      for (const line of noteLines) {
        doc.font(fr).fontSize(7.5).fillColor('#333333').text(line, M + 12, ny, lb)
        ny += 12
      }
      if (notes) {
        ny += 4
        doc.font(fb).fontSize(7.5).fillColor(BLACK).text('비고', M + 12, ny, lb)
        ny += 11
        doc.font(fr).fontSize(7.5).fillColor('#333333').text(notes, M + 12, ny, { width: CW - 24, lineGap: 2 })
      }

      // ── 모든 페이지 하단 ──
      const range = doc.bufferedPageRange()
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i)
        doc.page.margins.bottom = 0 // 하단 여백 안쪽에 쓰면 PDFKit이 빈 페이지를 추가하므로 해제
        doc.moveTo(M, FOOTER_Y).lineTo(M + CW, FOOTER_Y).lineWidth(0.3).strokeColor(LINE).stroke()
        doc.font(fr).fontSize(6.5).fillColor(LGRAY).text(`${COMPANY.name} · 사업자등록번호 ${COMPANY.businessNumber} · ${COMPANY.phone}`, M, FOOTER_Y + 7, lb)
        doc.font(fr).fontSize(6.5).fillColor(LGRAY).text(`${row.doc_no}  ${i + 1}/${range.count}`, M, FOOTER_Y + 7, { width: CW, align: 'right', ...lb })
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
