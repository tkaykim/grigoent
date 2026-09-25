import { NextResponse } from 'next/server'
import { getAuthorFromCookie } from '@/lib/paperwork-docs'
import { APP_LABELS } from '@/lib/paperwork-handoff'

export async function GET() {
  const author = await getAuthorFromCookie()
  if (!author) return NextResponse.json({ author: null })
  return NextResponse.json({
    author: {
      app: author.app,
      appLabel: APP_LABELS[author.app],
      name: author.name,
      email: author.email ?? null,
      project: author.project ?? null,
      client: author.client ?? null,
    },
  })
}
