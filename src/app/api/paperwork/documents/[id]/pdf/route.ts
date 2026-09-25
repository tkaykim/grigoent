import { NextRequest, NextResponse } from 'next/server'
import { canAccessRow, getActor, serviceClient, type PaperworkDocRow } from '@/lib/paperwork-docs'
import { generatePaperworkPdf, paperworkPdfFilename } from '@/lib/paperwork-pdf'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  const { id } = await params
  const { data } = await serviceClient().from('paperwork_documents').select('*').eq('id', id).maybeSingle()
  const row = data as PaperworkDocRow | null
  if (!row || !canAccessRow(actor, row)) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  const pdf = await generatePaperworkPdf(row)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(paperworkPdfFilename(row))}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
