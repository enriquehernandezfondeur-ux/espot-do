import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, Camera, CalendarCheck, ArrowRight, Lightbulb } from 'lucide-react'

export const metadata = { title: 'Bienvenido a Espot — Panel de Propietario' }

export default async function BienvenidaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Si el host ya tiene espacios publicados → ir al dashboard principal
  const { count } = await supabase
    .from('spaces')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', user.id)

  if (count && count > 0) redirect('/dashboard/host')

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Propietario'

  const steps = [
    {
      number: '①',
      title: 'Crea tu espacio',
      description: 'Nombre, descripción, ubicación y precio',
      status: 'action' as const,
      href: '/dashboard/host/espacio',
    },
    {
      number: '②',
      title: 'Sube tus fotos',
      description: 'Directamente en el formulario del espacio',
      status: 'pending' as const,
    },
    {
      number: '③',
      title: 'Publica y empieza a recibir reservas',
      description: 'Tu espacio estará visible en el marketplace',
      status: 'pending' as const,
    },
  ]

  const tips = [
    'Espacios con 5+ fotos reciben 3x más reservas',
    'Responde rápido: el tiempo de respuesta aparece en tu perfil público',
    'Precio competitivo: revisa espacios similares en el marketplace antes de publicar',
  ]

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-8"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl overflow-hidden"
        style={{
          background: 'var(--bg-card, var(--bg-surface))',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
        }}
      >
        {/* Header */}
        <div
          className="px-8 py-8"
          style={{
            background: 'var(--brand-navy, #03313C)',
            borderBottom: '4px solid var(--brand)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(53,196,147,0.15)' }}
            >
              <Building2 size={22} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Panel de Propietario
              </p>
              <h1
                className="text-2xl font-black leading-tight"
                style={{ color: '#fff', letterSpacing: '-0.03em' }}
              >
                Bienvenido a Espot, {firstName} 👋
              </h1>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
            En 3 pasos tu espacio estará publicado y listo para recibir reservas.
          </p>
        </div>

        {/* Steps */}
        <div className="px-8 py-7">
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-5"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}
          >
            Los 3 pasos
          </h2>

          <div className="space-y-3 mb-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{
                  background: step.status === 'action'
                    ? 'var(--brand-dim, rgba(53,196,147,0.08))'
                    : 'var(--bg-elevated, #F7F8FA)',
                  border: step.status === 'action'
                    ? '1.5px solid var(--brand-border, rgba(53,196,147,0.2))'
                    : '1.5px solid var(--border-subtle)',
                }}
              >
                <span
                  className="text-2xl shrink-0 w-9 text-center"
                  style={{ color: step.status === 'action' ? 'var(--brand)' : 'var(--text-muted)' }}
                >
                  {step.number}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-sm"
                    style={{ color: step.status === 'action' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {step.description}
                  </p>
                </div>
                {step.status === 'action' && step.href && (
                  <Link
                    href={step.href}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all"
                    style={{
                      background: 'var(--brand)',
                      color: '#fff',
                    }}
                  >
                    Empezar
                    <ArrowRight size={13} />
                  </Link>
                )}
                {step.status === 'pending' && (
                  <span
                    className="text-xs px-3 py-1.5 rounded-lg font-medium shrink-0"
                    style={{ background: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                  >
                    En el form
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* CTA principal */}
          <Link
            href="/dashboard/host/espacio"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-base transition-all"
            style={{
              background: 'var(--brand)',
              color: '#fff',
              letterSpacing: '-0.01em',
              boxShadow: '0 4px 20px rgba(53,196,147,0.3)',
            }}
          >
            <Building2 size={18} />
            Crear mi primer espacio
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Tips */}
        <div
          className="px-8 py-6"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated, #F7F8FA)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={15} style={{ color: 'var(--brand)' }} />
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              Tips rápidos
            </h3>
          </div>
          <ul className="space-y-2.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                  style={{ background: 'var(--brand)' }}
                />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {tip}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
