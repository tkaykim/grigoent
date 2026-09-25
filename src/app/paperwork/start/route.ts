import { NextRequest, NextResponse } from 'next/server'
import { AUTHOR_COOKIE, SESSION_MAX_AGE, exchangeHandoff } from '@/lib/paperwork-handoff'

// 앱(원샷크루·deetz 등)이 서명해 보낸 담당자 정보를 확인하고 작성자 쿠키를 발급한다.
export async function GET(req: NextRequest) {
  const h = req.nextUrl.searchParams.get('h')
  const result = h ? exchangeHandoff(h) : null
  const dest = new URL('/paperwork/share', req.nextUrl.origin)
  if (!result) {
    dest.searchParams.set('expired', '1')
    return NextResponse.redirect(dest)
  }
  const { author, session } = result
  if (author.project) dest.searchParams.set('project', author.project)
  if (author.client) dest.searchParams.set('to', author.client)
  dest.searchParams.set('from', author.name)
  const res = NextResponse.redirect(dest)
  res.cookies.set(AUTHOR_COOKIE, session, {
    httpOnly: true,
    secure: req.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
