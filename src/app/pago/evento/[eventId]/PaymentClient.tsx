'use client'

import { useState } from 'react'
import { notifyPaymentMade } from '@/lib/actions/external-events'
import { Copy, CheckCircle2, Loader2, Building2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BankInfo {
  account_holder: string
  bank_name: string
  account_type: string
  account_number: string
  cedula_or_rnc: string
}

interface Props {
  eventId:  string
  bank:     BankInfo | null
  remaining: number
  hostName: string
}

export default function PaymentClient({ eventId, bank, remaining, hostName }: Props) {
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [copied,  setCopied]  = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  async function handleNotify() {
    setLoading(true)
    await notifyPaymentMade(eventId, note.trim() || undefined)
    setLoading(false)
    setSent(true)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#F9FAFB', border: '1.5px solid #E8ECF0',
    borderRadius: 10, padding: '10px 14px', fontSize: 16,
    color: '#0F1623', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', resize: 'vertical',
  }

  if (sent) {
    return (
      <div style={{ background: '#fff', borderRadius: 20, padding: '32px 24px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E8ECF0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(53,196,147,0.1)', border: '2px solid rgba(53,196,147,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <CheckCircle2 size={28} color="#35C493" />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F1623', margin: '0 0 8px' }}>¡Notificación enviada!</h3>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
          Le notificamos a <strong>{hostName}</strong> que realizaste la transferencia. Te contactarán para confirmar.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Bank transfer */}
      {bank ? (
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E8ECF0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Building2 size={16} color="#35C493" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F1623' }}>Transferencia bancaria</h3>
          </div>

          {[
            { label: 'Titular', value: bank.account_holder },
            { label: 'Banco', value: bank.bank_name },
            { label: 'Tipo', value: bank.account_type === 'ahorro' ? 'Ahorro' : 'Corriente' },
            { label: 'Cuenta', value: bank.account_number },
            { label: 'Cédula / RNC', value: bank.cedula_or_rnc },
            { label: 'Monto', value: formatCurrency(remaining) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{row.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F1623' }}>{row.value}</span>
                {['Cuenta', 'Cédula / RNC', 'Monto'].includes(row.label) && (
                  <button
                    onClick={() => copy(row.value, row.label)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: copied === row.label ? '#35C493' : '#9CA3AF' }}
                  >
                    {copied === row.label ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', textAlign: 'center', border: '1px solid #E8ECF0' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
            Contacta a <strong>{hostName}</strong> para coordinar el pago.
          </p>
        </div>
      )}

      {/* Notify section */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E8ECF0' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0F1623' }}>
          ¿Ya realizaste la transferencia?
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
          Avísale a {hostName} que completaste el pago y deja una nota si lo deseas.
        </p>
        <textarea
          rows={2}
          placeholder="Ej: Transferí RD$5,000 a las 3pm por BHD León..."
          value={note}
          onChange={e => setNote(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={handleNotify}
          disabled={loading}
          style={{
            marginTop: 12, width: '100%', background: '#35C493', color: '#fff',
            fontWeight: 800, fontSize: 14, padding: '13px 20px', borderRadius: 50,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(53,196,147,0.3)',
          }}>
          {loading ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Notificar pago →'}
        </button>
      </div>
    </div>
  )
}
