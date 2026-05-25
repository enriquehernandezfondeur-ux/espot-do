import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getHostPublicProfile } from '@/lib/actions/external-events'
import FormClient from './FormClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const host = await getHostPublicProfile(slug)
  if (!host) return { title: 'No encontrado' }
  return {
    title: `Reserva con ${host.full_name} — Espot`,
    description: `Envía tu solicitud de evento directamente a ${host.full_name}.`,
  }
}

export default async function HostPublicPage({ params }: Props) {
  const { slug } = await params
  const host = await getHostPublicProfile(slug)
  if (!host) notFound()

  const hostData = host as { id: string; full_name: string; avatar_url?: string; spaces: { id: string; name: string; category: string; city: string; sector?: string }[] }

  return (
    <div style={{ minHeight: '100dvh', background: '#F4F6F5', fontFamily: 'var(--font-poppins, sans-serif)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px 64px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="https://espot.do" style={{ display: 'inline-block', marginBottom: 24 }}>
            <img src="/logo-dark.svg" alt="Espot" style={{ height: 28 }} />
          </a>

          {hostData.avatar_url ? (
            <img
              src={hostData.avatar_url}
              alt={hostData.full_name}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'block', margin: '0 auto 16px' }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'rgba(53,196,147,0.15)',
              border: '3px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 28, fontWeight: 700, color: '#35C493',
            }}>
              {hostData.full_name.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F1623', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            {hostData.full_name}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
            Completa el formulario y te contactaremos para coordinar tu evento.
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E8ECF0',
        }}>
          <FormClient
            hostId={hostData.id}
            hostName={hostData.full_name}
            spaces={hostData.spaces}
          />
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 20 }}>
          Powered by{' '}
          <a href="https://espot.do" style={{ color: '#35C493', textDecoration: 'none', fontWeight: 600 }}>
            espot.do
          </a>
        </p>
      </div>
    </div>
  )
}
