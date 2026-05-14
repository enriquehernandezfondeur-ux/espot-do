'use client'

import { useEffect, useRef } from 'react'
import { getSpaceCoords } from '@/components/map/SpacesMap'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

function injectLeafletCSS() {
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = LEAFLET_CSS
  document.head.appendChild(link)
}

interface Props {
  space: any
}

export default function SpaceLocationMap({ space }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const coords = getSpaceCoords(space)
    if (!coords) return

    injectLeafletCSS()

    import('leaflet').then(({ default: L }) => {
      if (!containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        center:             coords,
        zoom:               15,
        zoomControl:        false,
        scrollWheelZoom:    false,
        dragging:           false,
        doubleClickZoom:    false,
        touchZoom:          false,
        attributionControl: false,
      })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 19 },
      ).addTo(map)

      // Pin verde de la marca
      const icon = L.divIcon({
        html: `
          <div style="
            position:relative;width:28px;height:36px;
            filter:drop-shadow(0 2px 6px rgba(53,196,147,0.5));">
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none"
                 xmlns="http://www.w3.org/2000/svg"
                 style="pointer-events:none;">
              <path d="M14 0C6.3 0 0 6.3 0 14c0 5.2 2.8 9.7 7 12.2L14 36l7-9.8C25.2 23.7 28 19.2 28 14 28 6.3 21.7 0 14 0z"
                    fill="#35C493"/>
              <circle cx="14" cy="13" r="6" fill="white"/>
            </svg>
          </div>`,
        className:  '',
        iconSize:   [28, 36],
        iconAnchor: [14, 36],
      })

      L.marker(coords, { icon }).addTo(map)
      mapRef.current = map

      requestAnimationFrame(() => map.invalidateSize())
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const coords = getSpaceCoords(space)
  if (!coords) return null

  // Link a Google Maps con la dirección o sector
  const gmQuery = encodeURIComponent(
    space.address
      ? `${space.address}, ${space.city}, República Dominicana`
      : `${space.sector ?? ''}, ${space.city}, República Dominicana`
  )
  const gmLink = `https://maps.google.com/?q=${gmQuery}`

  return (
    <div>
      <h3 className="text-base md:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        Ubicación
      </h3>

      {/* Mapa */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 240 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Gradiente inferior + botón Ver en Maps */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6 flex items-end justify-between pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.92) 0%, transparent 100%)' }}>
          <div className="pointer-events-none">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {space.sector ? `${space.sector}, ` : ''}{space.city}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Ubicación aproximada
            </p>
          </div>
          <a
            href={gmLink}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
            style={{ background: 'var(--brand)', color: '#fff', boxShadow: '0 2px 8px rgba(53,196,147,0.35)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Ver en Maps
          </a>
        </div>
      </div>
    </div>
  )
}
