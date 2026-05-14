import type { NextConfig } from 'next'

const ALLOWED_ORIGINS = [
  'https://espothub.com',
  'https://www.espothub.com',
  'https://espot.do',
  'https://www.espot.do',
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Security headers en todas las rutas
        source: '/(.*)',
        headers: [
          // Evitar que la página se cargue en iframes (clickjacking)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Evitar que el browser detecte MIME type incorrecto
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Forzar HTTPS por 1 año, incluir subdominios
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // No enviar Referer a dominios externos
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permisos de browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        // CORS para rutas API — solo dominios propios
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: ALLOWED_ORIGINS.join(','),
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ]
  },

  // Rutas de retorno registradas en Azul → redirigen a las páginas internas.
  async redirects() {
    return [
      { source: '/pago-exitoso',   destination: '/pago/exitoso',   permanent: false },
      { source: '/pago-exitoso/',  destination: '/pago/exitoso',   permanent: false },
      { source: '/pago-declinado', destination: '/pago/fallido',   permanent: false },
      { source: '/pago-declinado/',destination: '/pago/fallido',   permanent: false },
      { source: '/pago-cancelado', destination: '/pago/cancelado', permanent: false },
      { source: '/pago-cancelado/',destination: '/pago/cancelado', permanent: false },
    ]
  },

  images: {
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
    ],
  },
}

export default nextConfig
