import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import type { QuoteItem } from '@/lib/types'

const BLACK = '#111111'
const GRAY = '#666666'
const LGRAY = '#999999'
const BG = '#f5f5f5'
const PW = 595.28
const PH = 841.89
const M = 40

function fmt(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('ko-KR') + '원'
}

interface Input {
  quote: {
    id: string
    items: QuoteItem[]
    supply_amount: number
    vat: number
    total_amount: number
    valid_until: string
    notes: string
  }
  clientName: string
  clientCompany?: string
  projectTitle?: string
}

function regFonts(doc: InstanceType<typeof PDFDocument>) {
  const d = path.join(process.cwd(), 'public', 'fonts')
  const r = path.join(d, 'NanumGothic-Regular.ttf')
  const b = path.join(d, 'NanumGothic-Bold.ttf')
  if (fs.existsSync(r) && fs.existsSync(b)) {
    doc.registerFont('NG', r)
    doc.registerFont('NGB', b)
    return true
  }
  return false
}

const CO = {
  name: '(주)그리고 엔터테인먼트',
  brand: '그리고 엔터테인먼트',
  bizNo: '116-81-96848',
  bizType: '서비스업',
  bizItem: '매니지먼트업',
  addr: '서울특별시 마포구 성지3길 55, 3층',
  tel: '02-6229-9229',
}

export async function generateQuotePdf(input: Input): Promise<Buffer> {
  const { quote, clientName, clientCompany, projectTitle } = input
  const num = quote.id.replace(/\D/g, '').slice(-6)
  const docNo = `GRG-${num.padStart(6, '0')}`

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true })
      const chunks: Uint8Array[] = []
      doc.on('data', (c: Uint8Array) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const ok = regFonts(doc)
      const fr = ok ? 'NG' : 'Helvetica'
      const fb = ok ? 'NGB' : 'Helvetica-Bold'
      const cw = PW - M * 2
      const lb = { lineBreak: false }

      let y = M

      // ── 헤더 ──
      doc.font(fb).fontSize(15).fillColor(BLACK).text(CO.brand, M, y, lb)
      doc.font(fr).fontSize(16).fillColor('#333').text('견 적 서', M, y, { width: cw, align: 'right', ...lb })
      y += 18
      doc.font(fr).fontSize(7).fillColor(LGRAY).text(CO.name, M, y, lb)
      doc.font(fr).fontSize(7).fillColor(LGRAY).text(`No. ${docNo}`, M, y, { width: cw, align: 'right', ...lb })
      y += 12
      doc.moveTo(M, y).lineTo(M + cw, y).lineWidth(2).strokeColor(BLACK).stroke()
      y += 10

      // ── 발행자 ──
      const iH = 56
      doc.rect(M, y, 3, iH).fill(BLACK)
      doc.rect(M + 3, y, cw - 3, iH).fill(BG)
      doc.font(fr).fontSize(6.5).fillColor(LGRAY).text('발행자', M + 10, y + 5, lb)
      doc.font(fb).fontSize(8.5).fillColor(BLACK).text(CO.name, M + 10, y + 15, lb)
      doc.font(fr).fontSize(7).fillColor(GRAY).text(`사업자등록번호 ${CO.bizNo}  |  업태: ${CO.bizType}  종목: ${CO.bizItem}`, M + 10, y + 27, lb)
      doc.font(fr).fontSize(7).fillColor(GRAY).text(`${CO.addr}  |  ${CO.tel}`, M + 10, y + 38, lb)
      y += iH + 6

      // ── ESTIMATE ──
      if (projectTitle) {
        const pH = 32
        doc.rect(M, y, 3, pH).fill(BLACK)
        doc.rect(M + 3, y, cw - 3, pH).fill(BG)
        doc.font(fr).fontSize(6.5).fillColor(LGRAY).text('ESTIMATE', M + 10, y + 5, lb)
        doc.font(fb).fontSize(11).fillColor(BLACK).text(projectTitle, M + 10, y + 17, lb)
        y += pH + 6
      }

      // ── 수신 / 발행일 ──
      const half = (cw - 1) / 2
      doc.moveTo(M, y).lineTo(M + cw, y).lineWidth(0.3).strokeColor('#ddd').stroke()
      doc.font(fr).fontSize(6.5).fillColor(LGRAY).text('수신', M + 4, y + 5, lb)
      doc.font(fb).fontSize(9).fillColor(BLACK).text(`${clientName} 님`, M + 4, y + 16, lb)
      if (clientCompany) doc.font(fr).fontSize(7).fillColor(GRAY).text(clientCompany, M + 4, y + 28, lb)
      doc.moveTo(M + half, y + 4).lineTo(M + half, y + 32).lineWidth(0.3).strokeColor('#ddd').stroke()
      doc.font(fr).fontSize(6.5).fillColor(LGRAY).text('발행일', M + half + 10, y + 5, lb)
      const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })
      doc.font(fb).fontSize(9).fillColor(BLACK).text(`${dateStr}.`, M + half + 10, y + 16, lb)
      y += 36
      doc.moveTo(M, y).lineTo(M + cw, y).lineWidth(0.3).strokeColor('#ddd').stroke()
      y += 10

      // ── 테이블 ──
      const cols = [cw * 0.44, cw * 0.12, cw * 0.22, cw * 0.22]
      const hdrs = ['품목', '수량', '단가', '금액']
      const RH = 22

      doc.rect(M, y, cw, RH).fill(BLACK)
      let cx = M
      for (let i = 0; i < 4; i++) {
        const a = i >= 2 ? 'right' : i === 1 ? 'center' : 'left'
        doc.font(fb).fontSize(7.5).fillColor('#fff').text(hdrs[i], cx + 8, y + 7, { width: cols[i] - 16, align: a, ...lb })
        cx += cols[i]
      }
      y += RH

      const items = quote.items ?? []
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx]
        doc.moveTo(M, y + RH).lineTo(M + cw, y + RH).lineWidth(0.2).strokeColor('#e0e0e0').stroke()
        const rd = [it.name, `${it.qty}${it.unit || ''}`, fmt(it.unit_price), fmt(it.amount)]
        cx = M
        for (let i = 0; i < 4; i++) {
          const a = i >= 2 ? 'right' : i === 1 ? 'center' : 'left'
          doc.font(i === 3 ? fb : fr).fontSize(7.5).fillColor(BLACK).text(rd[i], cx + 8, y + 7, { width: cols[i] - 16, align: a, ...lb })
          cx += cols[i]
        }
        y += RH
      }
      y += 4

      // ── 합계 ──
      const lx = M + cw - 220
      const vx = M + cw - 120

      doc.font(fr).fontSize(7.5).fillColor(GRAY).text('공급가액', lx, y, { width: 90, align: 'right', ...lb })
      doc.font(fr).fontSize(8).fillColor(BLACK).text(fmt(quote.supply_amount), vx, y, { width: 120, align: 'right', ...lb })
      y += 14
      doc.font(fr).fontSize(7.5).fillColor(GRAY).text('부가세 (10%)', lx, y, { width: 90, align: 'right', ...lb })
      doc.font(fr).fontSize(8).fillColor(BLACK).text(fmt(quote.vat), vx, y, { width: 120, align: 'right', ...lb })
      y += 14
      doc.moveTo(lx, y).lineTo(M + cw, y).lineWidth(1).strokeColor(BLACK).stroke()
      y += 5
      doc.font(fb).fontSize(10).fillColor(BLACK).text('합계', lx, y, { width: 90, align: 'right', ...lb })
      doc.font(fb).fontSize(12).fillColor(BLACK).text(fmt(quote.total_amount), vx, y, { width: 120, align: 'right', ...lb })
      y += 22

      // ── 특이사항 ──
      if (quote.notes) {
        const lines = quote.notes.split('\n')
        const nH = Math.max(28, 16 + lines.length * 11)
        doc.rect(M, y, 3, nH).fill(BLACK)
        doc.rect(M + 3, y, cw - 3, nH).fill('#fafafa')
        doc.font(fb).fontSize(7).fillColor(BLACK).text('특이사항', M + 10, y + 5, lb)
        doc.font(fr).fontSize(7).fillColor('#444').text(quote.notes, M + 10, y + 16, { width: cw - 24, lineGap: 2 })
      }

      // ── 푸터 (항상 1페이지 하단) ──
      const fy = PH - 28
      doc.moveTo(M, fy).lineTo(M + cw, fy).lineWidth(0.2).strokeColor('#ddd').stroke()
      doc.font(fr).fontSize(6.5).fillColor(LGRAY).text(`${CO.name} | GRIGO Entertainment | ${CO.tel}`, M, fy + 6, lb)
      doc.font(fr).fontSize(6.5).fillColor(LGRAY).text(docNo, M, fy + 6, { width: cw, align: 'right', ...lb })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
