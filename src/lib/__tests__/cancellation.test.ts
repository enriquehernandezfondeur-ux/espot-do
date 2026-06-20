import { cancellationPolicyText } from '@/lib/cancellation'

describe('cancellationPolicyText', () => {
  it('flexible: reembolso total con antelación', () => {
    expect(cancellationPolicyText('flexible', 100, 48))
      .toBe('Cancelación flexible · Reembolso del 100% si cancelas con al menos 48 h de antelación.')
  })
  it('moderada: reembolso parcial', () => {
    expect(cancellationPolicyText('moderate', 50, 72))
      .toBe('Cancelación moderada · Reembolso del 50% si cancelas con al menos 72 h de antelación.')
  })
  it('estricta sin reembolso', () => {
    expect(cancellationPolicyText('strict', 0, 168))
      .toBe('Cancelación estricta · Sin reembolso una vez confirmada la reserva.')
  })
  it('datos faltantes → texto seguro', () => {
    expect(cancellationPolicyText(null, null, null))
      .toBe('Consulta la política de cancelación con el propietario.')
  })
})
