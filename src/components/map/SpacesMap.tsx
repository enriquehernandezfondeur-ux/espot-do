'use client'

import { useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Space {
  id: string
  name: string
  slug: string
  lat?: number
  lng?: number
  category: string
  sector?: string
  city: string
  capacity_max: number
  space_pricing?: any[]
  space_images?: any[]
}

interface Props {
  spaces: Space[]
  onSpaceClick?: (slug: string) => void
}

const CATEGORY_EMOJI: Record<string, string> = {
  salon: '🏛️', restaurante: '🍽️', bar: '🍸', rooftop: '🌆',
  terraza: '🌿', estudio: '🎬', coworking: '💼', hotel: '🏨',
  villa: '🏡', otro: '📍',
}

// Coordenadas aproximadas de sectores de Santo Domingo
const SECTOR_COORDS: Record<string, [number, number]> = {
  'Piantini':       [18.4733, -69.9388],
  'Naco':           [18.4756, -69.9317],
  'Bella Vista':    [18.4642, -69.9398],
  'Arroyo Hondo':   [18.4892, -69.9637],
  'Gazcue':         [18.4741, -69.9089],
  'Evaristo Morales':[18.4783, -69.9265],
  'Los Prados':     [18.4851, -69.9431],
  'La Esperilla':   [18.4695, -69.9212],
  'Serrallés':      [18.4600, -69.9318],
  'default':        [18.4861, -69.9312], // Centro SD
}

function getCoords(space: Space): [number, number] {
  if (space.lat && space.lng) return [space.lat, space.lng]
  if (space.sector && SECTOR_COORDS[space.sector]) return SECTOR_COORDS[space.sector]
  // Añadir pequeño offset aleatorio para no stackear pins
  const base = SECTOR_COORDS['default']
  return [base[0] + (Math.random() - 0.5) * 0.02, base[1] + (Math.random() - 0.5) * 0.02]
}

function getPrice(space: Space): string | null {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly') return `${formatCurrency(p.hourly_price)}/hr`
  if (p.pricing_type === 'minimum_consumption') return `Min. ${formatCurrency(p.minimum_consumption)}`
  if (p.pricing_type === 'fixed_package') return formatCurrency(p.fixed_price)
  return 'Cotizar'
}

export default function SpacesMap({ spaces, onSpaceClick }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Cargar Leaflet dinámicamente (solo en el cliente)
    import('leaflet').then(L => {
      // Fix icono por defecto de Leaflet en Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center:    [18.4861, -69.9312],
        zoom:      13,
        zoomControl: true,
        scrollWheelZoom: false,
      })

      mapInstance.current = map

      // Tiles de OpenStreetMap (gratuito)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Agregar pins
      spaces.forEach(space => {
        const coords  = getCoords(space)
        const emoji   = CATEGORY_EMOJI[space.category] ?? '📍'
        const price   = getPrice(space)
        const cover   = space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url

        // Icono personalizado tipo pill
        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              background: #fff;
              border: 2px solid #35C493;
              border-radius: 24px;
              padding: 5px 10px;
              display: flex;
              align-items: center;
              gap: 5px;
              box-shadow: 0 4px 16px rgba(53,196,147,0.25);
              white-space: nowrap;
              font-family: -apple-system, sans-serif;
              cursor: pointer;
              transition: transform 0.15s;
            ">
              <span style="font-size:14px">${emoji}</span>
              ${price ? `<span style="font-size:11px;font-weight:700;color:#0F1623">${price}</span>` : ''}
            </div>
          `,
          iconAnchor: [0, 0],
        })

        const marker = L.marker(coords, { icon }).addTo(map)

        // Popup con info del espacio
        marker.bindPopup(`
          <div style="width:220px;font-family:-apple-system,sans-serif;">
            ${cover ? `<img src="${cover}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:10px;" />` : ''}
            <div style="font-weight:700;font-size:14px;color:#0F1623;margin-bottom:3px;">${space.name}</div>
            <div style="font-size:12px;color:#6B7280;margin-bottom:8px;">
              📍 ${space.sector ? space.sector + ', ' : ''}${space.city} · 👥 ${space.capacity_max} máx.
            </div>
            ${price ? `<div style="font-weight:700;color:#35C493;font-size:13px;margin-bottom:10px;">${price}</div>` : ''}
            <a href="/espacios/${space.slug}"
              style="display:block;background:#35C493;color:#fff;text-align:center;padding:8px;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;">
              Ver espacio →
            </a>
          </div>
        `, { maxWidth: 240 })

        marker.on('mouseover', () => marker.openPopup())
      })

      // Ajustar zoom para mostrar todos los pins
      if (spaces.length > 0) {
        const validSpaces = spaces.filter(s => s.lat || SECTOR_COORDS[s.sector ?? ''])
        if (validSpaces.length > 1) {
          const bounds = L.latLngBounds(spaces.map(s => getCoords(s)))
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
        }
      }
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [spaces])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden"
      style={{ height: 420, border: '1px solid var(--border-subtle)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Badge cantidad */}
      <div className="absolute top-3 left-3 z-50 text-xs font-bold px-3 py-1.5 rounded-full"
        style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', color: 'var(--text-primary)' }}>
        {spaces.length} espacio{spaces.length !== 1 ? 's' : ''}
      </div>

      {/* Hint scroll */}
      <div className="absolute bottom-3 right-3 z-50 text-xs px-2.5 py-1.5 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-muted)', backdropFilter: 'blur(8px)' }}>
        Click en un pin para ver info
      </div>
    </div>
  )
}
