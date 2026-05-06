// Passthrough — no sidebar here.
// Client pages use (client)/layout.tsx → ClientSidebar + light-theme
// Host pages use host/layout.tsx → Sidebar + host-theme
export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
