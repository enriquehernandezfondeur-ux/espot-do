'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Search, Loader2, X, CheckCircle } from 'lucide-react'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const DEFAULT_CENTER: [number, number] = [18.4719, -69.9312]

const PIN_HTML = `<div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(53,196,147,0.45))"><div style="width:28px;height:28px;background:linear-gradient(135deg,#35C493,#28A87C);border:3.5px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;background:white;border-radius:50%;"></div></div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:12px solid #28A87C;margin-top:-2px;"></div></div>`

interface Props {
  address: string
  sector: string
  lat: string
  lng: string
  onAddress: (v: string) => void
  onSector:  (v: string) => void
  onCoords:  (lat: string, lng: string) => void
}

interface Suggestion {
  display_name: string
  lat: string
  lon: string
  address?: { road?: string; suburb?: string; city?: string }
}

export default function LocationPicker({ address, sector, lat, lng, onAddress, onSector, onCoords }: Props) {
  const mapDivRef   = useRef<HTMLDivElement>(null)
  const mapRef      = useRef<any>(null)
  const markerRef   = useRef<any>(null)
  const iconRef     = useRef<any>(null)
  const onCoordsRef = useRef(onCoords)
  onCoordsRef.current = onCoords

  const [searching,    setSearching]    = useState(false)
  const [searchError,  setSearchError]  = useState('')
  const [hasPin,       setHasPin]       = useState(!!(lat && lng))
  const [suggestions,  setSuggestions]  = useState<Suggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function buildIcon(L: any) {
    return L.divIcon({ html: PIN_HTML, iconSize: [28, 40], iconAnchor: [14, 40], className: '' })
  }

  function placeMarker(L: any, latN: number, lngN: number) {
    if (!mapRef.current) return
    if (!iconRef.current) iconRef.current = buildIcon(L)
    if (markerRef.current) {
      markerRef.current.setLatLng([latN, lngN])
    } else {
      const m = L.marker([latN, lngN], { icon: iconRef.current, draggable: true }).addTo(mapRef.current)
      m.on('dragend', (e: any) => {
        const p = e.target.getLatLng()
        onCoordsRef.current(p.lat.toFixed(6), p.lng.toFixed(6))
      })
      markerRef.current = m
    }
    setHasPin(true)
  }

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

    import('leaflet').then((LModule) => {
      const L = LModule.default
      if (!mapDivRef.current) return

      const map = L.map(mapDivRef.current, { center: [initLat, initLng], zoom: initZoom })
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19 }
      ).addTo(map)

      iconRef.current = buildIcon(L)
      if (lat && lng) placeMarker(L, parseFloat(lat), parseFloat(lng))

      map.on('click', (e: any) => {
        const { lat: cLat, lng: cLng } = e.latlng
        placeMarker(L, cLat, cLng)
        onCoordsRef.current(cLat.toFixed(6), cLng.toFixed(6))
      })

      mapRef.current = map
      requestAnimationFrame(() => map.invalidateSize())
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      markerRef.current = null; iconRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autocomplete: busca sugerencias al escribir (debounce 500ms)
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 4) { setSuggestions([]); setShowDropdown(false); return }
    try {
      const q = [query, sector || 'República Dominicana'].filter(Boolean).join(', ')
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=do&addressdetails=1`,
        { headers: { 'User-Agent': 'Espot/1.0' } }
      )
      const data: Suggestion[] = await res.json()
      setSuggestions(data)
      setShowDropdown(data.length > 0)
    } catch {
      setSuggestions([])
    }
  }, [sector])

  function handleAddressChange(val: string) {
    onAddress(val)
    setSearchError('')
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 500)
  }

  function pickSuggestion(s: Suggestion) {
    // Extraer la dirección más corta para el campo
    const shortName = s.address?.road
      ? [s.address.road, s.address.suburb].filter(Boolean).join(', ')
      : s.display_name.split(',').slice(0, 2).join(',').trim()
    onAddress(shortName)
    if (s.address?.suburb && !sector) onSector(s.address.suburb)
    setSuggestions([])
    setShowDropdown(false)

    const gLat = parseFloat(s.lat)
    const gLng = parseFloat(s.lon)
    onCoordsRef.current(gLat.toFixed(6), gLng.toFixed(6))
    import('leaflet').then((LModule) => {
      placeMarker(LModule.default, gLat, gLng)
      mapRef.current?.setView([gLat, gLng], 17)
    })
  }

  async function handleSearch() {
    const q = [address, sector, 'República Dominicana'].filter(Boolean).join(', ')
    if (!q.trim() || q === 'República Dominicana') return
    setSearching(true); setSearchError(''); setShowDropdown(false)
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=do`,
        { headers: { 'User-Agent': 'Espot/1.0' } }
      )
      const data = await res.json()
      if (!data.length) {
        setSearchError('No se encontró esa dirección. Haz click directamente en el mapa para marcar la ubicación.')
        return
      }
      const gLat = parseFloat(data[0].lat)
      const gLng = parseFloat(data[0].lon)
      onCoordsRef.current(gLat.toFixed(6), gLng.toFixed(6))
      import('leaflet').then((LModule) => {
        placeMarker(LModule.default, gLat, gLng)
        mapRef.current.setView([gLat, gLng], 17)
      })
    } catch {
      setSearchError('Error de conexión. Haz click en el mapa para colocar el pin manualmente.')
    } finally {
      setSearching(false)
    }
  }

  function clearPin() {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current)
      markerRef.current = null
    }
    onCoords('', '')
    setHasPin(false)
  }

  return (
    <div className="space-y-3">

      {/* Dirección + Sector */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Dirección exacta
          </label>
          <input
            value={address}
            onChange={e => handleAddressChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { handleSearch(); setShowDropdown(false) } if (e.key === 'Escape') setShowDropdown(false) }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Av. Winston Churchill #123"
            className="w-full input-base rounded-xl px-4 py-3"
            autoComplete="off"
          />
          {/* Dropdown de sugerencias */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg"
              style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
              {suggestions.map((s, i) => (
                <button key={i} type="button"
                  onMouseDown={() => pickSuggestion(s)}
                  className="w-full text-left px-4 py-3 text-sm transition-colors flex items-start gap-2"
                  style={{ borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <MapPin size={13} style={{ color: '#35C493', flexShrink: 0, marginTop: 2 }} />
                  <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                    {s.display_name.split(',').slice(0, 3).join(', ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Sector
          </label>
          <input
            value={sector}
            onChange={e => { onSector(e.target.value); setSearchError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Piantini, Naco, Bella Vista..."
            className="w-full input-base rounded-xl px-4 py-3"
          />
        </div>
      </div>

      {/* Instrucción clara del pin */}
      {!hasPin && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(53,196,147,0.06)', border: '1px solid rgba(53,196,147,0.2)' }}>
          <MapPin size={15} style={{ color: '#35C493', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs" style={{ color: '#065F46', lineHeight: 1.6 }}>
            <strong>Confirma la ubicación en el mapa.</strong> Escribe la dirección para ver sugerencias, o haz click directamente sobre el mapa para marcar el pin exacto.
          </p>
        </div>
      )}

      {/* Botones */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || (!address.trim() && !sector.trim())}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {searching ? 'Buscando...' : 'Ubicar en el mapa'}
        </button>
        {hasPin && (
          <button type="button" onClick={clearPin}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ color: '#DC2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.12)' }}>
            <X size={11} /> Quitar pin
          </button>
        )}
      </div>

      {searchError && (
        <p className="text-xs px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(220,38,38,0.05)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.1)' }}>
          {searchError}
        </p>
      )}

      {/* Mapa interactivo */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ border: `1.5px solid ${hasPin ? 'var(--brand-border)' : 'var(--border-medium)'}` }}>
        <div ref={mapDivRef} style={{ height: 260 }} />
        {!hasPin && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none whitespace-nowrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', color: '#374151', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}>
              <MapPin size={12} style={{ color: '#35C493', flexShrink: 0 }} />
              Haz click en el mapa para marcar la ubicación exacta
            </div>
          </div>
        )}
      </div>

      {/* Confirmación de pin */}
      {hasPin && lat && lng && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
          <CheckCircle size={13} style={{ flexShrink: 0 }} />
          Ubicación confirmada
          <span className="font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </span>
          <span className="ml-auto font-normal text-xs" style={{ color: 'var(--text-muted)' }}>
            Puedes arrastrar el pin para ajustar
          </span>
        </div>
      )}
    </div>
  )
}
