import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'espot.do — Vista Experimental',
  robots: { index: false, follow: false },
}

export default function ExperimentalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
