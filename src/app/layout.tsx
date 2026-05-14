import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
