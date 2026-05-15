import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/app/dashboard/host/page'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/bookingConfig'

// Mock del módulo de bookingConfig
jest.mock('@/lib/bookingConfig', () => ({
  STATUS_LABELS: {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled_guest: 'Cancelada por cliente',
    cancelled_host: 'Cancelada por anfitrión',
  },
  STATUS_COLORS: {
    pending: { bg: '#fef3c7', color: '#d97706' },
    accepted: { bg: '#dbeafe', color: '#2563eb' },
    confirmed: { bg: '#d1fae5', color: '#065f46' },
    completed: { bg: '#d1fae5', color: '#065f46' },
    cancelled_guest: { bg: '#fee2e2', color: '#dc2626' },
    cancelled_host: { bg: '#fee2e2', color: '#dc2626' },
  },
}))

describe('StatusBadge Component', () => {
  it('renders all status types correctly', () => {
    const statuses = ['pending', 'accepted', 'confirmed', 'completed', 'cancelled_guest', 'cancelled_host']

    statuses.forEach((status) => {
      const { rerender } = render(<StatusBadge status={status} />)
      expect(screen.getByText(STATUS_LABELS[status as keyof typeof STATUS_LABELS])).toBeInTheDocument()
      rerender(<div />) // Limpiar para el siguiente test
    })
  })

  it('applies correct styling for each status', () => {
    const { rerender } = render(<StatusBadge status="confirmed" />)
    const badge = screen.getByText('Confirmada')

    expect(badge).toBeInTheDocument()
    expect(badge).toHaveStyle({
      background: STATUS_COLORS.confirmed.bg,
      color: STATUS_COLORS.confirmed.color,
    })

    rerender(<StatusBadge status="pending" />)
    expect(screen.getByText('Pendiente')).toHaveStyle({
      background: STATUS_COLORS.pending.bg,
      color: STATUS_COLORS.pending.color,
    })
  })

  it('renders unknown status gracefully', () => {
    render(<StatusBadge status="unknown" />)
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })

  it('includes status indicator dot', () => {
    render(<StatusBadge status="accepted" />)
    const dots = screen.getAllByTestId ? screen.getAllByTestId('status-dot') : document.querySelectorAll('.status-dot')

    // Verificar que hay al menos un indicador visual
    const badge = screen.getByText('Aceptada').closest('span')
    expect(badge).toBeInTheDocument()
  })
})