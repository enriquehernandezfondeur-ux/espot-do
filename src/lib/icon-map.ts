import {
  Wine, Music2, Volume2, Sun, Users, Shield, Sparkles,
  Monitor, Package, UtensilsCrossed, Camera, Video,
  Clock, Building2,
} from 'lucide-react'

/**
 * Returns the Lucide icon component for a given addon name.
 * Usage: const I = addonIcon(name); return <I size={18} />
 */
export function addonIcon(name: string): React.ElementType {
  const n = name.toLowerCase()
  if (n.includes('bartender') || n.includes('barra')) return Wine
  if (n.includes('dj'))         return Music2
  if (n.includes('sonido'))     return Volume2
  if (n.includes('iluminaci'))  return Sun
  if (n.includes('camarero'))   return Users
  if (n.includes('seguridad'))  return Shield
  if (n.includes('decorac'))    return Sparkles
  if (n.includes('proyector'))  return Monitor
  if (n.includes('torta') || n.includes('pastel')) return Package
  if (n.includes('menú') || n.includes('catering')) return UtensilsCrossed
  if (n.includes('vino') || n.includes('open bar')) return Wine
  if (n.includes('fotóg') || n.includes('foto'))   return Camera
  if (n.includes('video'))      return Video
  if (n.includes('músico') || n.includes('orquesta')) return Music2
  if (n.includes('maquill'))    return Sparkles
  if (n.includes('extra') || n.includes('hora adicional') || n.includes('hora adic')) return Clock
  if (n.includes('suite'))      return Building2
  if (n.includes('pantalla') || n.includes('led')) return Monitor
  return Package
}
