'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Loader2, CheckCircle, X } from 'lucide-react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

const DEFAULT_CENTER: [number, number] = [18.4719, -69.9312]
const DEFAULT_ZOOM   = 13
const PIN_ZOOM       = 16

function buildPinSvg() {
  return `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="pointer-events:none;filter:drop-shadow(0 3px 10px rgba(53,196,147,0.5))"><path d="M14 0C6.3 0 0 6.3 0 14c0 5.2 2.8 9.7 7 12.2L14 36l7-9.8C25.2 23.7 28 19.2 28 14 28 6.3 21.7 0 14 0z" fill="#35C493"/><circle cx="14" cy="13" r="6" fill="white"/></svg>`
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

interface Prediction {
  placeId:     string
  description: string
  mainText:    string
  secondaryText: string
}

export default function LocationPicker({ address, sector, lat, lng, onAddress, onSector, onCoords }: Props) {
  const mapDivRef    = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const markerRef    = useRef<any>(null)
  const googleRef    = useRef<any>(null)
  const onCoordsRef  = useRef(onCoords)
  onCoordsRef.current = onCoords

  const [hasPin,       setHasPin]       = useState(!!(lat && lng))
  const [predictions,  setPredictions]  = useState<Prediction[]>([])
  const [showDrop,     setShowDrop]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [noResults,    setNoResults]    = useState(false)
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef       = useRef<HTMLInputElement>(null)
  const autoSvcRef     = useRef<any>(null)

  // ── Colocar / mover el pin ────────────────────────────────
  const placeMarker = useCallback((latN: number, lngN: number) => {
    const g   = googleRef.current
    const map = mapRef.current
    if (!g || !map) return

    const icon = {
      url:        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildPinSvg())}`,
      scaledSize: new g.maps.Size(28, 36),
      anchor:     new g.maps.Point(14, 36),
    }

    if (markerRef.current) {
      markerRef.current.setPosition({ lat: latN, lng: lngN })
    } else {
      const m = new g.maps.Marker({
        position:  { lat: latN, lng: lngN },
        map,
        icon,
        draggable: true,
      })
      m.addListener('dragend', (e: any) => {
        const p = e.latLng
        onCoordsRef.current(p.lat().toFixed(6), p.lng().toFixed(6))
      })
      markerRef.current = m
    }
    setHasPin(true)
  }, [])

  // ── Inicializar mapa ──────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return

    const initLat  = lat ? parseFloat(lat) : DEFAULT_CENTER[0]
    const initLng  = lng ? parseFloat(lng) : DEFAULT_CENTER[1]
    const initZoom = lat ? PIN_ZOOM : DEFAULT_ZOOM

    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '', v: 'weekly' })

    Promise.all([importLibrary('maps'), importLibrary('places')]).then(() => {
      if (!mapDivRef.current || mapRef.current) return
      const g = window.google
      googleRef.current = g

      const map = new g.maps.Map(mapDivRef.current, {
        center:          { lat: initLat, lng: initLng },
        zoom:            initZoom,
        mapTypeControl:  false,
        streetViewControl: false,
        fullscreenControl: false,
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

      map.addListener('click', (e: any) => {
        const latN = e.latLng.lat()
        const lngN = e.latLng.lng()
        placeMarker(latN, lngN)
        onCoordsRef.current(latN.toFixed(6), lngN.toFixed(6))
      })

      mapRef.current = map
      autoSvcRef.current = new g.maps.places.AutocompleteService()

      if (lat && lng) placeMarker(parseFloat(lat), parseFloat(lng))
    })

    return () => {
      if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null }
      mapRef.current    = null
      googleRef.current = null
      autoSvcRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Restaurar pin cuando llegan coords de un espacio existente ──
  useEffect(() => {
    if (!lat || !lng || !googleRef.current || !mapRef.current) return
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    if (isNaN(latN) || isNaN(lngN)) return
    if (!markerRef.current) {
      placeMarker(latN, lngN)
      mapRef.current.setCenter({ lat: latN, lng: lngN })
      mapRef.current.setZoom(PIN_ZOOM)
    }
  }, [lat, lng, placeMarker])

  // ── Buscar con Google Places ──────────────────────────────
  const doSearch = useCallback(async (query: string) => {
    const svc = autoSvcRef.current
    if (!svc) return
    setLoading(true)
    setNoResults(false)

    svc.getPlacePredictions(
      {
        input:                 query,
        componentRestrictions: { country: 'do' },
        types:                 ['geocode', 'establishment'],
        language:              'es',
      },
      (preds: any[], status: string) => {
        setLoading(false)
        if (status === 'OK' && preds?.length) {
          setPredictions(preds.map((p: any) => ({
            placeId:       p.place_id,
            description:   p.description,
            mainText:      p.structured_formatting?.main_text ?? p.description,
            secondaryText: p.structured_formatting?.secondary_text ?? '',
          })))
          setShowDrop(true)
          setNoResults(false)
        } else {
          setPredictions([])
          setNoResults(true)
          setShowDrop(true)
        }
      }
    )
  }, [])

  function handleAddressChange(val: string) {
    onAddress(val)
    setNoResults(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) { setPredictions([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(() => doSearch(val), 350)
  }

  function handleFocus() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    if (predictions.length > 0) setShowDrop(true)
    else if (address.trim().length >= 3 && !loading) doSearch(address)
  }

  function handleBlur() {
    blurTimerRef.current = setTimeout(() => setShowDrop(false), 200)
  }

  function pickPrediction(pred: Prediction) {
    const g   = googleRef.current
    const map = mapRef.current
    if (!g || !map) return

    const svc = new g.maps.places.PlacesService(map)
    svc.getDetails(
      { placeId: pred.placeId, fields: ['geometry', 'address_components', 'formatted_address'] },
      (place: any, status: string) => {
        if (status !== 'OK' || !place?.geometry?.location) return

        const latN = place.geometry.location.lat()
        const lngN = place.geometry.location.lng()

        // Extraer componentes de dirección
        const components: any[] = place.address_components ?? []
        const route      = components.find((c: any) => c.types.includes('route'))?.long_name ?? ''
        const number     = components.find((c: any) => c.types.includes('street_number'))?.long_name ?? ''
        const sublocality = components.find((c: any) =>
          c.types.includes('sublocality_level_1') || c.types.includes('neighborhood') || c.types.includes('sublocality')
        )?.long_name ?? ''

        const street = [route, number ? `#${number}` : ''].filter(Boolean).join(' ')
        onAddress(street || pred.mainText)
        if (!sector && sublocality) onSector(sublocality)

        onCoordsRef.current(latN.toFixed(6), lngN.toFixed(6))
        placeMarker(latN, lngN)
        map.setCenter({ lat: latN, lng: lngN })
        map.setZoom(PIN_ZOOM)

        setPredictions([])
        setShowDrop(false)
        setNoResults(false)
      }
    )
  }

  function clearPin() {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setMap(null)
      markerRef.current = null
    }
    setHasPin(false)
    onCoords('', '')
    mapRef.current?.setCenter({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] })
    mapRef.current?.setZoom(DEFAULT_ZOOM)
  }

  return (
    <div className="space-y-3">

      {/* Dirección + Sector */}
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
                if (e.key === 'Escape') { setShowDrop(false); setPredictions([]) }
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
              : address && (
                <button type="button" onClick={() => { onAddress(''); setPredictions([]); setShowDrop(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  <X size={13} />
                </button>
              )
            }

            {/* Dropdown de resultados */}
            {showDrop && predictions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 9999, maxHeight: 260, overflowY: 'auto' }}>
                {predictions.map((pred, i) => (
                  <li key={pred.placeId}>
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); pickPrediction(pred) }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-start gap-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
                      style={{ borderBottom: i < predictions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <MapPin size={13} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                      <div className="min-w-0">
                        <div className="font-medium leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                          {pred.mainText}
                        </div>
                        {pred.secondaryText && (
                          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {pred.secondaryText}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

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
