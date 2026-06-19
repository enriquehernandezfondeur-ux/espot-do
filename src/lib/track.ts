// Tracking de clics de intención desde el cliente. Fire-and-forget: nunca
// bloquea ni interrumpe la UI si falla.
export type SpaceClickType = 'book_intent' | 'contact_intent' | 'share'

export function trackSpaceClick(spaceId: string, type: SpaceClickType = 'book_intent') {
  try {
    fetch('/api/spaces/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId, type }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignorar
  }
}
