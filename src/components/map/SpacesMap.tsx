'use client'

import { useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'

// Inyectar CSS de Leaflet via link tags
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

function injectLeafletCSS() {
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = LEAFLET_CSS
  document.head.appendChild(link)
}

// ── Coordenadas de sectores de Santo Domingo y otras ciudades ──
export const SECTOR_COORDS: Record<string, [number, number]> = {
  'piantini':           [18.4733, -69.9388],
  'naco':               [18.4756, -69.9317],
  'bella vista':        [18.4642, -69.9398],
  'arroyo hondo':       [18.4892, -69.9637],
  'gazcue':             [18.4741, -69.9089],
  'evaristo morales':   [18.4783, -69.9265],
  'los prados':         [18.4851, -69.9431],
  'esperilla':          [18.4695, -69.9212],
  'la esperilla':       [18.4695, -69.9212],
  'serrallés':          [18.4600, -69.9318],
  'serralles':          [18.4600, -69.9318],
  'los cacicazgos':     [18.4554, -69.9471],
  'mirador norte':      [18.5106, -69.9416],
  'la julia':           [18.4924, -69.9476],
  'paraíso':            [18.4516, -69.9383],
  'paraiso':            [18.4516, -69.9383],
  'renacimiento':       [18.4851, -69.9244],
  'urbanización real':  [18.4601, -69.9732],
  'la castellana':      [18.4695, -69.9591],
  'fernández':          [18.4738, -69.9462],
  'fernandez':          [18.4738, -69.9462],
  'ciudad nueva':       [18.4742, -69.9098],
  'zona colonial':      [18.4737, -69.8937],
  'zona franca':        [18.4840, -69.9050],
  'ensanche naco':      [18.4756, -69.9317],
  'distrito nacional':  [18.4719, -69.9312],
  'santiago':           [19.4517, -70.6970],
  'la romana':          [18.4274, -68.9728],
  'punta cana':         [18.5601, -68.3725],
  'boca chica':         [18.4497, -69.6082],
  'juan dolio':         [18.4508, -69.6582],
  'las terrenas':       [19.3095, -69.5362],
  'puerto plata':       [19.7934, -70.6931],
}

export const CITY_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  default:          { center: [18.4719, -69.9312], zoom: 13 },
  'santo domingo':  { center: [18.4719, -69.9312], zoom: 13 },
  'santiago':       { center: [19.4517, -70.6970], zoom: 13 },
  'la romana':      { center: [18.4274, -68.9728], zoom: 13 },
  'punta cana':     { center: [18.5601, -68.3725], zoom: 12 },
  'puerto plata':   { center: [19.7934, -70.6931], zoom: 13 },
  'boca chica':     { center: [18.4497, -69.6082], zoom: 14 },
  'las terrenas':   { center: [19.3095, -69.5362], zoom: 13 },
}

// Jitter determinístico: mismo ID → misma posición siempre
function stableJitter(id: string, range: number, seed: number): number {
  let h = seed
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0
  return ((((h >>> 0) % 10000) / 10000) - 0.5) * range * 2
}

export function getSpaceCoords(space: any): [number, number] | null {
  // Solo usar lat/lng si son coordenadas válidas dentro de República Dominicana
  const lat = parseFloat(space.lat)
  const lng = parseFloat(space.lng)
  if (
    space.lat && space.lng &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= 17.5 && lat <= 20.0 &&   // bounds approx. RD
    lng >= -72.0 && lng <= -68.0
  ) {
    return [lat, lng]
  }

  const id     = space.id ?? ''
  const sector = (space.sector ?? '').toLowerCase().trim()
  if (sector) {
    for (const [key, coords] of Object.entries(SECTOR_COORDS)) {
      if (sector.includes(key) || (key.includes(sector) && sector.length > 3)) {
        return [coords[0] + stableJitter(id, 0.006, 1), coords[1] + stableJitter(id, 0.006, 2)]
      }
    }
  }
  const city = (space.city ?? '').toLowerCase()
  if (city.includes('santo domingo') || city.includes('distrito nacional')) {
    return [18.4719 + stableJitter(id, 0.018, 1), -69.9312 + stableJitter(id, 0.018, 2)]
  }
  for (const [key, { center }] of Object.entries(CITY_VIEW)) {
    if (key !== 'default' && city.includes(key)) {
      return [center[0] + stableJitter(id, 0.01, 1), center[1] + stableJitter(id, 0.01, 2)]
    }
  }
  return null
}

function getPricePin(space: any): string {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return 'Ver'
  if (p.pricing_type === 'hourly') {
    const n = Number(p.hourly_price)
    return n >= 1000 ? `RD$${Math.round(n / 1000)}k` : `RD$${n}`
  }
  if (p.pricing_type === 'minimum_consumption') {
    const n = Number(p.minimum_consumption)
    return n >= 1000 ? `RD$${Math.round(n / 1000)}k min` : `RD$${n} min`
  }
  if (p.pricing_type === 'fixed_package') {
    const n = Number(p.fixed_price)
    return n >= 1000 ? `RD$${Math.round(n / 1000)}k` : `RD$${n}`
  }
  return 'Cotizar'
}

function getFullPrice(space: any): string | null {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return null
  if (p.pricing_type === 'hourly') return `${formatCurrency(p.hourly_price)} / hora`
  if (p.pricing_type === 'minimum_consumption') return `Consumo mín. ${formatCurrency(p.minimum_consumption)}`
  if (p.pricing_type === 'fixed_package') return `Paquete ${formatCurrency(p.fixed_price)}`
  return 'Cotización'
}

interface Props {
  spaces:        any[]
  hoveredId?:    string | null
  cityFilter?:   string
  onSpaceHover?: (id: string | null) => void
}

export default function SpacesMap({ spaces, hoveredId, cityFilter, onSpaceHover }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const lRef          = useRef<any>(null)          // Leaflet module — loaded once
  const markersRef    = useRef<Map<string, any>>(new Map())
  const coordsRef     = useRef<Map<string, [number, number]>>(new Map())
  const spacesRef     = useRef(spaces)             // always latest spaces
  const onHoverRef    = useRef(onSpaceHover)
  const hoveredIdRef  = useRef(hoveredId)

  // Keep refs in sync
  useEffect(() => { spacesRef.current   = spaces },       [spaces])
  useEffect(() => { onHoverRef.current  = onSpaceHover }, [onSpaceHover])
  useEffect(() => { hoveredIdRef.current = hoveredId },   [hoveredId])

  // ── Inicializar el mapa UNA sola vez ─────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    injectLeafletCSS()

    import('leaflet').then((LModule) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const L = LModule.default
      lRef.current = L

      const view = CITY_VIEW['default']
      const map  = L.map(containerRef.current, {
        center:             view.center,
        zoom:               view.zoom,
        zoomControl:        false,
        attributionControl: true,
      })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains:  'abcd',
          maxZoom:     19,
        },
      ).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapRef.current = map

      requestAnimationFrame(() => { map.invalidateSize() })

      // Poblar marcadores con los espacios actuales
      addMarkers(L, map, spacesRef.current)
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      lRef.current   = null
      markersRef.current.clear()
      coordsRef.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Función para añadir/actualizar todos los marcadores ──
  function addMarkers(L: any, map: any, spaceList: any[]) {
    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()
    coordsRef.current.clear()

    spaceList.forEach(space => {
      const coords = getSpaceCoords(space)
      if (!coords) return
      coordsRef.current.set(space.id, coords)

      const label  = getPricePin(space)
      const marker = L.marker(coords, { icon: buildIcon(L, label, false) })

      marker.on('mouseover', () => {
        onHoverRef.current?.(space.id)
        marker.setIcon(buildIcon(L, label, true))
        marker.setZIndexOffset(1000)
      })
      marker.on('mouseout', () => {
        if (hoveredIdRef.current !== space.id) {
          onHoverRef.current?.(null)
          marker.setIcon(buildIcon(L, label, false))
          marker.setZIndexOffset(0)
        }
      })
      marker.on('click', () => openSpacePopup(L, map, space, coords))

      marker.addTo(map)
      markersRef.current.set(space.id, marker)
    })

    // Ajustar vista a los pins
    const validCoords = Array.from(coordsRef.current.values())
    if (validCoords.length > 1) {
      const bounds = L.latLngBounds(validCoords)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    } else if (validCoords.length === 1) {
      map.flyTo(validCoords[0], 15, { duration: 0.6 })
    }
  }

  // ── Actualizar marcadores cuando cambian los espacios ─────
  useEffect(() => {
    const L   = lRef.current
    const map = mapRef.current
    if (!L || !map) return
    addMarkers(L, map, spaces)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaces])

  // ── Actualizar highlight cuando cambia hoveredId ──────────
  useEffect(() => {
    const L   = lRef.current
    const map = mapRef.current
    if (!L || !map) return
    markersRef.current.forEach((marker, id) => {
      const space  = spaces.find(s => s.id === id)
      const label  = getPricePin(space ?? {})
      const active = id === hoveredId
      marker.setIcon(buildIcon(L, label, active))
      marker.setZIndexOffset(active ? 1000 : 0)
    })
  }, [hoveredId, spaces])

  // ── Re-centrar cuando cambia la ciudad ────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const key  = Object.keys(CITY_VIEW).find(k => k !== 'default' && (cityFilter ?? '').toLowerCase().includes(k))
    const view = CITY_VIEW[key ?? 'default']
    map.flyTo(view.center, view.zoom, { duration: 0.8 })
  }, [cityFilter])

  return (
    <>
      <style>{`
        .espot-pin svg { overflow: visible; }
        .espot-pin { transition: transform 0.15s ease; }
        .leaflet-popup-content-wrapper {
          border-radius:16px !important;
          padding:0 !important;
          overflow:hidden;
          box-shadow:0 8px 32px rgba(0,0,0,0.15) !important;
          border:none !important;
        }
        .leaflet-popup-content { margin:0 !important; }
        .leaflet-popup-close-button {
          color:#6B7280 !important;
          top:10px !important;
          right:10px !important;
          font-size:20px !important;
          width:28px !important;
          height:28px !important;
          line-height:28px !important;
          text-align:center !important;
          background:rgba(255,255,255,0.9) !important;
          border-radius:50% !important;
          z-index:10;
        }
        .leaflet-popup-tip { background:#fff !important; }
        .leaflet-container { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        .leaflet-attribution-flag { display:none !important; }
        .leaflet-control-attribution { font-size:9px !important; }
        @media (max-width:767px) {
          .leaflet-control-zoom { margin-bottom:70px !important; }
        }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </>
  )
}

// ── Helpers de Leaflet ────────────────────────────────────

function buildIcon(L: any, _label: string, active: boolean) {
  const color  = active ? '#0F1623' : '#35C493'
  const shadow = active
    ? 'drop-shadow(0 3px 8px rgba(15,22,35,0.5))'
    : 'drop-shadow(0 2px 6px rgba(53,196,147,0.45))'
  return L.divIcon({
    html: `
      <div style="position:relative;width:28px;height:36px;cursor:pointer;
                  will-change:transform;
                  transition:transform 0.15s ease, filter 0.15s ease;
                  transform:${active ? 'scale(1.25) translateZ(0)' : 'scale(1) translateZ(0)'};
                  filter:${shadow}">
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none"
             xmlns="http://www.w3.org/2000/svg"
             shape-rendering="geometricPrecision">
          <path d="M14 0C6.3 0 0 6.3 0 14c0 5.2 2.8 9.7 7 12.2L14 36l7-9.8C25.2 23.7 28 19.2 28 14 28 6.3 21.7 0 14 0z"
                fill="${color}"/>
          <circle cx="14" cy="13" r="6" fill="white"/>
        </svg>
      </div>`,
    className:  '',
    iconSize:   [28, 36],
    iconAnchor: [14, 36],
  })
}

function openSpacePopup(L: any, map: any, space: any, coords: [number, number]) {
  const cover    = space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url
  const price    = getFullPrice(space)
  const location = [space.sector, space.city].filter(Boolean).join(', ')

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const popupW   = isMobile ? Math.min(window.innerWidth - 32, 320) : 260

  const popup = L.popup({
    offset:    [0, -10],
    className: 'espot-popup',
    maxWidth:  popupW,
    autoPan:   true,
    autoPanPadding: [20, 80],
  }).setLatLng(coords).setContent(`
    <div style="width:${popupW}px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      ${cover
        ? `<div style="height:${isMobile ? 160 : 140}px;overflow:hidden;">
             <img src="${cover}" style="width:100%;height:100%;object-fit:cover;" />
           </div>`
        : `<div style="height:${isMobile ? 110 : 90}px;background:linear-gradient(135deg,#0F2A22,#0A4A3A);display:flex;align-items:center;justify-content:center;">
             <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
           </div>`
      }
      <div style="padding:${isMobile ? '16px' : '14px'};">
        <div style="font-weight:700;font-size:${isMobile ? '15px' : '14px'};color:#111827;margin-bottom:4px;line-height:1.3;">${space.name}</div>
        <div style="font-size:${isMobile ? '13px' : '12px'};color:#6B7280;margin-bottom:8px;">
          ${location} &middot; ${space.capacity_max} personas m&aacute;x.
        </div>
        ${price ? `<div style="font-weight:700;font-size:${isMobile ? '14px' : '13px'};color:#35C493;margin-bottom:${isMobile ? '14px' : '12px'};">${price}</div>` : ''}
        <a href="/espacios/${space.slug}"
          style="display:block;background:#35C493;color:#fff;text-align:center;
                 padding:${isMobile ? '12px 16px' : '9px 16px'};
                 border-radius:12px;font-size:${isMobile ? '14px' : '12px'};
                 font-weight:700;text-decoration:none;letter-spacing:-0.01em;">
          Ver Espot &rarr;
        </a>
      </div>
    </div>
  `)

  popup.openOn(map)
}
