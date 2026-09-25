import { NextRequest, NextResponse } from 'next/server'
import { isPaperworkFile, loadPaperworkFile, paperworkDownloadName } from '@/lib/paperwork-files'

// 사업자등록증·통장사본 프록시. 링크를 받은 거래처는 자유롭게 보되, 검색엔진에는 색인되지 않게 한다.
export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  if (!isPaperworkFile(file)) return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
  let body: Buffer
  try {
    body = await loadPaperworkFile(file)
  } catch {
    return NextResponse.json({ error: '파일을 불러오지 못했습니다.' }, { status: 502 })
  }
  const disposition = req.nextUrl.searchParams.get('download') ? 'attachment' : 'inline'
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(paperworkDownloadName(file))}`,
      'Cache-Control': 'private, max-age=300',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  })
}
