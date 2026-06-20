import { getAdminPayments } from '@/lib/actions/admin'
import { formatCurrency } from '@/lib/utils'
import { platformFeeOf } from '@/lib/pricing'
import { CreditCard, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import PagosTable from './PagosTable'

const PAID = ['advance', 'partial', 'paid']

export default async function AdminPagosPage() {
  const bookings = await getAdminPayments()

  const commission      = (b: any) => platformFeeOf(b)
  const totalRevenue    = bookings.reduce((s, b) => s + commission(b), 0)
  const totalPaid       = bookings.filter(b => PAID.includes((b as any).payment_status)).reduce((s, b) => s + commission(b), 0)
  const totalPending    = bookings.filter(b => !PAID.includes((b as any).payment_status)).reduce((s, b) => s + commission(b), 0)
  const totalEventValue = bookings.reduce((s, b) => s + Number((b as any).total_amount), 0)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F1623', letterSpacing: '-0.02em' }}>Pagos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Historial de comisiones y pagos de la plataforma</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Comisión total"      value={formatCurrency(totalRevenue)}    icon={TrendingUp}  color="var(--brand)" />
        <StatCard label="Comisión cobrada"    value={formatCurrency(totalPaid)}       icon={CheckCircle} color="#16A34A" />
        <StatCard label="Comisión pendiente"  value={formatCurrency(totalPending)}    icon={Clock}       color="#D97706" />
        <StatCard label="Valor total eventos" value={formatCurrency(totalEventValue)} icon={CreditCard}  color="#7C3AED" />
      </div>

      {/* Table (paginada en cliente — el resumen agrega sobre el total) */}
      <PagosTable bookings={bookings} />
    </div>
  )
}
