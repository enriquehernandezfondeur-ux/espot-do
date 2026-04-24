'use client'

import Link from 'next/link'
import { Search, Menu } from 'lucide-react'
import { useState } from 'react'

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="light-theme min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50" style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 0 var(--border-subtle)',
      }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-md"
              style={{ background: 'var(--brand)', color: '#fff', boxShadow: '0 2px 8px rgba(53,196,147,0.35)' }}>
              E
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-bold text-lg leading-none" style={{ color: 'var(--text-primary)' }}>espot</span>
              <span className="font-light text-lg leading-none" style={{ color: 'var(--brand)' }}>.do</span>
            </div>
          </Link>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm rounded-full px-4 py-2.5 cursor-pointer"
            style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-medium)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              placeholder="Buscar espacios..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
              onKeyDown={e => { if (e.key === 'Enter') window.location.href = `/buscar?q=${(e.target as HTMLInputElement).value}` }}
            />
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link href="/buscar" className="link-muted text-sm font-medium px-3 py-2 rounded-lg">
              Explorar
            </Link>
            <Link href="/auth" className="link-muted text-sm font-medium px-3 py-2 rounded-lg">
              Iniciar sesión
            </Link>
            <Link href="/auth" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-full">
              Publicar espacio
            </Link>
          </div>

          {/* Mobile menu */}
          <button className="md:hidden p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={20} />
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)', background: '#fff' }}>
            <Link href="/buscar" className="block py-2.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Explorar</Link>
            <Link href="/auth" className="block py-2.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Iniciar sesión</Link>
            <Link href="/auth" className="btn-brand block text-center text-sm font-semibold px-5 py-2.5 rounded-full mt-2">
              Publicar espacio
            </Link>
          </div>
        )}
      </nav>

      {children}

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: '#fff' }} className="py-10 px-6 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'var(--brand)' }}>E</div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                espot<span style={{ color: 'var(--brand)', fontWeight: 400 }}>.do</span>
              </span>
            </Link>
            <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              <Link href="/buscar" className="link-muted">Explorar espacios</Link>
              <Link href="/auth" className="link-muted">Para propietarios</Link>
              <span>contacto@espot.do</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© 2026 espot.do · República Dominicana</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
