'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  spaceId: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function FavoriteButton({ spaceId, size = 'md', className = '' }: Props) {
  const [saved,       setSaved]       = useState(false)
  const [favoriteId,  setFavoriteId]  = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [pulse,       setPulse]       = useState(false)
  const [mounted,     setMounted]     = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('favorites')
        .select('id')
        .eq('guest_id', user.id)
        .eq('space_id', spaceId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) { setSaved(true); setFavoriteId(data.id) }
        })
    })
  }, [spaceId])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setLoading(true)
    if (saved && favoriteId) {
      await supabase.from('favorites').delete().eq('id', favoriteId).eq('guest_id', user.id)
      setSaved(false)
      setFavoriteId(null)
    } else {
      const { data } = await supabase
        .from('favorites')
        .insert({ guest_id: user.id, space_id: spaceId })
        .select('id')
        .single()
      if (data) {
        setSaved(true)
        setFavoriteId(data.id)
        // Animación de pulso al guardar
        setPulse(true)
        setTimeout(() => setPulse(false), 600)
      }
    }
    setLoading(false)
  }

  if (!mounted) return null

  const dims =
    size === 'sm' ? { btn: 'w-8 h-8',   icon: 15 } :
    size === 'lg' ? { btn: 'w-11 h-11', icon: 20 } :
                    { btn: 'w-9 h-9 md:w-10 md:h-10', icon: 18 }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      disabled={loading}
      className={`${dims.btn} rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 disabled:cursor-wait ${className}`}
      style={{
        background: saved ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(10px)',
        boxShadow: saved
          ? '0 2px 10px rgba(239,68,68,0.22), 0 1px 3px rgba(0,0,0,0.10)'
          : '0 2px 10px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)',
        border: saved
          ? '1.5px solid rgba(239,68,68,0.25)'
          : '1.5px solid rgba(255,255,255,0.85)',
        transform: pulse ? 'scale(1.25)' : undefined,
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s, box-shadow 0.2s',
      }}>
      <Heart
        size={dims.icon}
        style={{
          color:      saved ? '#EF4444' : '#374151',
          fill:       saved ? '#EF4444' : 'transparent',
          transition: 'fill 0.2s ease, color 0.2s ease, transform 0.2s ease',
          transform:  saved ? 'scale(1.05)' : 'scale(1)',
          strokeWidth: saved ? 2 : 1.75,
        }}
      />
    </button>
  )
}
