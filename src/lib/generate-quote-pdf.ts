import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import type { QuoteItem } from '@/lib/types'

const BRAND_COLOR = '#111111'
const PAGE_W = 595.28 // A4
const PAGE_H = 841.89
const M = 40 // margin

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

const COMPANY = {
  name: '(주)그리고 엔터테인먼트',
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
      const fontRegular = hasKoreanFont ? 'NanumGothic' : 'Helvetica'
      const fontBold = hasKoreanFont ? 'NanumGothic-Bold' : 'Helvetica-Bold'

      const contentW = PAGE_W - M * 2

      // ── 헤더 ──
      doc.font(fontBold).fontSize(16).fillColor(BRAND_COLOR)
        .text('그리고 엔터테인먼트', M, M)
      doc.font(fontRegular).fontSize(8).fillColor('#888')
        .text('GRIGO Entertainment', M, doc.y + 1)

      doc.font(fontRegular).fontSize(16).fillColor('#333')
        .text('견 적 서', M, M, { width: contentW, align: 'right' })
      doc.fontSize(8).fillColor('#888')
        .text(`No. ${docNumber}`, M, M + 20, { width: contentW, align: 'right' })

      let y = M + 38
      doc.moveTo(M, y).lineTo(M + contentW, y)
        .lineWidth(2).strokeColor(BRAND_COLOR).stroke()
      y += 8

      // ── 사업자 정보 (공급자) + 수신자 양쪽 배치 ──
      const halfW = (contentW - 10) / 2

      doc.rect(M, y, halfW, 68).fill('#fafafa')
      doc.font(fontBold).fontSize(8).fillColor('#555')
        .text('공급자', M + 8, y + 6)
      const infoLines = [
        `상호: ${COMPANY.name}`,
        `사업자번호: ${COMPANY.bizNo}`,
        `업태: ${COMPANY.bizType}  종목: ${COMPANY.bizItem}`,
        `주소: ${COMPANY.address}`,
        `연락처: ${COMPANY.tel}`,
      ]
      let iy = y + 18
      for (const line of infoLines) {
        doc.font(fontRegular).fontSize(7.5).fillColor('#333')
          .text(line, M + 8, iy, { width: halfW - 16 })
        iy += 10
      }

      const rightX = M + halfW + 10
      doc.rect(rightX, y, halfW, 68).fill('#fafafa')
      doc.font(fontBold).fontSize(8).fillColor('#555')
        .text('수신', rightX + 8, y + 6)
      doc.font(fontRegular).fontSize(9).fillColor('#333')
        .text(`${clientName}님${clientCompany ? ` (${clientCompany})` : ''}`, rightX + 8, y + 20, { width: halfW - 16 })

      const metaItems = [
        ['발행일', new Date().toLocaleDateString('ko-KR')],
        ['유효기간', quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('ko-KR') : '-'],
      ]
      let my = y + 36
      for (const [label, value] of metaItems) {
        doc.font(fontRegular).fontSize(7.5).fillColor('#888')
          .text(label, rightX + 8, my, { width: 40 })
        doc.font(fontRegular).fontSize(8).fillColor('#333')
          .text(value, rightX + 52, my, { width: halfW - 60 })
        my += 12
      }

      y += 76

      // ── 프로젝트 ──
      if (projectTitle) {
        doc.rect(M, y, 3, 28).fill(BRAND_COLOR)
        doc.rect(M + 3, y, contentW - 3, 28).fill('#f8f8f8')
        doc.font(fontRegular).fontSize(7).fillColor('#888')
          .text('PROJECT', M + 12, y + 4)
        doc.font(fontBold).fontSize(11).fillColor(BRAND_COLOR)
          .text(projectTitle, M + 12, y + 14, { width: contentW - 24 })
        y += 34
      }

      // ── 품목 테이블 ──
      const colWidths = [contentW * 0.15, contentW * 0.32, contentW * 0.13, contentW * 0.20, contentW * 0.20]
      const headers = ['카테고리', '품목명', '수량', '단가', '금액']
      const ROW_H = 20

      doc.rect(M, y, contentW, ROW_H).fill(BRAND_COLOR)
      let cx = M
      for (let i = 0; i < headers.length; i++) {
        const align = i >= 3 ? 'right' : i === 2 ? 'center' : 'left'
        doc.font(fontBold).fontSize(8).fillColor('#ffffff')
          .text(headers[i], cx + 6, y + 6, { width: colWidths[i] - 12, align })
        cx += colWidths[i]
      }
      y += ROW_H

      const items = quote.items ?? []
      for (let idx = 0; idx < items.length; idx++) {
        if (y + ROW_H > PAGE_H - M - 60) {
          doc.addPage()
          y = M
        }
        const item = items[idx]
        if (idx % 2 === 1) {
          doc.rect(M, y, contentW, ROW_H).fill('#fafafa')
        }
        doc.moveTo(M, y + ROW_H).lineTo(M + contentW, y + ROW_H)
          .lineWidth(0.3).strokeColor('#ddd').stroke()

        const rowData = [
          item.category || '',
          item.name,
          `${item.qty}${item.unit || ''}`,
          formatKRW(item.unit_price),
          formatKRW(item.amount),
        ]
        cx = M
        for (let i = 0; i < rowData.length; i++) {
          const align = i >= 3 ? 'right' : i === 2 ? 'center' : 'left'
          const f = i === 4 ? fontBold : fontRegular
          doc.font(f).fontSize(8).fillColor('#333')
            .text(rowData[i], cx + 6, y + 6, { width: colWidths[i] - 12, align })
          cx += colWidths[i]
        }
        y += ROW_H
      }

      // ── 합계 ──
      y += 8
      const labelX = M + contentW - 200
      const valX = M + contentW - 100
      const valW = 100

      doc.font(fontRegular).fontSize(8).fillColor('#666')
        .text('공급가액', labelX, y, { width: 90, align: 'right' })
      doc.font(fontRegular).fontSize(8).fillColor('#333')
        .text(formatKRW(quote.supply_amount), valX, y, { width: valW, align: 'right' })
      y += 14

      doc.font(fontRegular).fontSize(8).fillColor('#666')
        .text('부가세 (10%)', labelX, y, { width: 90, align: 'right' })
      doc.font(fontRegular).fontSize(8).fillColor('#333')
        .text(formatKRW(quote.vat), valX, y, { width: valW, align: 'right' })
      y += 16

      doc.moveTo(labelX, y).lineTo(M + contentW, y)
        .lineWidth(1.5).strokeColor(BRAND_COLOR).stroke()
      y += 4

      doc.font(fontBold).fontSize(11).fillColor(BRAND_COLOR)
        .text('합계', labelX, y, { width: 90, align: 'right' })
      doc.font(fontBold).fontSize(12).fillColor(BRAND_COLOR)
        .text(formatKRW(quote.total_amount), valX, y, { width: valW, align: 'right' })
      y += 22

      // ── 비고 ──
      if (quote.notes) {
        const noteText = quote.notes
        const noteHeight = Math.max(30, Math.min(60, 18 + noteText.length * 0.8))
        if (y + noteHeight > PAGE_H - M - 30) {
          doc.addPage()
          y = M
        }
        doc.rect(M, y, 3, noteHeight).fill('#f59e0b')
        doc.rect(M + 3, y, contentW - 3, noteHeight).fill('#fffaf0')
        doc.font(fontRegular).fontSize(7).fillColor('#888')
          .text('비고', M + 12, y + 5)
        doc.font(fontRegular).fontSize(8).fillColor('#333')
          .text(noteText, M + 12, y + 15, { width: contentW - 28, lineGap: 3 })
        y += noteHeight + 8
      }

      // ── 푸터 ──
      const footerY = PAGE_H - 30
      doc.moveTo(M, footerY).lineTo(M + contentW, footerY)
        .lineWidth(0.3).strokeColor('#ddd').stroke()
      doc.font(fontRegular).fontSize(7).fillColor('#999')
        .text(`${COMPANY.name} | ${COMPANY.tel} | ${COMPANY.address}`, M, footerY + 6)
      doc.font(fontRegular).fontSize(7).fillColor('#999')
        .text(docNumber, M, footerY + 6, { width: contentW, align: 'right' })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
