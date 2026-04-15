import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    '/api/quotes/send': [
      './public/fonts/**/*',
      './node_modules/pdfkit/js/data/**/*',
    ],
  },
}

export default nextConfig
