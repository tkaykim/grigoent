import '@/lib/pdf-fonts'
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { PDF_FONT_FAMILY } from '@/lib/pdf-fonts'
import type { QuoteItem } from '@/lib/types'

const BRAND_COLOR = '#111111'
const ACCENT_COLOR = '#333333'

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 3,
    borderBottomColor: BRAND_COLOR,
    paddingBottom: 14,
    marginBottom: 24,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: BRAND_COLOR,
    letterSpacing: 1,
  },
  companyNameEn: {
    fontSize: 9,
    color: '#888',
    marginTop: 2,
  },
  titleBlock: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontWeight: 400,
    letterSpacing: 8,
    color: ACCENT_COLOR,
  },
  docNumber: {
    fontSize: 9,
    color: '#888',
    marginTop: 4,
  },
  issuerInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 4,
  },
  issuerRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  issuerLabel: {
    fontSize: 8,
    color: '#888',
    width: 80,
  },
  issuerValue: {
    fontSize: 9,
    color: '#333',
  },
  projectBlock: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLOR,
    borderRadius: 4,
  },
  projectLabel: {
    fontSize: 8,
    color: '#888',
    letterSpacing: 1,
    marginBottom: 4,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: BRAND_COLOR,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  infoCardLabel: {
    fontSize: 8,
    color: '#888',
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 12,
    fontWeight: 700,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLOR,
    borderRadius: 2,
  },
  tableHeaderCell: {
    padding: 8,
    fontSize: 9,
    fontWeight: 700,
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafafa',
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    width: 100,
    textAlign: 'right',
    paddingRight: 12,
  },
  summaryValue: {
    fontSize: 10,
    width: 120,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: BRAND_COLOR,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: 700,
    width: 100,
    textAlign: 'right',
    paddingRight: 12,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 700,
    width: 120,
    textAlign: 'right',
    color: BRAND_COLOR,
  },
  notesBlock: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fffaf0',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 8,
    color: '#888',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#999',
  },
})

function formatKRW(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString('ko-KR') + '원'
}

interface QuoteDocumentProps {
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

export function buildQuoteDocument({
  quote,
  clientName,
  clientCompany,
  projectTitle,
}: QuoteDocumentProps) {
  const numericPart = quote.id.replace(/\D/g, '').slice(-6)
  const docNumber = `GE-${numericPart.padStart(6, '0')}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>그리고 엔터테인먼트</Text>
            <Text style={styles.companyNameEn}>GRIGO Entertainment</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>견 적 서</Text>
            <Text style={styles.docNumber}>No. {docNumber}</Text>
          </View>
        </View>

        {/* 발행자 정보 */}
        <View style={styles.issuerInfo}>
          <View style={styles.issuerRow}>
            <Text style={styles.issuerLabel}>상호</Text>
            <Text style={styles.issuerValue}>(주) 그리고 엔터테인먼트</Text>
          </View>
          <View style={styles.issuerRow}>
            <Text style={styles.issuerLabel}>대표자</Text>
            <Text style={styles.issuerValue}>-</Text>
          </View>
          <View style={styles.issuerRow}>
            <Text style={styles.issuerLabel}>업태 / 종목</Text>
            <Text style={styles.issuerValue}>서비스업 / 공연, 엔터테인먼트</Text>
          </View>
        </View>

        {/* 프로젝트 */}
        {projectTitle && (
          <View style={styles.projectBlock}>
            <Text style={styles.projectLabel}>PROJECT</Text>
            <Text style={styles.projectTitle}>{projectTitle}</Text>
          </View>
        )}

        {/* 정보 카드 */}
        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>수신</Text>
            <Text style={styles.infoCardValue}>
              {clientName}님{clientCompany ? ` (${clientCompany})` : ''}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>발행일</Text>
            <Text style={styles.infoCardValue}>
              {new Date().toLocaleDateString('ko-KR')}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>유효기간</Text>
            <Text style={styles.infoCardValue}>
              {quote.valid_until
                ? new Date(quote.valid_until).toLocaleDateString('ko-KR')
                : '-'}
            </Text>
          </View>
        </View>

        {/* 품목 테이블 */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '15%' }]}>카테고리</Text>
          <Text style={[styles.tableHeaderCell, { width: '30%' }]}>품목명</Text>
          <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>수량</Text>
          <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>단가</Text>
          <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>금액</Text>
        </View>
        {(quote.items ?? []).map((item, i) => (
          <View
            key={i}
            style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            <Text style={[styles.tableCell, { width: '15%' }]}>
              {item.category || ''}
            </Text>
            <Text style={[styles.tableCell, { width: '30%' }]}>{item.name}</Text>
            <Text style={[styles.tableCell, { width: '15%', textAlign: 'center' }]}>
              {item.qty}
              {item.unit || ''}
            </Text>
            <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
              {formatKRW(item.unit_price)}
            </Text>
            <Text
              style={[
                styles.tableCell,
                { width: '20%', textAlign: 'right', fontWeight: 700 },
              ]}
            >
              {formatKRW(item.amount)}
            </Text>
          </View>
        ))}

        {/* 합계 */}
        <View style={{ marginTop: 12 }}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>공급가액</Text>
            <Text style={styles.summaryValue}>
              {formatKRW(quote.supply_amount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>부가세 (10%)</Text>
            <Text style={styles.summaryValue}>{formatKRW(quote.vat)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>합계</Text>
            <Text style={styles.totalValue}>
              {formatKRW(quote.total_amount)}
            </Text>
          </View>
        </View>

        {/* 비고 */}
        {quote.notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>비고</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* 푸터 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            (주) 그리고 엔터테인먼트 | GRIGO Entertainment
          </Text>
          <Text style={styles.footerText}>{docNumber}</Text>
        </View>
      </Page>
    </Document>
  )
}
