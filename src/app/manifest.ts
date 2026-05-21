import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '그리고 엔터테인먼트',
    short_name: 'GRIGO ENT',
    description:
      '댄서·안무가 섭외, 안무제작, 뮤직비디오 및 광고 제작 — 그리고 엔터테인먼트',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#000000',
    lang: 'ko-KR',
    categories: ['entertainment', 'business'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
