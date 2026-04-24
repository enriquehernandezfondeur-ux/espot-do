import Sidebar from '@/components/dashboard/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark-theme flex min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-base)' }}>
        {children}
      </main>
    </div>
  )
}
