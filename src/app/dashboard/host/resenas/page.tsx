'use client'

import { useState, useEffect } from 'react'
import { Star, MessageSquare, CheckCircle, Loader2, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { getHostReviews, respondToReview, type Review } from '@/lib/actions/reviews'
import { formatDate } from '@/lib/utils'
import { LoadError } from '@/components/LoadError'

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 16 16">
          <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z"
            fill={s <= rating ? '#F59E0B' : '#E5E7EB'} />
        </svg>
      ))}
    </div>
  )
}

export default function ResenasPage() {
  const [reviews,   setReviews]   = useState<Review[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [response,  setResponse]  = useState('')
  const [saving,    setSaving]    = useState<string | null>(null)
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function load() {
    setLoading(true); setLoadError(false)
    getHostReviews().then(r => { setReviews(r); setLoading(false) }).catch(() => { setLoadError(true); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  async function handleRespond(reviewId: string) {
    if (!response.trim()) return
    setSaving(reviewId)
    const result = await respondToReview(reviewId, response)
    if (result.error) {
      showToast(result.error, false)
    } else {
      setReviews(prev => prev.map(r =>
        r.id === reviewId
          ? { ...r, host_response: response.trim(), host_response_at: new Date().toISOString() }
          : r
      ))
      setExpanded(null)
      setResponse('')
      showToast('Respuesta publicada', true)
    }
    setSaving(null)
  }

  const avg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—'

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {toast && (
        <div className="fixed top-16 right-4 md:top-5 md:right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl"
          style={{ background: toast.ok ? 'var(--brand)' : 'var(--danger)', color: '#fff' }}>
          {toast.ok ? <Check size={15} /> : <X size={15} />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Reseñas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Responde públicamente a lo que tus clientes dicen sobre tu espacio
          </p>
        </div>
        {reviews.length > 0 && (
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {avg}
            </div>
            <div className="flex justify-end mt-0.5">
              <StarRow rating={Math.round(Number(avg))} />
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {reviews.length} reseña{reviews.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      ) : loadError ? (
        <div className="rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <LoadError message="No pudimos cargar tus reseñas." onRetry={load} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
          style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-medium)' }}>
          <Star size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin reseñas aún</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Cuando tus clientes dejen reseñas, aparecerán aquí para que puedas responderlas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

              {/* Reseña del cliente */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {review.guest.full_name ?? 'Cliente'}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(review.created_at)}
                      {review.space && (
                        <span> · {review.space.name}</span>
                      )}
                    </div>
                  </div>
                  <StarRow rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    "{review.comment}"
                  </p>
                )}
              </div>

              {/* Respuesta del host (si existe) */}
              {review.host_response && (
                <div className="px-5 pb-4 pt-0">
                  <div className="rounded-xl px-4 py-3"
                    style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-border)' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CheckCircle size={12} style={{ color: 'var(--brand)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
                        Tu respuesta
                        {review.host_response_at && (
                          <span className="font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                            · {formatDate(review.host_response_at)}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {review.host_response}
                    </p>
                    <button
                      onClick={() => {
                        const willOpen = expanded !== review.id
                        setExpanded(willOpen ? review.id : null)
                        setResponse(willOpen ? (review.host_response ?? '') : '')
                      }}
                      className="text-xs font-medium mt-2" style={{ color: 'var(--brand)' }}>
                      Editar respuesta
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario de respuesta */}
              {!review.host_response && (
                <div className="px-5 pb-4 pt-0">
                  <button
                    onClick={() => {
                      const willOpen = expanded !== review.id
                      setExpanded(willOpen ? review.id : null)
                      setResponse('')
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <MessageSquare size={12} />
                    Responder
                    {expanded === review.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              )}

              {expanded === review.id && (
                <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs font-semibold mt-4 mb-2" style={{ color: 'var(--text-muted)' }}>
                    Tu respuesta pública (visible para todos los visitantes del espacio)
                  </p>
                  <textarea
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    placeholder="Ej: ¡Gracias por tu reseña! Fue un placer recibirlos..."
                    rows={3}
                    maxLength={500}
                    className="input-base w-full rounded-xl px-4 py-3 text-sm resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {response.length}/500
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => { setExpanded(null); setResponse('') }}
                        className="text-xs px-3 py-2 rounded-xl" style={{ color: 'var(--text-muted)' }}>
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleRespond(review.id)}
                        disabled={!response.trim() || saving === review.id}
                        className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40"
                        style={{ background: 'var(--brand)', color: '#fff' }}>
                        {saving === review.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Publicar respuesta
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
