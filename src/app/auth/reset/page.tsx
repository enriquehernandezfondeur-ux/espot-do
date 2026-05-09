// Server component wrapper — exporta dynamic para evitar pre-render estático
// que falla cuando createBrowserClient se llama sin env vars en build time
export const dynamic = 'force-dynamic'

import ResetPageClient from './ResetPageClient'

export default function ResetPage() {
  return <ResetPageClient />
}
