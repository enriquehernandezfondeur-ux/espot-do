'use client'

import { useEffect, useRef } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { getSpaceCoords } from '@/components/map/SpacesMap'

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

    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '', v: 'weekly' })

    importLibrary('maps').then(() => {
      if (!containerRef.current || mapRef.current) return
      const g = window.google

      const map = new g.maps.Map(containerRef.current, {
        center:            { lat: coords[0], lng: coords[1] },
        zoom:              15,
        disableDefaultUI:  true,
        gestureHandling:   'none',
        zoomControl:       false,
        styles: [
          { elementType: 'geometry',    stylers: [{ color: '#f5f5f5' }] },
          { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          { elementType: 'labels.text.fill',   stylers: [{ color: '#616161' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
          { featureType: 'poi',  elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
        ],
      })

      // Pin verde de la marca
      const svg = `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 5.2 2.8 9.7 7 12.2L14 36l7-9.8C25.2 23.7 28 19.2 28 14 28 6.3 21.7 0 14 0z" fill="#35C493"/><circle cx="14" cy="13" r="6" fill="white"/></svg>`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (g.maps as any).Marker({
        position: { lat: coords[0], lng: coords[1] },
        map,
        icon: {
          url:        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new g.maps.Size(28, 36),
          anchor:     new g.maps.Point(14, 36),
        },
      })

      mapRef.current = map
    })

    return () => {
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const coords = getSpaceCoords(space)
  if (!coords) return null

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

      <div className="relative rounded-2xl overflow-hidden" style={{ height: 240 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

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
