'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Heart, Loader2, FolderPlus, Folder, FolderOpen, MoreHorizontal, Pencil, Trash2, X, Check, ArrowLeft, FolderInput } from 'lucide-react'
import { LoadError } from '@/components/LoadError'
import { getClientFavorites, getFavoriteFolders, createFavoriteFolder, deleteFavoriteFolder, renameFavoriteFolder, moveFavoriteToFolder } from '@/lib/actions/client'
import { SpaceCard } from '@/app/(marketplace)/buscar/SpaceCard'

type FavFolder = { id: string; name: string; created_at: string }
type Fav       = { id: string; folder_id: string | null; spaces: any }

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<Fav[]>([])
  const [folders,   setFolders]   = useState<FavFolder[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Navegación
  const [activeFolder, setActiveFolder] = useState<string | null>(null) // null = vista principal

  // Crear carpeta
  const [creating,   setCreating]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [saving,     setSaving]     = useState(false)

  // Menú de carpeta (renombrar / borrar)
  const [menuFolder, setMenuFolder] = useState<string | null>(null)
  const [renaming,   setRenaming]   = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')

  // Mover favorito a carpeta
  const [movingFav,  setMovingFav]  = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function loadFavoritos() {
    setLoading(true); setLoadError(false)
    Promise.all([getClientFavorites(), getFavoriteFolders()])
      .then(([favs, flds]) => { setFavorites(favs as Fav[]); setFolders(flds) })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadFavoritos() }, [])

  // Sincronizar al quitar un favorito desde una tarjeta (sin recargar)
  useEffect(() => {
    function onFavChange(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail && detail.saved === false) {
        setFavorites(prev => prev.filter(f => f.spaces?.id !== detail.spaceId))
      }
    }
    window.addEventListener('espot:favorite-changed', onFavChange)
    return () => window.removeEventListener('espot:favorite-changed', onFavChange)
  }, [])

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFolder(null)
      }
      setMovingFav(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleCreateFolder() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await createFavoriteFolder(newName)
    if ('folder' in res && res.folder) {
      setFolders(f => [...f, { id: res.folder.id, name: res.folder.name, created_at: new Date().toISOString() }])
    }
    setNewName(''); setCreating(false); setSaving(false)
  }

  async function handleRename(folderId: string) {
    if (!renameName.trim()) return
    await renameFavoriteFolder(folderId, renameName)
    setFolders(f => f.map(fd => fd.id === folderId ? { ...fd, name: renameName.trim() } : fd))
    setRenaming(null); setMenuFolder(null)
  }

  async function handleDeleteFolder(folderId: string) {
    if (!confirm('¿Eliminar esta carpeta? Los favoritos dentro quedarán sin carpeta.')) return
    await deleteFavoriteFolder(folderId)
    setFolders(f => f.filter(fd => fd.id !== folderId))
    setFavorites(fv => fv.map(f => f.folder_id === folderId ? { ...f, folder_id: null } : f))
    if (activeFolder === folderId) setActiveFolder(null)
    setMenuFolder(null)
  }

  async function handleMove(favoriteId: string, folderId: string | null) {
    await moveFavoriteToFolder(favoriteId, folderId)
    setFavorites(fv => fv.map(f => f.id === favoriteId ? { ...f, folder_id: folderId } : f))
    setMovingFav(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-dvh">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )
  if (loadError) return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Favoritos</h1>
      <div className="rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <LoadError message="No pudimos cargar tus favoritos." onRetry={loadFavoritos} />
      </div>
    </div>
  )

  // Espacios dentro de la carpeta activa
  const activeSpaces = activeFolder
    ? favorites.filter(f => f.folder_id === activeFolder)
    : favorites.filter(f => f.folder_id === null)

  const activeInfo = folders.find(f => f.id === activeFolder)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          {activeFolder && (
            <button onClick={() => setActiveFolder(null)}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {activeFolder ? (activeInfo?.name ?? 'Carpeta') : 'Favoritos'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {activeFolder
                ? `${activeSpaces.length} espacio${activeSpaces.length !== 1 ? 's' : ''}`
                : `${favorites.length} guardado${favorites.length !== 1 ? 's' : ''} · ${folders.length} carpeta${folders.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {!activeFolder && (
          <button
            onClick={() => { setCreating(true); setNewName('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            <FolderPlus size={15} /> Nueva carpeta
          </button>
        )}
      </div>

      {/* Empty total */}
      {favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
          style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
          <Heart size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin favoritos aún</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Guarda espacios que te gusten para encontrarlos fácilmente
          </p>
          <Link href="/buscar" className="btn-brand text-sm font-semibold px-5 py-2.5 rounded-xl">
            Explorar espacios
          </Link>
        </div>
      )}

      {/* Vista principal — carpetas + sin carpeta */}
      {favorites.length > 0 && !activeFolder && (
        <div className="space-y-8">

          {/* Crear carpeta inline */}
          {creating && (
            <div className="flex items-center gap-2 p-3 rounded-2xl"
              style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--brand-border)' }}>
              <Folder size={18} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="Nombre de la carpeta..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
                maxLength={40}
              />
              <button onClick={handleCreateFolder} disabled={saving || !newName.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-40"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button onClick={() => setCreating(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            </div>
          )}

          {/* Carpetas */}
          {folders.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Carpetas
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {folders.map(folder => {
                  const count = favorites.filter(f => f.folder_id === folder.id).length
                  const covers = favorites
                    .filter(f => f.folder_id === folder.id)
                    .slice(0, 1)
                    .map(f => (f.spaces?.space_images?.find((i: any) => i.is_cover) ?? f.spaces?.space_images?.[0])?.url)
                    .filter(Boolean)

                  return (
                    <div key={folder.id} className="relative group">
                      <button
                        onClick={() => setActiveFolder(folder.id)}
                        className="w-full rounded-2xl overflow-hidden text-left transition-all hover:-translate-y-0.5"
                        style={{ background: '#fff', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        {/* Mini preview */}
                        <div className="h-28 flex items-center justify-center"
                          style={{ background: covers[0] ? 'transparent' : 'var(--brand-dim)' }}>
                          {covers[0]
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={covers[0]} alt={folder.name} className="w-full h-full object-cover" />
                            : <FolderOpen size={32} style={{ color: 'var(--brand)' }} />
                          }
                        </div>
                        <div className="px-3 py-2.5">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{folder.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {count} espacio{count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </button>

                      {/* Menú de carpeta */}
                      <div className="absolute top-2 right-2" ref={menuFolder === folder.id ? menuRef : undefined}>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuFolder(menuFolder === folder.id ? null : folder.id) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', color: 'var(--text-secondary)' }}>
                          <MoreHorizontal size={14} />
                        </button>
                        {menuFolder === folder.id && (
                          <div className="absolute right-0 top-8 z-30 rounded-xl overflow-hidden shadow-lg"
                            style={{ background: '#fff', border: '1px solid var(--border-subtle)', width: 160 }}>
                            {renaming === folder.id ? (
                              <div className="p-2 flex items-center gap-1.5">
                                <input autoFocus value={renameName}
                                  onChange={e => setRenameName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleRename(folder.id); if (e.key === 'Escape') setRenaming(null) }}
                                  className="flex-1 text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--brand-border)' }}
                                  maxLength={40} />
                                <button onClick={() => handleRename(folder.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md"
                                  style={{ background: 'var(--brand)', color: '#fff' }}>
                                  <Check size={11} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => { setRenaming(folder.id); setRenameName(folder.name) }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[var(--bg-elevated)]"
                                  style={{ color: 'var(--text-primary)' }}>
                                  <Pencil size={13} /> Renombrar
                                </button>
                                <button onClick={() => handleDeleteFolder(folder.id)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-red-50"
                                  style={{ color: '#DC2626', borderTop: '1px solid var(--border-subtle)' }}>
                                  <Trash2 size={13} /> Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sin carpeta */}
          {favorites.filter(f => f.folder_id === null).length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Sin carpeta
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {favorites.filter(f => f.folder_id === null).map(fav => (
                  <div key={fav.id} className="relative group">
                    <SpaceCard space={fav.spaces} isHovered={false} onHover={() => {}} />
                    {folders.length > 0 && (
                      <div className="absolute top-3 left-3 z-10">
                        <button
                          onClick={() => setMovingFav(movingFav === fav.id ? null : fav.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', color: 'var(--text-secondary)', boxShadow: '0 1px 6px rgba(0,0,0,0.1)' }}>
                          <FolderInput size={11} /> Mover
                        </button>
                        {movingFav === fav.id && (
                          <div className="absolute left-0 top-8 z-30 rounded-xl overflow-hidden shadow-lg"
                            style={{ background: '#fff', border: '1px solid var(--border-subtle)', minWidth: 180 }}>
                            {folders.map(fd => (
                              <button key={fd.id} onClick={() => handleMove(fav.id, fd.id)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[var(--bg-elevated)]"
                                style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                                <Folder size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                                <span className="truncate">{fd.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista de carpeta activa */}
      {activeFolder && (
        <div>
          {activeSpaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
              style={{ background: '#fff', border: '2px dashed var(--border-medium)' }}>
              <FolderOpen size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Carpeta vacía</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Mueve favoritos aquí desde la vista principal
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
              {activeSpaces.map(fav => (
                <div key={fav.id} className="relative group">
                  <SpaceCard space={fav.spaces} isHovered={false} onHover={() => {}} />
                  <div className="absolute top-3 left-3 z-10">
                    <button
                      onClick={() => handleMove(fav.id, null)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', color: '#DC2626', boxShadow: '0 1px 6px rgba(0,0,0,0.1)' }}>
                      <X size={11} /> Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
