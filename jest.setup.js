import '@testing-library/jest-dom'

// Polyfill requerido por Next.js 16 en entorno jsdom (no incluye TextEncoder/TextDecoder)
const { TextEncoder, TextDecoder } = require('util')
Object.assign(global, { TextEncoder, TextDecoder })

// Mock de next/cache (no disponible en jsdom — usa APIs de Node que jsdom no tiene)
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag:  jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}))

// Mock de Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock básico de Supabase - solo mockeamos lo necesario
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  })),
}), { virtual: true })

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  })),
}), { virtual: true })