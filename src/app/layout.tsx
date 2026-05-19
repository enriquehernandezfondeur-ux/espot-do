import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from '@/lib/notifications'
import { getThemeColors } from '@/lib/actions/admin'
import "./globals.css";

// Mapeo de claves de la DB → variables CSS
const CSS_VAR_MAP: Record<string, string> = {
  theme_brand:        '--brand',
  theme_brand_dark:   '--brand-dark',
  theme_brand_light:  '--brand-light',
  theme_brand_navy:   '--brand-navy',
  theme_brand_lime:   '--brand-lime',
}

// Valida que el valor sea un color CSS seguro (hex, rgb, hsl, named)
function isSafeColor(v: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(v) ||
    /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+/.test(v) ||
    /^hsla?\(/.test(v)
}

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
  icons: {
    icon:    [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inyectar colores del tema desde la DB — falls back silently si falla
  const themeColors = await getThemeColors()
  const cssVars = Object.entries(CSS_VAR_MAP)
    .map(([key, cssVar]) => {
      const val = themeColors[key]
      return val && isSafeColor(val) ? `${cssVar}: ${val};` : null
    })
    .filter(Boolean)
    .join(' ')

  return (
    <html
      lang="es"
      className={`${poppins.variable} h-full antialiased`}
    >
      <head>
        {cssVars && (
          <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
