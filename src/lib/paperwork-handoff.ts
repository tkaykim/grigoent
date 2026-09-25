import crypto from 'crypto'

// 각 앱(원샷크루·deetz 등)이 자기 로그인·권한을 확인한 뒤 서명한 토큰을 붙여 grigoent로 보낸다.
// grigoent는 서명만 확인하고 작성자 쿠키를 발급한다. 담당자는 grigoent 계정이 없어도 된다.
// 비밀키 PAPERWORK_HANDOFF_SECRET 은 grigo·oneshot·dancers-bio Vercel 프로젝트에 같은 값으로 둔다.

export type PaperworkApp = 'oneshotcrew' | 'deetz' | 'grigo' | 'hq'

export interface PaperworkAuthor {
  app: PaperworkApp
  uid: string
  name: string
  email?: string
  project?: string
  projectRef?: string
  client?: string
  exp: number // unix seconds
}

export const AUTHOR_COOKIE = 'pw_author'
const HANDOFF_MAX_AGE = 10 * 60 // 앱이 만든 링크는 10분 안에 열어야 한다
export const SESSION_MAX_AGE = 12 * 60 * 60 // 작성자 쿠키는 12시간

function secret(): string {
  const s = process.env.PAPERWORK_HANDOFF_SECRET
  if (!s || s.length < 32) throw new Error('PAPERWORK_HANDOFF_SECRET missing')
  return s
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url')
}

export function signAuthor(author: PaperworkAuthor): string {
  const body = b64url(JSON.stringify(author))
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyAuthor(token: string | undefined | null): PaperworkAuthor | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  let expected: string
  try {
    expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  } catch {
    return null
  }
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const author = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PaperworkAuthor
    if (!author.uid || !author.name || !author.app) return null
    if (!['oneshotcrew', 'deetz', 'grigo', 'hq'].includes(author.app)) return null
    if (typeof author.exp !== 'number' || author.exp < Math.floor(Date.now() / 1000)) return null
    return author
  } catch {
    return null
  }
}

// 앱이 보낸 handoff 토큰(10분)을 검증해 12시간짜리 세션 토큰으로 바꾼다.
export function exchangeHandoff(handoff: string): { author: PaperworkAuthor; session: string } | null {
  const author = verifyAuthor(handoff)
  if (!author) return null
  const now = Math.floor(Date.now() / 1000)
  if (author.exp > now + HANDOFF_MAX_AGE + 60) return null // 앱이 만료를 길게 잡은 토큰은 거부
  const sessionAuthor = { ...author, exp: now + SESSION_MAX_AGE }
  return { author: sessionAuthor, session: signAuthor(sessionAuthor) }
}

export const APP_LABELS: Record<PaperworkApp, string> = {
  oneshotcrew: '원샷크루',
  deetz: 'deetz',
  grigo: 'GRIGO',
  hq: '경영지원',
}
