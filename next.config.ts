import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['pdfkit'],
  // 거래 서류(사업자등록증·통장사본·견적서 등)는 링크 받은 사람만 보면 되므로 검색 색인 금지
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' }]
    return [
      { source: '/paperwork', headers: noindex },
      { source: '/paperwork/:path*', headers: noindex },
      { source: '/api/paperwork/:path*', headers: noindex },
    ]
  },
  outputFileTracingIncludes: {
    '/api/quotes/send': ['./public/fonts/**/*'],
  },
}

export default nextConfig
