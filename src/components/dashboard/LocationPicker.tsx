'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Loader2, CheckCircle, X } from 'lucide-react'

const LEAFLET_CSS    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const DEFAULT_CENTER: [number, number] = [18.4719, -69.9312]
const DEFAULT_ZOOM   = 13
const PIN_ZOOM       = 16

function buildPinHTML() {
  return `
    <div style="position:relative;width:28px;height:36px;">
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none"
           xmlns="http://www.w3.org/2000/svg"
           style="pointer-events:none;filter:drop-shadow(0 3px 10px rgba(53,196,147,0.5))">
        <path d="M14 0C6.3 0 0 6.3 0 14c0 5.2 2.8 9.7 7 12.2L14 36l7-9.8C25.2 23.7 28 19.2 28 14 28 6.3 21.7 0 14 0z"
              fill="#35C493"/>
        <circle cx="14" cy="13" r="6" fill="white"/>
      </svg>
    </div>`
}

interface Props {
  address:   string
  sector:    string
  lat:       string
  lng:       string
  onAddress: (v: string) => void
  onSector:  (v: string) => void
  onCoords:  (lat: string, lng: string) => void
}

interface NominatimResult {
  lat:          string
  lon:          string
  display_name: string
  address: {
    road?:            string
    house_number?:    string
    suburb?:          string
    neighbourhood?:   string
    district?:        string
    town?:            string
    city?:            string
    village?:         string
    county?:          string
    state?:           string
  }
}

function formatResult(r: NominatimResult): { label: string; sector: string } {
  const a = r.address
  // Calle + número
  const street = [a.road, a.house_number ? `#${a.house_number}` : null]
    .filter(Boolean).join(' ')
  // Sector/barrio
  const sector = a.suburb || a.neighbourhood || a.district || ''
  // Ciudad
  const city = a.city || a.town || a.village || a.county || ''
  // Label completo para mostrar
  const parts = [street || a.road, sector, city].filter(Boolean)
  return { label: parts.join(', '), sector }
}

export default function LocationPicker({ address, sector, lat, lng, onAddress, onSector, onCoords }: Props) {
  const mapDivRef   = useRef<HTMLDivElement>(null)
  const mapRef      = useRef<any>(null)
  const markerRef   = useRef<any>(null)
  const lRef        = useRef<any>(null)           // referencia a Leaflet
  const onCoordsRef = useRef(onCoords)
  onCoordsRef.current = onCoords

  const [hasPin,      setHasPin]      = useState(!!(lat && lng))
  const [results,     setResults]     = useState<NominatimResult[]>([])
  const [showDrop,    setShowDrop]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [noResults,   setNoResults]   = useState(false)
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef      = useRef<HTMLInputElement>(null)

  // ── Colocar / mover el pin ────────────────────────────────
  const placeMarker = useCallback((L: any, latN: number, lngN: number) => {
    if (!mapRef.current) return
    const icon = L.divIcon({ html: buildPinHTML(), className: '', iconSize: [28, 36], iconAnchor: [14, 36] })
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
  }, [])

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
    const initZoom = lat ? PIN_ZOOM : DEFAULT_ZOOM

    import('leaflet').then(({ default: L }) => {
      if (!mapDivRef.current || mapRef.current) return
      lRef.current = L

      const map = L.map(mapDivRef.current, {
        center: [initLat, initLng],
        zoom:   initZoom,
        zoomControl: true,
      })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19,
      }).addTo(map)

      if (lat && lng) placeMarker(L, parseFloat(lat), parseFloat(lng))

      map.on('click', (e: any) => {
        placeMarker(L, e.latlng.lat, e.latlng.lng)
        onCoordsRef.current(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6))
        setHasPin(true)
      })

      mapRef.current = map
      requestAnimationFrame(() => map.invalidateSize())
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      markerRef.current = null
      lRef.current      = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Restaurar pin cuando llegan coords de un espacio existente ──
  useEffect(() => {
    if (!lat || !lng || !lRef.current || !mapRef.current) return
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    if (isNaN(latN) || isNaN(lngN)) return
    // Solo actuar si el marker aún no existe (carga inicial de edición)
    if (!markerRef.current) {
      placeMarker(lRef.current, latN, lngN)
      mapRef.current.setView([latN, lngN], PIN_ZOOM)
    }
  }, [lat, lng, placeMarker])

  // ── Buscar en Nominatim (OpenStreetMap) — solo RD ────────
  const doSearch = useCallback(async (query: string) => {
    setLoading(true)
    setNoResults(false)

    const nominatimFetch = async (q: string) => {
      const url = `https://nominatim.openstreetmap.org/search?` +
                  `format=json&q=${encodeURIComponent(q.trim())}&countrycodes=do&limit=6&addressdetails=1` +
                  `&viewbox=-72.0,19.9,-68.3,17.5&bounded=0&accept-language=es`
      const res = await fetch(url, { headers: { 'User-Agent': 'espot.do/1.0 (contacto@espot.do)' } })
      return res.json() as Promise<NominatimResult[]>
    }

    try {
      let data = await nominatimFetch(query)

      // Nominatim no tiene números de casa en RD — si falla, reintentar
      // quitando el número al final (ej: "Av. Bolívar 1012" → "Av. Bolívar")
      if (data.length === 0) {
        const sinNumero = query.trim().replace(/\s+#?\d+[\w-]*$/, '').trim()
        if (sinNumero.length >= 3 && sinNumero !== query.trim()) {
          data = await nominatimFetch(sinNumero)
        }
      }

      // Si sigue sin resultados, intentar agregando contexto de ciudad
      if (data.length === 0) {
        const conCiudad = `${query.trim()}, Santo Domingo, República Dominicana`
        data = await nominatimFetch(conCiudad)
      }

      if (data.length === 0) {
        setResults([])
        setNoResults(true)
      } else {
        setResults(data)
        setNoResults(false)
      }
      setShowDrop(true)
    } catch {
      setResults([])
      setNoResults(false)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleAddressChange(val: string) {
    onAddress(val)
    setNoResults(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) {
      setResults([])
      setShowDrop(false)
      return
    }
    // Debounce de 400ms — Nominatim pide max 1 req/seg
    debounceRef.current = setTimeout(() => doSearch(val), 400)
  }

  function handleFocus() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    if (results.length > 0) setShowDrop(true)
    else if (address.trim().length >= 3 && !loading) doSearch(address)
  }

  function handleBlur() {
    blurTimerRef.current = setTimeout(() => setShowDrop(false), 200)
  }

  function pickResult(r: NominatimResult) {
    const { label, sector: autoSector } = formatResult(r)
    const a = r.address
    // Calle como dirección
    const street = [a.road, a.house_number ? `#${a.house_number}` : null].filter(Boolean).join(' ')
    onAddress(street || label.split(',')[0].trim())
    // Auto-llenar sector si no tiene uno
    if (!sector && autoSector) onSector(autoSector)

    setResults([])
    setShowDrop(false)
    setNoResults(false)

    const latN = parseFloat(r.lat)
    const lngN = parseFloat(r.lon)
    onCoordsRef.current(latN.toFixed(6), lngN.toFixed(6))

    if (lRef.current) {
      placeMarker(lRef.current, latN, lngN)
      mapRef.current?.setView([latN, lngN], PIN_ZOOM)
    }
  }

  function clearPin() {
    if (markerRef.current && mapRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    setHasPin(false)
    onCoords('', '')
    mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
  }

  return (
    <div className="space-y-3">

      {/* Dirección + Sector — 1 col en mobile, 2 en desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Dirección con autocomplete */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Dirección <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              value={address}
              onChange={e => handleAddressChange(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={e => {
                if (e.key === 'Escape') { setShowDrop(false); setResults([]) }
                if (e.key === 'Enter')  { e.preventDefault(); if (address.trim().length >= 3) doSearch(address) }
              }}
              placeholder="Av. Winston Churchill #123"
              className="w-full input-base rounded-xl px-4 py-3 pr-9"
              autoComplete="off"
              spellCheck={false}
              style={{ fontSize: 16 }}
            />
            {loading
              ? <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--brand)' }} />
              : address && <button type="button" onClick={() => { onAddress(''); setResults([]); setShowDrop(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  <X size={13} />
                </button>
            }

            {/* Dropdown resultados */}
            {showDrop && results.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 9999, maxHeight: 260, overflowY: 'auto' }}>
                {results.map((r, i) => {
                  const { label } = formatResult(r)
                  if (!label) return null
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); pickResult(r) }}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-start gap-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
                        style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                        <MapPin size={13} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                        <span className="leading-snug" style={{ color: 'var(--text-primary)' }}>{label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Sin resultados */}
            {showDrop && noResults && !loading && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl px-4 py-3 text-sm"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', color: 'var(--text-muted)', zIndex: 9999 }}>
                No encontramos esa dirección. Intenta con el nombre de la calle o haz clic en el mapa.
              </div>
            )}
          </div>
        </div>

        {/* Sector */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Sector / Urbanización <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            value={sector}
            onChange={e => onSector(e.target.value)}
            placeholder="Piantini, Naco, Bella Vista..."
            className="w-full input-base rounded-xl px-4 py-3"
            style={{ fontSize: 16 }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Visible públicamente en el marketplace
          </p>
        </div>
      </div>

      {/* Instrucción / confirmación */}
      {!hasPin ? (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.2)' }}>
          <MapPin size={15} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs leading-relaxed" style={{ color: '#065F46' }}>
            <strong>Escribe la dirección</strong> para ver sugerencias y marcar el pin automáticamente,
            o haz <strong>clic directamente en el mapa</strong> para indicar la ubicación exacta.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
          <CheckCircle size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <span className="text-xs font-semibold flex-1" style={{ color: 'var(--brand)' }}>
            Ubicación marcada — arrastra el pin para ajustar
          </span>
          <button type="button" onClick={clearPin}
            className="text-xs px-2.5 py-1 rounded-lg transition-all"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
            Quitar
          </button>
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
              <MapPin size={12} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              Clic en el mapa para marcar la ubicación
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
