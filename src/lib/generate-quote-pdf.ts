import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import type { QuoteItem } from '@/lib/types'

const BLACK = '#111111'
const GRAY = '#666666'
const LIGHT_GRAY = '#999999'
const BG_GRAY = '#f5f5f5'
const PAGE_W = 595.28
const PAGE_H = 841.89
const M = 50

function formatKRW(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString('ko-KR') + '원'
}

interface GenerateQuotePdfInput {
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

function registerFonts(doc: InstanceType<typeof PDFDocument>) {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts')
  const regularPath = path.join(fontsDir, 'NanumGothic-Regular.ttf')
  const boldPath = path.join(fontsDir, 'NanumGothic-Bold.ttf')

  if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
    doc.registerFont('NanumGothic', regularPath)
    doc.registerFont('NanumGothic-Bold', boldPath)
    return true
  }
  return false
}

const CO = {
  name: '(주)그리고 엔터테인먼트',
  brand: '그리고 엔터테인먼트',
  brandEn: 'GRIGO Entertainment',
  bizNo: '116-81-96848',
  bizType: '서비스업',
  bizItem: '매니지먼트업',
  address: '서울특별시 마포구 성지3길 55, 3층',
  tel: '02-6229-9229',
}

export async function generateQuotePdf(input: GenerateQuotePdfInput): Promise<Buffer> {
  const { quote, clientName, clientCompany, projectTitle } = input
  const numericPart = quote.id.replace(/\D/g, '').slice(-6)
  const docNumber = `GRG-${numericPart.padStart(6, '0')}`

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: M })
      const chunks: Uint8Array[] = []

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const hasKoreanFont = registerFonts(doc)
      const fr = hasKoreanFont ? 'NanumGothic' : 'Helvetica'
      const fb = hasKoreanFont ? 'NanumGothic-Bold' : 'Helvetica-Bold'
      const cw = PAGE_W - M * 2

      // ── 헤더 ──
      doc.font(fb).fontSize(18).fillColor(BLACK)
        .text(CO.brand, M, M)
      doc.font(fr).fontSize(8).fillColor(LIGHT_GRAY)
        .text(CO.name, M, doc.y + 2)

      doc.font(fr).fontSize(20).fillColor('#333')
        .text('견 적 서', M, M, { width: cw, align: 'right' })
      doc.font(fr).fontSize(8).fillColor(LIGHT_GRAY)
        .text(`No. ${docNumber}`, M, M + 24, { width: cw, align: 'right' })

      let y = M + 44
      doc.moveTo(M, y).lineTo(M + cw, y).lineWidth(2.5).strokeColor(BLACK).stroke()
      y += 16

      // ── 발행자 정보 ──
      const issuerH = 72
      doc.rect(M, y, 3, issuerH).fill(BLACK)
      doc.rect(M + 3, y, cw - 3, issuerH).fill(BG_GRAY)

      doc.font(fr).fontSize(7).fillColor(LIGHT_GRAY)
        .text('발행자', M + 14, y + 8)
      doc.font(fb).fontSize(10).fillColor(BLACK)
        .text(CO.name, M + 14, y + 20)

      const issuerLines = [
        `사업자등록번호  ${CO.bizNo}`,
        `업태: ${CO.bizType}  종목: ${CO.bizItem}`,
        `${CO.address}`,
        `연락처: ${CO.tel}`,
      ]
      let iy = y + 34
      for (const line of issuerLines) {
        doc.font(fr).fontSize(7.5).fillColor(GRAY)
          .text(line, M + 14, iy, { width: cw - 28 })
        iy += 10
      }
      y += issuerH + 10

      // ── 프로젝트 (ESTIMATE) ──
      if (projectTitle) {
        const projH = 46
        doc.rect(M, y, 3, projH).fill(BLACK)
        doc.rect(M + 3, y, cw - 3, projH).fill(BG_GRAY)
        doc.font(fr).fontSize(7).fillColor(LIGHT_GRAY)
          .text('ESTIMATE', M + 14, y + 8)
        doc.font(fb).fontSize(13).fillColor(BLACK)
          .text(projectTitle, M + 14, y + 22, { width: cw - 28 })
        y += projH + 10
      }

      // ── 수신 / 발행일 ──
      const infoH = 44
      const halfW = (cw - 1) / 2

      doc.moveTo(M, y).lineTo(M + cw, y).lineWidth(0.5).strokeColor('#ddd').stroke()

      doc.font(fr).fontSize(7).fillColor(LIGHT_GRAY)
        .text('수신', M + 4, y + 8)
      doc.font(fb).fontSize(11).fillColor(BLACK)
        .text(`${clientName} 님`, M + 4, y + 22)
      if (clientCompany) {
        doc.font(fr).fontSize(8).fillColor(GRAY)
          .text(clientCompany, M + 4, y + 36, { width: halfW - 8 })
      }

      doc.moveTo(M + halfW, y + 6).lineTo(M + halfW, y + infoH - 6)
        .lineWidth(0.5).strokeColor('#ddd').stroke()

      doc.font(fr).fontSize(7).fillColor(LIGHT_GRAY)
        .text('발행일', M + halfW + 12, y + 8)
      doc.font(fb).fontSize(11).fillColor(BLACK)
        .text(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }) + '.', M + halfW + 12, y + 22)

      doc.moveTo(M, y + infoH).lineTo(M + cw, y + infoH).lineWidth(0.5).strokeColor('#ddd').stroke()
      y += infoH + 16

      // ── 품목 테이블 ──
      const colW = [cw * 0.44, cw * 0.12, cw * 0.22, cw * 0.22]
      const headers = ['품목', '수량', '단가', '금액']
      const ROW_H = 28

      doc.rect(M, y, cw, ROW_H).fill(BLACK)
      let cx = M
      for (let i = 0; i < headers.length; i++) {
        const align = i >= 2 ? 'right' : i === 1 ? 'center' : 'left'
        doc.font(fb).fontSize(8.5).fillColor('#ffffff')
          .text(headers[i], cx + 10, y + 9, { width: colW[i] - 20, align })
        cx += colW[i]
      }
      y += ROW_H

      const items = quote.items ?? []
      for (let idx = 0; idx < items.length; idx++) {
        if (y + ROW_H > PAGE_H - M - 100) {
          doc.addPage()
          y = M
        }
        const item = items[idx]

        doc.moveTo(M, y + ROW_H).lineTo(M + cw, y + ROW_H)
          .lineWidth(0.3).strokeColor('#e0e0e0').stroke()

        const itemName = item.category ? `${item.name}` : item.name
        const rowData = [
          itemName,
          `${item.qty}${item.unit || ''}`,
          formatKRW(item.unit_price),
          formatKRW(item.amount),
        ]
        cx = M
        for (let i = 0; i < rowData.length; i++) {
          const align = i >= 2 ? 'right' : i === 1 ? 'center' : 'left'
          const font = i === 3 ? fb : fr
          doc.font(font).fontSize(8.5).fillColor(BLACK)
            .text(rowData[i], cx + 10, y + 9, { width: colW[i] - 20, align })
          cx += colW[i]
        }
        y += ROW_H
      }
      y += 6

      // ── 합계 영역 ──
      const sumLabelX = M + cw - 260
      const sumValX = M + cw - 140
      const sumValW = 140

      doc.font(fr).fontSize(8.5).fillColor(GRAY)
        .text('공급가액', sumLabelX, y, { width: 110, align: 'right' })
      doc.font(fr).fontSize(9).fillColor(BLACK)
        .text(formatKRW(quote.supply_amount), sumValX, y, { width: sumValW, align: 'right' })
      y += 18

      doc.font(fr).fontSize(8.5).fillColor(GRAY)
        .text('부가세 (10%)', sumLabelX, y, { width: 110, align: 'right' })
      doc.font(fr).fontSize(9).fillColor(BLACK)
        .text(formatKRW(quote.vat), sumValX, y, { width: sumValW, align: 'right' })
      y += 20

      doc.moveTo(sumLabelX, y).lineTo(M + cw, y)
        .lineWidth(1.5).strokeColor(BLACK).stroke()
      y += 8

      doc.font(fb).fontSize(12).fillColor(BLACK)
        .text('합계', sumLabelX, y, { width: 110, align: 'right' })
      doc.font(fb).fontSize(14).fillColor(BLACK)
        .text(formatKRW(quote.total_amount), sumValX, y, { width: sumValW, align: 'right' })
      y += 30

      // ── 특이사항 ──
      if (quote.notes) {
        if (y + 50 > PAGE_H - M - 30) {
          doc.addPage()
          y = M
        }
        const noteLines = quote.notes.split('\n')
        const noteH = Math.max(40, 20 + noteLines.length * 12)

        doc.rect(M, y, 3, noteH).fill(BLACK)
        doc.rect(M + 3, y, cw - 3, noteH).fill('#fafafa')
        doc.font(fb).fontSize(8).fillColor(BLACK)
          .text('특이사항', M + 14, y + 8)
        doc.font(fr).fontSize(8).fillColor('#444')
          .text(quote.notes, M + 14, y + 22, { width: cw - 32, lineGap: 3 })
        y += noteH + 10
      }

      // ── 푸터 ──
      const footerY = PAGE_H - 32
      doc.moveTo(M, footerY).lineTo(M + cw, footerY)
        .lineWidth(0.3).strokeColor('#ddd').stroke()
      doc.font(fr).fontSize(7).fillColor(LIGHT_GRAY)
        .text(`${CO.name} | ${CO.brandEn} | ${CO.tel}`, M, footerY + 8)
      doc.font(fr).fontSize(7).fillColor(LIGHT_GRAY)
        .text(docNumber, M, footerY + 8, { width: cw, align: 'right' })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
