import type { Metadata } from 'next'
import AplicarClient from './AplicarClient'

export const metadata: Metadata = {
  title:       'Publica tu espacio — Espot',
  description: 'Solicita unirte a Espot y empieza a recibir reservas para tu salón, restaurante, villa, rooftop u otro espacio para eventos.',
  robots:      { index: false },
}

export default function AplicarPage() {
  return <AplicarClient />
}
