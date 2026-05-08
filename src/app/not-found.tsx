import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base, #F4F6F5)', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          fontSize: 96, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1,
          background: 'linear-gradient(135deg, #35C493, #5CE8BC)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 16,
        }}>
          404
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1623', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Página no encontrada
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          El espacio o la página que buscas no existe o ya no está disponible.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/buscar"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 14, fontWeight: 700,
              fontSize: 14, background: '#35C493', color: '#060D09', textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(53,196,147,0.3)',
            }}>
            🔍 Buscar espacios
          </Link>
          <Link href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 14, fontWeight: 600,
              fontSize: 14, background: '#fff', color: '#374151',
              border: '1.5px solid #E2E8F0', textDecoration: 'none',
            }}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
