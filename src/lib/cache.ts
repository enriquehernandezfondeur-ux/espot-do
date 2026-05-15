// Sistema de cache inteligente para Espot
// Implementa cache en memoria con TTL y LRU eviction

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SmartCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize: number
  private defaultTTL: number

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) { // 5 minutos por defecto
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // LRU eviction si alcanzamos el límite
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    // Verificar si expiró
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Sentinel para diferenciar "null almacenado" de "cache miss"
  private static readonly NULL_SENTINEL = Symbol('cache_null')

  // Cache con fetch automático
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T | typeof SmartCache.NULL_SENTINEL>(key)

    if (cached === SmartCache.NULL_SENTINEL) return null as unknown as T
    if (cached !== null) return cached as T

    const data = await fetcher()
    // Almacenar sentinel para null/undefined para evitar re-fetch infinito
    this.set(key, data ?? SmartCache.NULL_SENTINEL, ttl)
    return data
  }

  // Estadísticas del cache
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Podríamos trackear hits/misses si fuera necesario
    }
  }
}

// Instancias de cache para diferentes tipos de datos
export const userCache = new SmartCache(50, 10 * 60 * 1000) // 10 minutos para usuarios
export const spaceCache = new SmartCache(200, 15 * 60 * 1000) // 15 minutos para espacios
export const bookingCache = new SmartCache(100, 5 * 60 * 1000) // 5 minutos para reservas

// Cache global para datos estáticos
export const staticCache = new SmartCache(20, 60 * 60 * 1000) // 1 hora para datos estáticos

// Función helper para cache con React
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  cache: SmartCache = staticCache
) {
  return cache.getOrFetch(key, fetcher)
}