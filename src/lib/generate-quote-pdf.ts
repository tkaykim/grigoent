import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import type { QuoteItem } from '@/lib/types'

const BRAND_COLOR = '#111111'
const PAGE_W = 595.28 // A4
const PAGE_H = 841.89
const M = 50 // margin

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

export async function generateQuotePdf(input: GenerateQuotePdfInput): Promise<Buffer> {
  const { quote, clientName, clientCompany, projectTitle } = input
  const numericPart = quote.id.replace(/\D/g, '').slice(-6)
  const docNumber = `GE-${numericPart.padStart(6, '0')}`

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
      doc.font(fontBold).fontSize(18).fillColor(BRAND_COLOR)
        .text('그리고 엔터테인먼트', M, M)
      doc.font(fontRegular).fontSize(9).fillColor('#888')
        .text('GRIGO Entertainment', M, doc.y + 2)

      doc.font(fontRegular).fontSize(18).fillColor('#333')
        .text('견 적 서', M, M, { width: contentW, align: 'right' })
      doc.fontSize(9).fillColor('#888')
        .text(`No. ${docNumber}`, M, doc.y + 2, { width: contentW, align: 'right' })

      const headerEndY = Math.max(doc.y, M + 50)
      doc.moveTo(M, headerEndY + 8).lineTo(M + contentW, headerEndY + 8)
        .lineWidth(3).strokeColor(BRAND_COLOR).stroke()

      let y = headerEndY + 24

      // ── 발행자 정보 ──
      doc.rect(M, y, contentW, 52).fill('#fafafa')
      y += 10
      const issuerData = [
        ['상호', '(주) 그리고 엔터테인먼트'],
        ['대표자', '-'],
        ['업태 / 종목', '서비스업 / 공연, 엔터테인먼트'],
      ]
      for (const [label, value] of issuerData) {
        doc.font(fontRegular).fontSize(8).fillColor('#888')
          .text(label, M + 12, y, { width: 70 })
        doc.font(fontRegular).fontSize(9).fillColor('#333')
          .text(value, M + 82, y)
        y += 14
      }
      y += 8

      // ── 프로젝트 ──
      if (projectTitle) {
        doc.rect(M, y, 4, 40).fill(BRAND_COLOR)
        doc.rect(M + 4, y, contentW - 4, 40).fill('#f8f8f8')
        doc.font(fontRegular).fontSize(8).fillColor('#888')
          .text('PROJECT', M + 16, y + 8)
        doc.font(fontBold).fontSize(14).fillColor(BRAND_COLOR)
          .text(projectTitle, M + 16, y + 22)
        y += 52
      }

      // ── 정보 카드 ──
      const cardW = (contentW - 20) / 3
      const cards = [
        ['수신', `${clientName}님${clientCompany ? ` (${clientCompany})` : ''}`],
        ['발행일', new Date().toLocaleDateString('ko-KR')],
        ['유효기간', quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('ko-KR') : '-'],
      ]
      for (let i = 0; i < 3; i++) {
        const cx = M + i * (cardW + 10)
        doc.rect(cx, y, cardW, 40).fill('#f8f8f8')
        doc.font(fontRegular).fontSize(8).fillColor('#888')
          .text(cards[i][0], cx + 10, y + 8, { width: cardW - 20 })
        doc.font(fontBold).fontSize(11).fillColor('#333')
          .text(cards[i][1], cx + 10, y + 22, { width: cardW - 20 })
      }
      y += 54

      // ── 품목 테이블 ──
      const colWidths = [contentW * 0.15, contentW * 0.30, contentW * 0.15, contentW * 0.20, contentW * 0.20]
      const headers = ['카테고리', '품목명', '수량', '단가', '금액']
      const ROW_H = 26

      doc.rect(M, y, contentW, ROW_H).fill(BRAND_COLOR)
      let cx = M
      for (let i = 0; i < headers.length; i++) {
        const align = i >= 3 ? 'right' : i === 2 ? 'center' : 'left'
        doc.font(fontBold).fontSize(9).fillColor('#ffffff')
          .text(headers[i], cx + 8, y + 8, { width: colWidths[i] - 16, align })
        cx += colWidths[i]
      }
      y += ROW_H

      const items = quote.items ?? []
      for (let idx = 0; idx < items.length; idx++) {
        if (y + ROW_H > PAGE_H - M - 40) {
          doc.addPage()
          y = M
        }
        const item = items[idx]
        if (idx % 2 === 1) {
          doc.rect(M, y, contentW, ROW_H).fill('#fafafa')
        }
        doc.moveTo(M, y + ROW_H).lineTo(M + contentW, y + ROW_H)
          .lineWidth(0.5).strokeColor('#eee').stroke()

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
          doc.font(f).fontSize(9).fillColor('#333')
            .text(rowData[i], cx + 8, y + 8, { width: colWidths[i] - 16, align })
          cx += colWidths[i]
        }
        y += ROW_H
      }

      // ── 합계 ──
      y += 12
      const labelX = M + contentW - 240
      const valX = M + contentW - 130
      const valW = 120

      doc.font(fontRegular).fontSize(10).fillColor('#666')
        .text('공급가액', labelX, y, { width: 100, align: 'right' })
      doc.font(fontRegular).fontSize(10).fillColor('#333')
        .text(formatKRW(quote.supply_amount), valX, y, { width: valW, align: 'right' })
      y += 18

      doc.font(fontRegular).fontSize(10).fillColor('#666')
        .text('부가세 (10%)', labelX, y, { width: 100, align: 'right' })
      doc.font(fontRegular).fontSize(10).fillColor('#333')
        .text(formatKRW(quote.vat), valX, y, { width: valW, align: 'right' })
      y += 22

      doc.moveTo(labelX, y).lineTo(M + contentW, y)
        .lineWidth(2).strokeColor(BRAND_COLOR).stroke()
      y += 6

      doc.font(fontBold).fontSize(13).fillColor(BRAND_COLOR)
        .text('합계', labelX, y, { width: 100, align: 'right' })
      doc.font(fontBold).fontSize(14).fillColor(BRAND_COLOR)
        .text(formatKRW(quote.total_amount), valX, y, { width: valW, align: 'right' })
      y += 30

      // ── 비고 ──
      if (quote.notes) {
        doc.rect(M, y, 4, 60).fill('#f59e0b')
        doc.rect(M + 4, y, contentW - 4, 60).fill('#fffaf0')
        doc.font(fontRegular).fontSize(8).fillColor('#888')
          .text('비고', M + 16, y + 8)
        doc.font(fontRegular).fontSize(9).fillColor('#333')
          .text(quote.notes, M + 16, y + 22, { width: contentW - 40, lineGap: 4 })
      }

      // ── 푸터 ──
      doc.moveTo(M, PAGE_H - 40).lineTo(M + contentW, PAGE_H - 40)
        .lineWidth(0.5).strokeColor('#eee').stroke()
      doc.font(fontRegular).fontSize(8).fillColor('#999')
        .text('(주) 그리고 엔터테인먼트 | GRIGO Entertainment', M, PAGE_H - 30)
      doc.font(fontRegular).fontSize(8).fillColor('#999')
        .text(docNumber, M, PAGE_H - 30, { width: contentW, align: 'right' })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
