'use client'

import { useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'

// Inyectar CSS de Leaflet via link tags (más confiable en Next.js que imports estáticos)
const LEAFLET_CSS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
]

function injectLeafletCSS() {
  LEAFLET_CSS.forEach(href => {
    if (document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  })
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

// Centro y zoom por ciudad
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

export function getSpaceCoords(space: any): [number, number] | null {
  if (space.lat && space.lng) return [parseFloat(space.lat), parseFloat(space.lng)]
  const sector = (space.sector ?? '').toLowerCase().trim()
  if (sector) {
    for (const [key, coords] of Object.entries(SECTOR_COORDS)) {
      if (sector.includes(key) || key.includes(sector) && sector.length > 3) return coords
    }
  }
  const city = (space.city ?? '').toLowerCase()
  if (city.includes('santo domingo') || city.includes('distrito nacional')) {
    // Pequeño offset para no apilar todos en el mismo punto
    const jitter = () => (Math.random() - 0.5) * 0.018
    return [18.4719 + jitter(), -69.9312 + jitter()]
  }
  for (const [key, { center }] of Object.entries(CITY_VIEW)) {
    if (key !== 'default' && city.includes(key)) {
      const jitter = () => (Math.random() - 0.5) * 0.01
      return [center[0] + jitter(), center[1] + jitter()]
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
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const markersRef   = useRef<Map<string, any>>(new Map())
  const clusterRef   = useRef<any>(null)
  const coordsRef    = useRef<Map<string, [number, number]>>(new Map())

  // ── Inicializar el mapa ────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    injectLeafletCSS()

    Promise.all([
      import('leaflet'),
      import('leaflet.markercluster'),
    ]).then(([LModule]) => {
      const L = LModule.default

      const cityKey = Object.keys(CITY_VIEW).find(k =>
        k !== 'default' && (cityFilter ?? '').toLowerCase().includes(k)
      )
      const view = CITY_VIEW[cityKey ?? 'default']

      const map = L.map(containerRef.current!, {
        center:          view.center,
        zoom:            view.zoom,
        zoomControl:     false,
        attributionControl: true,
      })

      // Tiles CartoDB Light — limpios y modernos
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains:  'abcd',
          maxZoom:     19,
        },
      ).addTo(map)

      // Zoom control en esquina inferior derecha
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Sin clusters — todos los pins visibles individualmente
      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 1,     // radio mínimo: prácticamente sin clustering
        disableClusteringAtZoom: 10,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (c: any) => {
          const count = c.getChildCount()
          return L.divIcon({
            html: `<div style="
              background:#35C493;color:#fff;border-radius:50%;
              width:32px;height:32px;display:flex;align-items:center;
              justify-content:center;font-size:12px;font-weight:700;
              box-shadow:0 2px 10px rgba(53,196,147,0.4);border:2px solid #fff;
            ">${count}</div>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 16],
          })
        },
      })

      clusterRef.current = cluster
      map.addLayer(cluster)
      mapRef.current = map

      // Forzar recálculo de tamaño — necesario cuando el contenedor
      // tiene height calculado por CSS en el momento del mount
      setTimeout(() => map.invalidateSize(), 100)

      // Poblar marcadores
      spaces.forEach(space => {
        const coords = getSpaceCoords(space)
        if (!coords) return
        coordsRef.current.set(space.id, coords)

        const label  = getPricePin(space)
        const marker = L.marker(coords, { icon: buildIcon(L, label, false) })

        marker.on('mouseover', () => {
          onSpaceHover?.(space.id)
          setMarkerHovered(L, marker, label, true)
        })
        marker.on('mouseout', () => {
          if (hoveredId !== space.id) {
            onSpaceHover?.(null)
            setMarkerHovered(L, marker, label, false)
          }
        })
        marker.on('click', () => openSpacePopup(L, map, space, coords))

        cluster.addLayer(marker)
        markersRef.current.set(space.id, marker)
      })

      // Ajustar bounds a los pins disponibles
      const validCoords = Array.from(coordsRef.current.values())
      if (validCoords.length > 1) {
        const bounds = L.latLngBounds(validCoords)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      }
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current  = null
      markersRef.current.clear()
      coordsRef.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaces])

  // ── Actualizar highlight cuando cambia hoveredId ───────
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then(({ default: L }) => {
      markersRef.current.forEach((marker, id) => {
        const label   = getPricePin(spaces.find(s => s.id === id) ?? {})
        const hovered = id === hoveredId
        marker.setIcon(buildIcon(L, label, hovered))
        if (hovered) marker.setZIndexOffset(1000)
        else         marker.setZIndexOffset(0)
      })
    })
  }, [hoveredId, spaces])

  // ── Re-centrar cuando cambia la ciudad ────────────────
  useEffect(() => {
    if (!mapRef.current) return
    const key  = Object.keys(CITY_VIEW).find(k => k !== 'default' && (cityFilter ?? '').toLowerCase().includes(k))
    const view = CITY_VIEW[key ?? 'default']
    mapRef.current.flyTo(view.center, view.zoom, { duration: 0.8 })
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
          top:8px !important;
          right:8px !important;
          font-size:18px !important;
          z-index:10;
        }
        .leaflet-popup-tip { background:#fff !important; }
        .leaflet-container { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        .leaflet-attribution-flag { display:none !important; }
        .leaflet-control-attribution { font-size:9px !important; }
        .marker-cluster-small,.marker-cluster-medium,.marker-cluster-large { background:transparent !important; }
        .marker-cluster-small div,.marker-cluster-medium div,.marker-cluster-large div { background:transparent !important; }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </>
  )
}

// ── Helpers de Leaflet ────────────────────────────────────

function buildIcon(L: any, _label: string, active: boolean) {
  const color  = active ? '#0F1623' : '#35C493'
  const shadow = active
    ? '0 4px 16px rgba(15,22,35,0.45)'
    : '0 2px 10px rgba(53,196,147,0.4)'
  return L.divIcon({
    html: `
      <div style="position:relative;width:28px;height:36px;cursor:pointer;
                  transition:transform 0.15s;transform:${active ? 'scale(1.25)' : 'scale(1)'}">
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none"
             xmlns="http://www.w3.org/2000/svg"
             style="filter:drop-shadow(${shadow})">
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

function setMarkerHovered(L: any, marker: any, label: string, active: boolean) {
  marker.setIcon(buildIcon(L, label, active))
}

function openSpacePopup(L: any, map: any, space: any, coords: [number, number]) {
  const cover    = space.space_images?.find((i: any) => i.is_cover)?.url ?? space.space_images?.[0]?.url
  const price    = getFullPrice(space)
  const location = [space.sector, space.city].filter(Boolean).join(', ')

  const popup = L.popup({
    offset:    [0, -8],
    className: 'espot-popup',
    maxWidth:  260,
  }).setLatLng(coords).setContent(`
    <div style="width:240px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      ${cover
        ? `<div style="height:140px;overflow:hidden;">
             <img src="${cover}" style="width:100%;height:100%;object-fit:cover;" />
           </div>`
        : `<div style="height:100px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;">
             <span style="color:#fff;font-size:32px;opacity:0.7">🏛</span>
           </div>`
      }
      <div style="padding:14px;">
        <div style="font-weight:700;font-size:14px;color:#111827;margin-bottom:4px;line-height:1.3;">${space.name}</div>
        <div style="font-size:12px;color:#6B7280;margin-bottom:8px;display:flex;align-items:center;gap:4px;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          ${location}
          &nbsp;·&nbsp;
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          ${space.capacity_max} máx.
        </div>
        ${price ? `<div style="font-weight:700;font-size:13px;color:#35C493;margin-bottom:12px;">${price}</div>` : ''}
        <a href="/espacios/${space.slug}"
          style="display:block;background:#35C493;color:#fff;text-align:center;padding:9px 16px;
                 border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;
                 transition:opacity 0.15s;"
          onmouseover="this.style.opacity='0.88'"
          onmouseout="this.style.opacity='1'">
          Ver espacio →
        </a>
      </div>
    </div>
  `)

  popup.openOn(map)
}
