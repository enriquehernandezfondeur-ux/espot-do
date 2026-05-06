'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, Loader2, X } from 'lucide-react'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const DEFAULT_CENTER: [number, number] = [18.4719, -69.9312]

// Pin idéntico al del mapa de clientes pero con el color exacto de la marca
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

export default function LocationPicker({ address, sector, lat, lng, onAddress, onSector, onCoords }: Props) {
  const mapDivRef   = useRef<HTMLDivElement>(null)
  const mapRef      = useRef<any>(null)
  const markerRef   = useRef<any>(null)
  const iconRef     = useRef<any>(null)
  // Ref para callbacks siempre frescos desde el event handler del mapa
  const onCoordsRef = useRef(onCoords)
  onCoordsRef.current = onCoords

  const [searching,   setSearching]   = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasPin,      setHasPin]      = useState(!!(lat && lng))

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

  // Inicializar mapa (solo una vez)
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
      markerRef.current = null
      iconRef.current   = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSearch() {
    const q = [address, sector, 'República Dominicana'].filter(Boolean).join(', ')
    if (!q.trim() || q === 'República Dominicana') return
    setSearching(true); setSearchError('')
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=do`,
        { headers: { 'User-Agent': 'EspotHub/1.0' } }
      )
      const data = await res.json()
      if (!data.length) {
        setSearchError('No se encontró esa dirección. Escribe más detalles o haz click en el mapa directamente.')
        return
      }
      const gLat = parseFloat(data[0].lat)
      const gLng = parseFloat(data[0].lon)
      onCoordsRef.current(gLat.toFixed(6), gLng.toFixed(6))
      if (mapRef.current) {
        import('leaflet').then((LModule) => {
          placeMarker(LModule.default, gLat, gLng)
          mapRef.current.setView([gLat, gLng], 17)
        })
      }
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
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Dirección exacta
          </label>
          <input
            value={address}
            onChange={e => { onAddress(e.target.value); setSearchError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Av. Winston Churchill #123"
            className="w-full input-base rounded-xl px-4 py-3"
          />
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

      {/* Botones */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || (!address.trim() && !sector.trim())}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
          {searching
            ? <Loader2 size={14} className="animate-spin" />
            : <Search size={14} />
          }
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
        style={{ border: '1.5px solid var(--border-medium)' }}>
        <div ref={mapDivRef} style={{ height: 260 }} />

        {/* Instrucción flotante cuando no hay pin */}
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
          <MapPin size={13} style={{ flexShrink: 0 }} />
          Pin colocado correctamente
          <span className="font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </span>
          <span className="ml-auto font-normal" style={{ color: 'var(--text-muted)' }}>
            Arrastra el pin para ajustar
          </span>
        </div>
      )}
    </div>
  )
}
