import { notFound } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { getSpaceBySlug } from '@/lib/actions/marketplace'
import { isHostProById } from '@/lib/actions/subscription'
import { getCategoryLabel } from '@/lib/categories'
import { consumptionLabel } from '@/lib/pricing'
import { formatCurrency } from '@/lib/utils'
import { ShareButton } from '@/components/ShareButton'
import { MapPin, Users, CalendarDays, Crown } from 'lucide-react'

export const dynamic = 'force-dynamic'
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://espot.do'

// Tarjeta digital del espacio — página pública compartible (Espot Pro).
export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const space = await getSpaceBySlug(slug)
  if (!space) notFound()

  // La tarjeta digital es exclusiva de Espot Pro: si el host no es Pro, no existe.
  const isPro = await isHostProById(space.host_id)
  if (!isPro) notFound()

  const cover    = space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url
  const pricing  = space.space_pricing?.find((p: any) => p.is_active) ?? space.space_pricing?.[0]
  const location = [space.sector, space.city].filter(Boolean).join(', ')
  const cardUrl  = `${SITE}/t/${slug}`
  const qr       = await QRCode.toDataURL(cardUrl, { width: 240, margin: 1 })

  const isHourly  = pricing?.pricing_type === 'hourly'
  const priceLine = isHourly && pricing.hourly_price
    ? `${formatCurrency(Number(pricing.hourly_price))} / hora`
    : 'Consultar precio'

  return (
    <div className="white-theme min-h-dvh flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
        {/* Portada */}
        <div className="relative h-48" style={{ background: 'var(--bg-elevated)' }}>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={space.name} className="w-full h-full object-cover" />
          )}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
            style={{ background: 'var(--pro-dim)', color: 'var(--pro-strong)', border: '1px solid var(--pro-border)' }}>
            <Crown size={11} style={{ color: 'var(--pro)' }} /> Espot Pro
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--brand)' }}>{getCategoryLabel(space.category)}</div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{space.name}</h1>
          </div>

          <div className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {location && <div className="flex items-center gap-2"><MapPin size={15} style={{ color: 'var(--text-muted)' }} />{location}</div>}
            {space.capacity_max && <div className="flex items-center gap-2"><Users size={15} style={{ color: 'var(--text-muted)' }} />Hasta {space.capacity_max} personas</div>}
          </div>

          {/* Precio */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{priceLine}</div>
            {isHourly && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{consumptionLabel(pricing.is_consumable)}</div>
            )}
          </div>

          {/* CTA */}
          <Link href={`/espacios/${slug}`}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            <CalendarDays size={16} /> Solicitar fecha
          </Link>

          {/* QR + compartir */}
          <div className="flex items-center gap-4 pt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Código QR de la tarjeta" width={92} height={92} className="rounded-xl" style={{ border: '1px solid var(--border-subtle)' }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Escanea o comparte este espacio</div>
              <ShareButton url={cardUrl} title={space.name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
            </div>
          </div>

          <div className="text-center pt-1">
            <Link href="/" className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Hecho con Espot</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
