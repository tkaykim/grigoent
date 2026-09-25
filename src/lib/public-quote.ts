import type { QuoteItem } from '@/lib/types'

// 고객용 견적 링크(/quote/[token])에 노출해도 되는 필드만 담는다.
// id·view_token·연락처·inquiry_id·내부 상태값은 내보내지 않는다.
export interface PublicQuote {
  doc_number: string
  client_name: string
  client_company: string
  project_title: string
  project_type: string
  items: QuoteItem[]
  supply_amount: number
  vat: number
  total_amount: number
  valid_until: string | null
  notes: string
  sent_at: string | null
  client_response: 'pending' | 'approved' | 'revision_requested' | 'rejected' | null
}

// 견적 view_token 조회에 필요한 컬럼
export const PUBLIC_QUOTE_COLUMNS =
  'id, client_name, client_company, project_title, project_type, items, supply_amount, vat, total_amount, valid_until, notes, sent_at, client_response'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidViewToken(token: unknown): token is string {
  return typeof token === 'string' && UUID_RE.test(token)
}

export function getQuoteDocNumber(id: string): string {
  const numericPart = id.replace(/\D/g, '').slice(-6)
  return `GRG-${numericPart.padStart(6, '0')}`
}

export function toPublicQuote(row: any): PublicQuote {
  return {
    doc_number: getQuoteDocNumber(row.id),
    client_name: row.client_name ?? '',
    client_company: row.client_company ?? '',
    project_title: row.project_title ?? '',
    project_type: row.project_type ?? '',
    items: row.items ?? [],
    supply_amount: row.supply_amount ?? 0,
    vat: row.vat ?? 0,
    total_amount: row.total_amount ?? 0,
    valid_until: row.valid_until ?? null,
    notes: row.notes ?? '',
    sent_at: row.sent_at ?? null,
    client_response: row.client_response ?? null,
  }
}
