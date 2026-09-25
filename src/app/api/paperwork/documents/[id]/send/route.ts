import { NextRequest, NextResponse } from 'next/server'
import { canAccessRow, getActor, latestInGroup, publicDocUrl, serviceClient, siteOrigin, type PaperworkDocRow } from '@/lib/paperwork-docs'
import { deliverDocument, groupToken } from '@/lib/paperwork-deliver'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  const { id } = await params
  const { data } = await serviceClient().from('paperwork_documents').select('*').eq('id', id).maybeSingle()
  const row = data as PaperworkDocRow | null
  if (!row || !canAccessRow(actor, row)) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  const latest = await latestInGroup(row.group_id)
  if (latest?.id !== row.id || row.status === 'void') return NextResponse.json({ error: '최신 문서만 보낼 수 있습니다.' }, { status: 409 })
  const body = (await req.json().catch(() => ({}))) as { to?: string }
  const token = await groupToken(row)
  if (!token) return NextResponse.json({ error: '링크를 만들지 못했습니다.' }, { status: 500 })
  const sent = await deliverDocument(row, publicDocUrl(siteOrigin(req), token), body.to)
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 400 })
  return NextResponse.json({ document: sent.row })
}
