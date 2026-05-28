'use client'

import { CheckCircle2, Lock, Users } from 'lucide-react'

export default function TrustSignals() {
  const signals = [
    {
      icon: Lock,
      label: 'Pagos seguros',
      desc: 'Procesados con encriptación de grado bancario',
    },
    {
      icon: Users,
      label: 'Reseñas verificadas',
      desc: 'Solo de clientes que completaron reservas',
    },
    {
      icon: CheckCircle2,
      label: 'Espacios auténticos',
      desc: 'Cada espacio es verificado manualmente',
    },
  ]

  return (
    <section
      className="border-t border-b"
      style={{
        background: '#fff',
        borderColor: '#E8ECF0',
      }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {signals.map((signal, i) => {
            const Icon = signal.icon
            return (
              <div
                key={i}
                className="flex flex-col items-center text-center"
                style={{
                  animation: `fadeInUp 0.8s ease-out ${0.1 + i * 0.1}s backwards`,
                }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: 'rgba(53,196,147,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}>
                  <Icon size={20} style={{ color: '#35C493' }} />
                </div>
                <h3
                  className="text-base font-semibold mb-1.5"
                  style={{ color: '#0F1623' }}>
                  {signal.label}
                </h3>
                <p
                  className="text-sm"
                  style={{
                    color: '#6B7280',
                    lineHeight: 1.5,
                  }}>
                  {signal.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
