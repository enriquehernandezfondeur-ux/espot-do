import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Rutas de retorno registradas en Azul → redirigen a las páginas internas.
  // Azul appenda sus params (OrderNumber, AuthHash, IsoCode…) automáticamente
  // y Next.js los preserva en el redirect.
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
