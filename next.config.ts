import type { NextConfig } from 'next'

const ALLOWED_ORIGINS = [
  'https://espothub.com',
  'https://www.espothub.com',
  'https://espot.do',
  'https://www.espot.do',
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress:        true,
  reactStrictMode: true,
  typedRoutes:     false,

  turbopack: {},

  experimental: {
    optimizeCss:       true,
    scrollRestoration: true,
  },

  images: {
    formats:          ['image/webp', 'image/avif'],
    deviceSizes:      [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes:       [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL:  60 * 60 * 24 * 30,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vgwstcpewywkpookvktk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  async headers() {
    const supabaseHost = 'vgwstcpewywkpookvktk.supabase.co'
    const csp = [
      "default-src 'self'",
      // Next.js App Router necesita 'unsafe-inline' para scripts de hidratación
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: blob: https://${supabaseHost} https://images.unsplash.com https://*.googleusercontent.com https://lh3.googleusercontent.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com`,
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://pagos.azul.com.do https://pruebas.azul.com.do https://nominatim.openstreetmap.org`,
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')

    return [
      // Security headers — todas las rutas
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',             value: 'DENY' },
          { key: 'X-Content-Type-Options',       value: 'nosniff' },
          { key: 'Strict-Transport-Security',    value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',           value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
          { key: 'X-XSS-Protection',             value: '1; mode=block' },
          { key: 'Content-Security-Policy',      value: csp },
        ],
      },
      // CORS — el origin correcto se resuelve dinámicamente en el middleware (proxy.ts)
      // Access-Control-Allow-Origin no puede tener múltiples valores — se maneja en proxy
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
          { key: 'Access-Control-Max-Age',       value: '86400' },
        ],
      },
      // PWA — service worker y manifest
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',        value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  async redirects() {
    return [
      { source: '/pago-exitoso',    destination: '/pago/exitoso',   permanent: false },
      { source: '/pago-exitoso/',   destination: '/pago/exitoso',   permanent: false },
      { source: '/pago-declinado',  destination: '/pago/fallido',   permanent: false },
      { source: '/pago-declinado/', destination: '/pago/fallido',   permanent: false },
      { source: '/pago-cancelado',  destination: '/pago/cancelado', permanent: false },
      { source: '/pago-cancelado/', destination: '/pago/cancelado', permanent: false },
    ]
  },
}

export default nextConfig
