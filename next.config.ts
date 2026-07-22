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
  outputFileTracingIncludes: {
    '/api/quotes/send': ['./public/fonts/**/*'],
  },
}

export default nextConfig
