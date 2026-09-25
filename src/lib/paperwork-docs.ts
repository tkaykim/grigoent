import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'
import { AUTHOR_COOKIE, verifyAuthor, type PaperworkAuthor } from '@/lib/paperwork-handoff'
import type { PaperworkAccount } from '@/lib/company-paperwork'

export type PaperworkDocType = 'quote' | 'statement'
export type VatMode = 'separate' | 'included'
export type AttachDoc = 'brn' | 'bank'

export const DOC_TYPE_LABELS: Record<PaperworkDocType, string> = {
  quote: '견적서',
  statement: '거래명세서',
}

export interface PaperworkItem {
  name: string
  spec?: string
  qty: number
  unitPrice: number
}

export interface PaperworkDocInput {
  docType: PaperworkDocType
  account: PaperworkAccount
  clientCompany: string
  clientContact?: string
  clientEmail?: string
  projectTitle?: string
  items: PaperworkItem[]
  vatMode: VatMode
  issuedDate?: string
  validUntil?: string | null
  notes?: string
  attachDocs?: AttachDoc[]
}

export interface PaperworkDocRow {
  id: string
  group_id: string
  version: number
  doc_type: PaperworkDocType
  doc_no: string
  status: 'issued' | 'superseded' | 'void'
  account: PaperworkAccount
  source_app: string
  source_ref: string | null
  author_name: string
  author_email: string | null
  author_ref: string | null
  client_company: string
  client_contact: string | null
  client_email: string | null
  project_title: string | null
  items: PaperworkItem[]
  vat_mode: VatMode
  supply_amount: number
  vat_amount: number
  total_amount: number
  issued_date: string
  valid_until: string | null
  notes: string | null
  attach_docs: AttachDoc[]
  view_token: string | null
  sent_at: string | null
  sent_to: string | null
  edited_by: string | null
  edit_note: string | null
  created_at: string
}

export function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export function lineAmount(item: PaperworkItem): number {
  return Math.round(item.qty * item.unitPrice)
}

// 공급가액·부가세·합계. included 는 품목 금액이 부가세 포함가라는 뜻이다.
export function computeTotals(items: PaperworkItem[], vatMode: VatMode) {
  const sum = items.reduce((s, i) => s + lineAmount(i), 0)
  if (vatMode === 'included') {
    const supply = Math.round(sum / 1.1)
    return { supply, vat: sum - supply, total: sum }
  }
  const vat = Math.round(sum * 0.1)
  return { supply: sum, vat, total: sum + vat }
}

const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const n = (v: unknown) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, '')))

// 요청 본문 검증. 실패 시 사람이 읽을 수 있는 오류 문자열을 던진다.
export function parseDocInput(body: Record<string, unknown>): PaperworkDocInput {
  const docType = body.docType === 'statement' ? 'statement' : 'quote'
  const account: PaperworkAccount = body.account === 'react' ? 'react' : 'enter'
  const vatMode: VatMode = body.vatMode === 'included' ? 'included' : 'separate'
  const clientCompany = s(body.clientCompany, 100)
  if (!clientCompany) throw new Error('받는 곳(상호)을 입력해 주세요.')
  const clientEmail = s(body.clientEmail, 200)
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) throw new Error('받는 분 이메일 형식을 확인해 주세요.')
  const rawItems = Array.isArray(body.items) ? body.items : []
  const items: PaperworkItem[] = rawItems
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>
      return { name: s(o.name, 120), spec: s(o.spec, 200) || undefined, qty: n(o.qty), unitPrice: n(o.unitPrice) }
    })
    .filter((i) => i.name)
  if (!items.length) throw new Error('품목을 1개 이상 입력해 주세요.')
  if (items.length > 50) throw new Error('품목은 50개까지 입력할 수 있습니다.')
  for (const i of items) {
    if (!Number.isFinite(i.qty) || i.qty <= 0 || i.qty > 100000) throw new Error(`「${i.name}」 수량을 확인해 주세요.`)
    if (!Number.isFinite(i.unitPrice) || i.unitPrice < 0 || i.unitPrice > 10_000_000_000) throw new Error(`「${i.name}」 단가를 확인해 주세요.`)
  }
  const date = (v: unknown) => {
    const d = s(v, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined
  }
  const attachDocs = (Array.isArray(body.attachDocs) ? body.attachDocs : []).filter((d): d is AttachDoc => d === 'brn' || d === 'bank')
  return {
    docType,
    account,
    clientCompany,
    clientContact: s(body.clientContact, 60) || undefined,
    clientEmail: clientEmail || undefined,
    projectTitle: s(body.projectTitle, 120) || undefined,
    items,
    vatMode,
    issuedDate: date(body.issuedDate),
    validUntil: docType === 'quote' ? date(body.validUntil) ?? null : null,
    notes: s(body.notes, 2000) || undefined,
    attachDocs,
  }
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

// 문서번호: Q260926-001(견적) / S260926-001(거래명세서). 새 버전은 기존 번호 뒤에 -v2.
export async function nextDocNo(docType: PaperworkDocType, issuedDate?: string): Promise<string> {
  const prefix = `${docType === 'quote' ? 'Q' : 'S'}${(issuedDate ?? kstToday()).replace(/-/g, '').slice(2)}-`
  const { data } = await serviceClient()
    .from('paperwork_documents')
    .select('doc_no')
    .like('doc_no', `${prefix}%`)
    .eq('version', 1)
    .order('doc_no', { ascending: false })
    .limit(1)
  const last = data?.[0]?.doc_no as string | undefined
  const seq = last ? parseInt(last.slice(prefix.length, prefix.length + 3), 10) + 1 : 1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

export function newViewToken(): string {
  return crypto.randomBytes(18).toString('base64url')
}

export function rowFromInput(input: PaperworkDocInput) {
  const { supply, vat, total } = computeTotals(input.items, input.vatMode)
  return {
    doc_type: input.docType,
    account: input.account,
    client_company: input.clientCompany,
    client_contact: input.clientContact ?? null,
    client_email: input.clientEmail ?? null,
    project_title: input.projectTitle ?? null,
    items: input.items,
    vat_mode: input.vatMode,
    supply_amount: supply,
    vat_amount: vat,
    total_amount: total,
    issued_date: input.issuedDate ?? kstToday(),
    valid_until: input.validUntil ?? null,
    notes: input.notes ?? null,
    attach_docs: input.attachDocs ?? [],
  }
}

// 요청자: 앱에서 넘어온 담당자(쿠키) 또는 grigoent 관리자(Bearer).
export type PaperworkActor =
  | { kind: 'author'; author: PaperworkAuthor }
  | { kind: 'admin'; userId: string }

export async function getAuthorFromCookie(): Promise<PaperworkAuthor | null> {
  const jar = await cookies()
  return verifyAuthor(jar.get(AUTHOR_COOKIE)?.value)
}

export async function getActor(req: NextRequest): Promise<PaperworkActor | null> {
  if (req.headers.get('authorization')) {
    const admin = await assertAdminFromRequest(req, 'paperwork')
    if (admin.ok) return { kind: 'admin', userId: admin.userId }
  }
  const author = await getAuthorFromCookie()
  return author ? { kind: 'author', author } : null
}

// 담당자는 자기가 만든 문서 그룹만 다룬다. 관리자는 전부.
export function canAccessRow(actor: PaperworkActor, row: Pick<PaperworkDocRow, 'source_app' | 'author_ref'>): boolean {
  if (actor.kind === 'admin') return true
  return row.source_app === actor.author.app && row.author_ref === actor.author.uid
}

export async function latestInGroup(groupId: string): Promise<PaperworkDocRow | null> {
  const { data } = await serviceClient()
    .from('paperwork_documents')
    .select('*')
    .eq('group_id', groupId)
    .order('version', { ascending: false })
    .limit(1)
  return (data?.[0] as PaperworkDocRow | undefined) ?? null
}

export async function findByToken(token: string): Promise<PaperworkDocRow | null> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null
  const { data } = await serviceClient().from('paperwork_documents').select('group_id').eq('view_token', token).maybeSingle()
  if (!data) return null
  return latestInGroup(data.group_id as string)
}

export function publicDocUrl(origin: string, token: string): string {
  return `${origin}/paperwork/d/${token}`
}

// 실제 요청 주소를 우선한다(운영=www.grigoent.co.kr). 로컬 env 의 NEXT_PUBLIC_SITE_URL 은 포트가 달라 신뢰하지 않는다.
export function siteOrigin(req?: NextRequest): string {
  return req?.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.grigoent.co.kr'
}
