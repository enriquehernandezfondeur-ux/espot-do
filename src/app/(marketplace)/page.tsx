import { type Metadata } from 'next'
import { getPublishedSpaces } from '@/lib/actions/marketplace'
import HeroParallax from '@/components/marketplace/HeroParallax'
import HomepageSections from '@/components/marketplace/HomepageSections'

export const metadata: Metadata = {
  title: 'Reserva el espacio perfecto para tu evento en República Dominicana',
  description: 'Encuentra y reserva salones, rooftops, restaurantes, villas y más para cumpleaños, bodas, eventos corporativos y celebraciones en RD. Confirmación en 24h.',
  openGraph: {
    title: 'EspotHub — Espacios para eventos en República Dominicana',
    description: 'Salones, rooftops, restaurantes y más. Confirmación en 24h.',
    type: 'website',
  },
}

export default async function HomePage() {
  const spaces = await getPublishedSpaces()

  return (
    <div style={{ background: '#fff' }}>
      <HeroParallax spaceCount={spaces.length} />
      <HomepageSections spaces={spaces} />
    </div>
  )
}
