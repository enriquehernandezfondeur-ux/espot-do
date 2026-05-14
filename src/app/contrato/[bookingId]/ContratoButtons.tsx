'use client'

export default function ContratoButtons() {
  return (
    <div style={{ marginBottom: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
      <button
        onClick={() => window.print()}
        style={{ padding: '8px 20px', background: '#35C493', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
        Imprimir / Descargar PDF
      </button>
      <button
        onClick={() => window.history.back()}
        style={{ padding: '8px 16px', background: '#F4F6F8', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
        Cerrar
      </button>
    </div>
  )
}
