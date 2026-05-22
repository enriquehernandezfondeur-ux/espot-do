'use client'

import { useEffect, useRef } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

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
  'mirador sur':        [18.4540, -69.9520],
  'los ríos':           [18.4820, -69.9580],
  'los rios':           [18.4820, -69.9580],
  'jardines del sur':   [18.4470, -69.9600],
  'los millones':       [18.5050, -69.9300],
  'nuñez de cáceres':   [18.4960, -69.9400],
  'nuñez de caceres':   [18.4960, -69.9400],
  'herrera':            [18.5100, -70.0100],
  'miraflores':         [18.4900, -69.9200],
  'alma rosa':          [18.4750, -69.8850],
  'los alcarrizos':     [18.5200, -70.0500],
  'santo domingo este': [18.5060, -69.8700],
  'santo domingo norte':[18.5800, -69.9800],
  'santo domingo oeste':[18.5000, -70.0300],
  'san cristóbal':      [18.4183, -70.1070],
  'san cristobal':      [18.4183, -70.1070],
  'bavaro':             [18.6975, -68.4065],
  'cap cana':           [18.5150, -68.4100],
  'sosúa':              [19.7595, -70.5183],
  'sosua':              [19.7595, -70.5183],
  'cabarete':           [19.7600, -70.4100],
  'jarabacoa':          [19.1186, -70.6427],
  'samaná':             [19.2079, -69.3364],
  'samana':             [19.2079, -69.3364],
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
  const lat = parseFloat(space.latitude ?? space.lat)
  const lng = parseFloat(space.longitude ?? space.lng)
  if (
    (space.latitude || space.lat) && (space.longitude || space.lng) &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= 17.5 && lat <= 20.0 &&
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

export function getPricePin(space: any): string {
  const p = space.space_pricing?.find((x: any) => x.is_active) ?? space.space_pricing?.[0]
  if (!p) return 'Ver'
  if (p.pricing_type === 'hourly') {
    const n = Number(p.hourly_price)
    return n >= 1000 ? `RD$${Math.round(n / 1000)}k` : `RD$${n}`
  }
  if (p.pricing_type === 'minimum_consumption') {
    const n = Number(p.minimum_consumption)
    return n >= 1000 ? `Desde RD$${Math.round(n / 1000)}k` : `Desde RD$${n}`
  }
  if (p.pricing_type === 'fixed_package') {
    const n = Number(p.fixed_price)
    return n >= 1000 ? `RD$${Math.round(n / 1000)}k` : `RD$${n}`
  }
  return 'Cotizar'
}

// ── Estilo neutro limpio — fondo claro, agua azul, sin verdes ─
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',            stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon',         stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'poi',     elementType: 'geometry',          stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi',     elementType: 'labels.text.fill',  stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park',elementType: 'geometry',          stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'road',    elementType: 'geometry',          stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway',  elementType: 'geometry',         stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway',  elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local',    elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line',    elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry',          stylers: [{ color: '#a8c8e8' }] },
  { featureType: 'water', elementType: 'labels.text.fill',  stylers: [{ color: '#7aabcc' }] },
]

function buildSvgIcon(g: typeof google, active: boolean): google.maps.Icon {
  const color = active ? '#0F1623' : '#35C493'
  const svg = `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 5.2 2.8 9.7 7 12.2L14 36l7-9.8C25.2 23.7 28 19.2 28 14 28 6.3 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="13" r="6" fill="white"/></svg>`
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new g.maps.Size(28, 36),
    anchor:     new g.maps.Point(14, 36),
  }
}

interface Props {
  spaces:        any[]
  hoveredId?:    string | null
  cityFilter?:   string
  onSpaceHover?: (id: string | null) => void
}

export default function SpacesMap({ spaces, hoveredId, cityFilter, onSpaceHover }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<google.maps.Map | null>(null)
  const markersRef    = useRef<Map<string, google.maps.Marker>>(new Map())
  const googleRef     = useRef<typeof google | null>(null)
  const spacesRef     = useRef(spaces)
  const onHoverRef    = useRef(onSpaceHover)
  const hoveredIdRef  = useRef(hoveredId)
  const firstLoadRef  = useRef(true)

  useEffect(() => { spacesRef.current    = spaces },       [spaces])
  useEffect(() => { onHoverRef.current   = onSpaceHover }, [onSpaceHover])
  useEffect(() => { hoveredIdRef.current = hoveredId },    [hoveredId])

  // ── Inicializar mapa una sola vez ────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '', v: 'weekly' })

    importLibrary('maps').then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const g = window.google
      googleRef.current = g

      const view = CITY_VIEW['default']
      const map  = new g.maps.Map(containerRef.current, {
        center:              { lat: view.center[0], lng: view.center[1] },
        zoom:                view.zoom,
        minZoom:             10,
        maxZoom:             18,
        mapTypeControl:      false,
        streetViewControl:   false,
        fullscreenControl:   false,
        zoomControl:         true,
        zoomControlOptions:  { position: (g as any).maps.ControlPosition.BOTTOM_RIGHT },
        styles:              MAP_STYLES,
      })

      mapRef.current = map
      addMarkers(g as any, map, spacesRef.current)
    })

    return () => {
      cancelled = true
      markersRef.current.forEach(m => (m as any).setMap(null))
      markersRef.current.clear()
      mapRef.current   = null
      googleRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addMarkers(g: any, map: any, spaceList: any[]) {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current.clear()

    spaceList.forEach(space => {
      const coords = getSpaceCoords(space)
      if (!coords) return

      const marker = new g.maps.Marker({
        position: { lat: coords[0], lng: coords[1] },
        map,
        icon:  buildSvgIcon(g, false),
        title: space.name ?? '',
      })

      marker.addListener('mouseover', () => {
        onHoverRef.current?.(space.id)
        marker.setIcon(buildSvgIcon(g, true))
        marker.setZIndex(1000)
      })
      marker.addListener('mouseout', () => {
        if (hoveredIdRef.current !== space.id) {
          onHoverRef.current?.(null)
          marker.setIcon(buildSvgIcon(g, false))
          marker.setZIndex(0)
        }
      })
      marker.addListener('click', () => {
        if (space.slug) window.open('/espacios/' + space.slug, '_blank', 'noopener,noreferrer')
      })

      markersRef.current.set(space.id, marker)
    })

    if (firstLoadRef.current) firstLoadRef.current = false
  }

  // ── Actualizar marcadores cuando cambian los espacios ────
  useEffect(() => {
    const g   = googleRef.current
    const map = mapRef.current
    if (!g || !map) return
    addMarkers(g, map, spaces)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaces])

  // ── Actualizar highlight cuando cambia hoveredId ─────────
  useEffect(() => {
    const g = googleRef.current
    if (!g) return
    markersRef.current.forEach((marker, id) => {
      marker.setIcon(buildSvgIcon(g, id === hoveredId))
      marker.setZIndex(id === hoveredId ? 1000 : 0)
    })
  }, [hoveredId])

  // ── Re-centrar cuando cambia la ciudad ───────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const key  = Object.keys(CITY_VIEW).find(k => k !== 'default' && (cityFilter ?? '').toLowerCase().includes(k))
    const view = CITY_VIEW[key ?? 'default']
    ;(map as any).panTo({ lat: view.center[0], lng: view.center[1] })
    ;(map as any).setZoom(view.zoom)
  }, [cityFilter])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
