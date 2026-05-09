'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2, CheckCircle } from 'lucide-react'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const DEFAULT_CENTER: [number, number] = [18.4719, -69.9312]

// Pin idéntico al del mapa del buscador
function buildPinHTML(color = '#35C493') {
  return `
    <div style="position:relative;width:28px;height:36px;cursor:pointer;">
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none"
           xmlns="http://www.w3.org/2000/svg"
           style="filter:drop-shadow(0 3px 10px rgba(53,196,147,0.5))">
        <path d="M14 0C6.3 0 0 6.3 0 14c0 5.2 2.8 9.7 7 12.2L14 36l7-9.8C25.2 23.7 28 19.2 28 14 28 6.3 21.7 0 14 0z"
              fill="${color}"/>
        <circle cx="14" cy="13" r="6" fill="white"/>
      </svg>
    </div>`
}

interface Props {
  address: string
  sector:  string
  lat:     string
  lng:     string
  onAddress: (v: string) => void
  onSector:  (v: string) => void
  onCoords:  (lat: string, lng: string) => void
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    housenumber?: string
    suburb?: string
    district?: string
    city?: string
    state?: string
    country?: string
  }
}

export default function LocationPicker({ address, sector, lat, lng, onAddress, onSector, onCoords }: Props) {
  const mapDivRef   = useRef<HTMLDivElement>(null)
  const mapRef      = useRef<any>(null)
  const markerRef   = useRef<any>(null)
  const onCoordsRef = useRef(onCoords)
  onCoordsRef.current = onCoords

  const [hasPin,      setHasPin]      = useState(!!(lat && lng))
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [loading,     setLoading]     = useState(false)
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef      = useRef<HTMLInputElement>(null)

  // ── Inicializar mapa ──────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const l = document.createElement('link')
      l.rel = 'stylesheet'; l.href = LEAFLET_CSS
      document.head.appendChild(l)
    }

    const initLat  = lat ? parseFloat(lat) : DEFAULT_CENTER[0]
    const initLng  = lng ? parseFloat(lng) : DEFAULT_CENTER[1]
    const initZoom = lat ? 16 : 13

    import('leaflet').then(({ default: L }) => {
      if (!mapDivRef.current) return

      const map = L.map(mapDivRef.current, { center: [initLat, initLng], zoom: initZoom })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19,
      }).addTo(map)

      if (lat && lng) placeMarker(L, parseFloat(lat), parseFloat(lng))

      map.on('click', (e: any) => {
        placeMarker(L, e.latlng.lat, e.latlng.lng)
        onCoordsRef.current(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6))
      })

      mapRef.current = map
      requestAnimationFrame(() => map.invalidateSize())
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      markerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function placeMarker(L: any, latN: number, lngN: number) {
    if (!mapRef.current) return
    const icon = L.divIcon({
      html: buildPinHTML(),
      className: '',
      iconSize:   [28, 36],
      iconAnchor: [14, 36],
    })
    if (markerRef.current) {
      markerRef.current.setLatLng([latN, lngN])
    } else {
      const m = L.marker([latN, lngN], { icon, draggable: true }).addTo(mapRef.current)
      m.on('dragend', (e: any) => {
        const p = e.target.getLatLng()
        onCoordsRef.current(p.lat.toFixed(6), p.lng.toFixed(6))
      })
      markerRef.current = m
    }
    setHasPin(true)
  }

  // ── Autocompletar ─────────────────────────────────────────
  function handleAddressChange(val: string) {
    onAddress(val)
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) return
    debounceRef.current = setTimeout(() => doSearch(val), 250)
  }

  async function doSearch(query: string) {
    setLoading(true)
    try {
      // Photon: más rápido que Nominatim, retorna números de calle
      // bbox restringido a República Dominicana: W=-72.0, S=17.5, E=-68.3, N=19.9
      const q = [query, sector].filter(Boolean).join(' ')
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=es&limit=5&bbox=-72.0,17.5,-68.3,19.9`
      const res  = await fetch(url)
      const data = await res.json()
      const features: PhotonFeature[] = data.features ?? []
      setSuggestions(features.slice(0, 5))
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  function formatSuggestion(f: PhotonFeature): string {
    const p = f.properties
    const street = [p.name || p.street, p.housenumber ? `#${p.housenumber}` : null].filter(Boolean).join(' ')
    const area   = p.suburb || p.district || ''
    const city   = p.city || p.state || ''
    return [street, area, city].filter(Boolean).join(', ')
  }

  function pickSuggestion(f: PhotonFeature) {
    const p = f.properties
    const street = [p.name || p.street, p.housenumber ? `#${p.housenumber}` : null].filter(Boolean).join(' ')
    onAddress(street || formatSuggestion(f).split(',')[0])
    if ((p.suburb || p.district) && !sector) onSector(p.suburb || p.district || '')
    setSuggestions([])

    const [gLng, gLat] = f.geometry.coordinates  // Photon usa [lon, lat]
    onCoordsRef.current(gLat.toFixed(6), gLng.toFixed(6))
    import('leaflet').then(({ default: L }) => {
      placeMarker(L, gLat, gLng)
      mapRef.current?.setView([gLat, gLng], 17)
    })
  }

  return (
    <div className="space-y-3">

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4">

        {/* Dirección con autocomplete */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Dirección exacta
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              value={address}
              onChange={e => handleAddressChange(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setSuggestions([])}
              placeholder="Av. Winston Churchill #123"
              className="w-full input-base rounded-xl px-4 py-3 pr-9"
              autoComplete="off"
            />
            {loading && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
                style={{ color: 'var(--text-muted)' }} />
            )}

            {/* Dropdown de sugerencias */}
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 z-[9999] rounded-xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                {suggestions.map((s, i) => {
                  const label = formatSuggestion(s)
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); pickSuggestion(s) }}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-start gap-2 transition-colors hover:bg-[var(--bg-elevated)]"
                        style={{ borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                        <MapPin size={13} style={{ color: '#35C493', flexShrink: 0, marginTop: 2 }} />
                        <span className="leading-snug" style={{ color: 'var(--text-primary)' }}>
                          {label}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Sector */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Sector
          </label>
          <input
            value={sector}
            onChange={e => onSector(e.target.value)}
            placeholder="Piantini, Naco, Bella Vista..."
            className="w-full input-base rounded-xl px-4 py-3"
          />
        </div>
      </div>

      {/* Instrucción */}
      {!hasPin && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.2)' }}>
          <MapPin size={14} style={{ color: '#35C493', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: '#065F46' }}>
            Escribe la dirección para ver sugerencias, o haz <strong>click en el mapa</strong> para marcar el pin exacto.
          </p>
        </div>
      )}

      {/* Confirmación */}
      {hasPin && lat && lng && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
          <CheckCircle size={13} style={{ flexShrink: 0 }} />
          Ubicación marcada — puedes arrastrar el pin para ajustar
          <span className="ml-auto font-normal" style={{ color: 'var(--text-muted)' }}>
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </span>
        </div>
      )}

      {/* Mapa */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ border: `1.5px solid ${hasPin ? 'rgba(53,196,147,0.4)' : 'var(--border-medium)'}` }}>
        <div ref={mapDivRef} style={{ height: 280 }} />
        {!hasPin && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none whitespace-nowrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', color: '#374151', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}>
              <MapPin size={12} style={{ color: '#35C493', flexShrink: 0 }} />
              Click en el mapa para marcar la ubicación
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
