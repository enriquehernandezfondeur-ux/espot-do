import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from '@/lib/notifications'
import "./globals.css";

// Tipografía oficial de marca Espot — Poppins (Manual de marca)
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
})

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  robots: { index: true, follow: true },
  title: {
    default:  'espot.do — Espacios a tu alcance en República Dominicana',
    template: '%s | espot.do',
  },
  // Favicon e iconos oficiales de Espot — configuración ÚNICA y centralizada
  // para toda la plataforma (marketplace, dashboards cliente/host, admin, auth…).
  // Todos los tamaños se generan desde public/Favicon.png (ver scripts/gen-icons.js).
  icons: {
    icon: [
      { url: '/favicon.ico',       sizes: '48x48', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png',      sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png',      sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  description: 'Reserva salones, rooftops, restaurantes y más para tu próximo evento en República Dominicana. Explora los mejores espacios y reserva el que más te convenga.',
  keywords: ['espacios para eventos', 'salones de eventos', 'reservar espacio Santo Domingo', 'rooftop RD', 'venue República Dominicana'],
  openGraph: {
    type:        'website',
    locale:      'es_DO',
    url:          BASE_URL,
    siteName:    'espot.do',
    title:       'espot.do — Espacios a tu alcance en RD',
    description: 'Salones, rooftops, restaurantes y más para eventos en República Dominicana.',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'espot.do — Espacios a tu alcance en RD',
    description: 'Salones, rooftops, restaurantes y más en República Dominicana.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
