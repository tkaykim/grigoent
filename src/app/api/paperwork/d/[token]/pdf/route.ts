import { NextRequest, NextResponse } from 'next/server'
import { findByToken } from '@/lib/paperwork-docs'
import { generatePaperworkPdf, paperworkPdfFilename } from '@/lib/paperwork-pdf'

// 거래처용 공개 PDF. 링크(토큰)를 가진 사람만 최신 버전을 받는다.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const row = await findByToken((await params).token)
  if (!row || row.status === 'void') return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  const pdf = await generatePaperworkPdf(row)
  const disposition = req.nextUrl.searchParams.get('download') ? 'attachment' : 'inline'
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(paperworkPdfFilename(row))}`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
