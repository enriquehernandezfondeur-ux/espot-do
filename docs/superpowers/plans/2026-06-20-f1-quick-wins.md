# Espot F1 — Quick Wins (Auditoría 2026-06-20) · Plan de implementación

> **Para workers agénticos:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar tarea por tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Cerrar 5 quick wins de la auditoría: política de cancelación visible al cliente, WhatsApp real en Ayuda, "qué incluye el paquete" en el detalle público, overview del cliente más liviano, y deep-link de "Contactar propietario" a la conversación correcta.

**Architecture:** Cambios localizados de query + render en el panel del cliente y el detalle del marketplace, más un helper puro reutilizable para el texto de cancelación (DRY). Sin cambios de esquema. Sin tocar el camino crítico de precio.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 (variables de tema), Supabase, Jest.

**Verificación en este repo:** no hay harness de tests de componentes; la lógica pura se prueba con Jest (`npx jest`), y los cambios de UI/query se verifican con `npx tsc --noEmit` + `npm run build` + regresión de Jest (debe seguir en 100/100) + captura visual con el método de la memoria `local_run_qa_constraints` (dev server en un puerto + cookie `espot_preview_access`). NO inventar tests de componentes.

**Regla del proyecto:** usar variables de tema (`var(--...)`), nunca HEX hardcodeado. No push automático.

---

### Task 1: Helper de texto de cancelación + mostrarlo en el detalle de reserva del cliente

**Problema (auditoría F1):** `getClientBookingDetail` NO incluye `space_conditions` en su `.select()`, así que el cliente no ve la política de cancelación justo cuando va a cancelar. Además el texto de política se reconstruye inline en varios sitios.

**Files:**
- Create: `src/lib/cancellation.ts`
- Test: `src/lib/__tests__/cancellation.test.ts`
- Modify: `src/lib/actions/client.ts` (select de `getClientBookingDetail`, ~líneas 39-48)
- Modify: `src/app/dashboard/(client)/reservas/[id]/page.tsx` (render)

- [ ] **Step 1.1: Escribir el test que falla del helper puro**

```ts
// src/lib/__tests__/cancellation.test.ts
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
```

- [ ] **Step 1.2: Correr el test y verificar que falla**

Run: `npx jest cancellation`
Expected: FAIL — "Cannot find module '@/lib/cancellation'".

- [ ] **Step 1.3: Implementar el helper**

```ts
// src/lib/cancellation.ts
// Texto único de política de cancelación para mostrar al cliente. Fuente única:
// se usa en el detalle público y en el detalle/listado de reservas del cliente.
const LABEL: Record<string, string> = {
  flexible: 'Cancelación flexible',
  moderate: 'Cancelación moderada',
  moderada: 'Cancelación moderada',
  strict:   'Cancelación estricta',
  estricta: 'Cancelación estricta',
}

export function cancellationPolicyText(
  policy?: string | null,
  refundPct?: number | null,
  hoursBefore?: number | null,
): string {
  if (policy == null && refundPct == null && hoursBefore == null) {
    return 'Consulta la política de cancelación con el propietario.'
  }
  const label = LABEL[String(policy ?? '').toLowerCase()] ?? 'Política de cancelación'
  const pct = Number(refundPct ?? 0)
  if (pct <= 0) return `${label} · Sin reembolso una vez confirmada la reserva.`
  const h = Number(hoursBefore ?? 0)
  const cond = h > 0 ? ` si cancelas con al menos ${h} h de antelación` : ''
  return `${label} · Reembolso del ${pct}%${cond}.`
}
```

- [ ] **Step 1.4: Correr el test y verificar que pasa**

Run: `npx jest cancellation`
Expected: PASS (4 tests).

- [ ] **Step 1.5: Añadir `space_conditions` al select de `getClientBookingDetail`**

En `src/lib/actions/client.ts`, dentro del `spaces!space_id(...)` de `getClientBookingDetail`, añadir `space_conditions(...)` (igual que ya lo trae `getClientBookings`):

```ts
      spaces!space_id(
        id, name, slug, category, address, city, sector,
        space_images(url, is_cover),
        space_conditions(cancellation_policy, cancellation_refund_pct, cancellation_hours_before),
        profiles!host_id(id, full_name, email, phone, avatar_url)
      ),
```

- [ ] **Step 1.6: Renderizar la política en el detalle de reserva del cliente**

En `src/app/dashboard/(client)/reservas/[id]/page.tsx`: importar el helper y añadir una fila a la lista de "Detalles del evento" (la lista de `{label, value}` ~líneas 166-171), tomando `space_conditions` del booking. Ejemplo de fila a insertar tras la de "Tipo de reserva":

```tsx
import { cancellationPolicyText } from '@/lib/cancellation'
// ...
const cond = (space as any)?.space_conditions?.[0]
// dentro del array de filas:
cond ? { label: 'Cancelación', value: cancellationPolicyText(cond.cancellation_policy, cond.cancellation_refund_pct, cond.cancellation_hours_before) } : null,
```

- [ ] **Step 1.7: Verificar tipos + build + regresión**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc exit 0; Jest todos verdes (≥104 con los 4 nuevos).
Run: `npm run build`
Expected: "Compiled successfully".

- [ ] **Step 1.8: Verificación visual (opcional pero recomendada)**

Levantar dev en un puerto, setear cookie `espot_preview_access`, navegar a un detalle de reserva del cliente y confirmar que aparece la fila "Cancelación". (Requiere login del cliente → si no es posible headless, verificar el render por código y dejar la captura para el dueño.)

- [ ] **Step 1.9: Commit**

```bash
git add src/lib/cancellation.ts src/lib/__tests__/cancellation.test.ts src/lib/actions/client.ts "src/app/dashboard/(client)/reservas/[id]/page.tsx"
git commit -m "feat(cliente): muestra política de cancelación en el detalle de reserva (helper único)"
```

---

### Task 2: WhatsApp real de soporte en Ayuda

**Problema:** `ayuda/page.tsx:82` usa `wa.me/18093000000` (placeholder) en producción.

> ⚠️ DEPENDENCIA: el número real de soporte lo debe proveer el dueño. NO inventar. Si no está disponible, dejar `process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP` y, si está vacío, ocultar el botón de WhatsApp (mostrar solo el de email).

**Files:**
- Modify: `src/app/dashboard/(client)/ayuda/page.tsx:82`

- [ ] **Step 2.1: Reemplazar el placeholder por env con fallback seguro**

Sustituir el `<a href="https://wa.me/18093000000?...">` por un bloque que solo renderice WhatsApp si hay número configurado:

```tsx
{process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP && (
  <a href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP}?text=Hola%2C%20necesito%20ayuda%20con%20mi%20reserva%20en%20Espot`}
    target="_blank" rel="noopener noreferrer"
    className="...(conservar las clases actuales del botón)...">
    <MessageCircle size={15} /> WhatsApp
  </a>
)}
```

- [ ] **Step 2.2: Documentar la env**

Añadir a `.env.example`: `NEXT_PUBLIC_SUPPORT_WHATSAPP=` (con comentario "número de soporte, formato 1809XXXXXXX sin +"). El dueño la setea en Vercel.

- [ ] **Step 2.3: Verificar + commit**

```bash
npx tsc --noEmit && npm run build
git add "src/app/dashboard/(client)/ayuda/page.tsx" .env.example
git commit -m "fix(ayuda): quita WhatsApp placeholder; usa NEXT_PUBLIC_SUPPORT_WHATSAPP o lo oculta"
```

---

### Task 3: Mostrar "qué incluye el paquete" en el detalle público

**Problema (auditoría A3):** `package_name`/`package_includes` se editan y guardan pero el detalle público NO los muestra → el cliente no ve qué incluye el paquete antes de reservar.

**Files:**
- Modify: `src/app/(marketplace)/espacios/[slug]/SpaceDetailClient.tsx` (bloque `pricing?.pricing_type === 'fixed_package'`, ~línea 838)

- [ ] **Step 3.1: Añadir el render de incluidos dentro del bloque fixed_package**

Justo después del párrafo "Precio todo incluido" (~líneas 843), añadir (la query `getSpaceBySlug` ya trae `space_pricing(*)` con ambos campos):

```tsx
{Array.isArray(pricing.package_includes) && pricing.package_includes.length > 0 && (
  <div className="mt-3">
    {pricing.package_name && (
      <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{pricing.package_name}</p>
    )}
    <ul className="flex flex-col gap-1.5">
      {pricing.package_includes.map((item: string, i: number) => (
        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Check size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} />
          {item}
        </li>
      ))}
    </ul>
  </div>
)}
```

(Verificar que `Check` ya esté importado de `lucide-react` en el archivo; si no, añadirlo.)

- [ ] **Step 3.2: Verificar + captura + commit**

```bash
npx tsc --noEmit && npm run build && npx jest
```
Verificación visual: dev server + cookie, abrir un espacio con `pricing_type='fixed_package'` y confirmar la lista de incluidos. (Es página pública → sí capturable headless.)

```bash
git add "src/app/(marketplace)/espacios/[slug]/SpaceDetailClient.tsx"
git commit -m "feat(detalle): muestra nombre y qué incluye el paquete fijo antes de reservar"
```

---

### Task 4: Adelgazar el dashboard del cliente (quitar "Total gastado")

**Problema (auditoría):** el overview apila hasta 9 secciones; "Total gastado" es métrica contable no accionable para un cliente y ocupa 1 de 4 stat cards.

**Files:**
- Modify: `src/app/dashboard/(client)/overview/page.tsx:393` (array de stats)

- [ ] **Step 4.1: Eliminar la stat "Total gastado"**

Borrar la línea 393 del array de stats:

```tsx
{ label: 'Total gastado',  value: formatCurrency(stats?.totalSpent ?? 0), icon: CreditCard, color: '#7C3AED' },
```

Si tras quitarla el grid queda con 3 stats, ajustar el contenedor para que se distribuyan bien (p. ej. `grid-cols-3`). Si `CreditCard` o `formatCurrency` quedan sin uso en el archivo, quitar el import (tsc lo señalará).

- [ ] **Step 4.2: Verificar + commit**

```bash
npx tsc --noEmit && npm run build
git add "src/app/dashboard/(client)/overview/page.tsx"
git commit -m "feat(cliente): overview más liviano — quita stat 'Total gastado'"
```

> Nota: la reducción mayor del overview (mover "Cuotas pendientes" a Pagos, fusionar "Recién confirmadas") se aborda en el Plan F2 junto con la "tarjeta de balance por reserva". Aquí solo el quick win de bajo riesgo.

---

### Task 5: Deep-link "Contactar propietario" a la conversación correcta

**Problema (auditoría):** "Contactar propietario" enlaza a `/dashboard/mensajes` sin preseleccionar la conversación de esa reserva; el cliente cae en la bandeja a buscar manualmente.

**Files:**
- Modify: `src/app/dashboard/(client)/reservas/page.tsx` (4 enlaces "Contactar propietario": ~712, 748, 759, 789)
- Modify: `src/app/dashboard/(client)/reservas/[id]/page.tsx:302`
- Modify: `src/app/dashboard/(client)/mensajes/page.tsx` (leer el param y auto-seleccionar la conversación por `spaceId`)

- [ ] **Step 5.1: Pasar el espacio en el enlace**

En cada `<Link href="/dashboard/mensajes" ...>` de "Contactar propietario", cambiar el href a incluir el id del espacio de esa reserva. En `reservas/page.tsx` el objeto de la reserva expone `bk.space_id` (o `bk.spaces?.id`); usar el que exista en cada bloque:

```tsx
<Link href={`/dashboard/mensajes?espacio=${bk.space_id ?? bk.spaces?.id ?? ''}`} ...>
```

En `reservas/[id]/page.tsx:302` usar el id del espacio del booking del detalle (`booking.spaces?.id` / `booking.space_id`).

- [ ] **Step 5.2: Auto-seleccionar la conversación en mensajes**

En `src/app/dashboard/(client)/mensajes/page.tsx`, leer el query param y, cuando carguen las conversaciones, abrir la que coincida con ese `spaceId` (las conversaciones se identifican por `conv.spaceId`). Añadir cerca de los hooks superiores:

```tsx
import { useSearchParams } from 'next/navigation'
// ...
const searchParams = useSearchParams()
const targetSpace = searchParams.get('espacio')
```

Y en el efecto que setea las conversaciones (tras tenerlas en estado), si `targetSpace` existe y aún no hay conversación activa, seleccionar `conversations.find(c => c.spaceId === targetSpace)`. Seguir el patrón de selección de conversación ya existente en el archivo (misma función `setActive`/equivalente que usa el click de la lista).

- [ ] **Step 5.3: Verificar + commit**

```bash
npx tsc --noEmit && npm run build && npx jest
git add "src/app/dashboard/(client)/reservas/page.tsx" "src/app/dashboard/(client)/reservas/[id]/page.tsx" "src/app/dashboard/(client)/mensajes/page.tsx"
git commit -m "feat(cliente): 'Contactar propietario' abre directo la conversación del espacio"
```

---

## Cierre de F1

- [ ] **Verificación final de fase:** `npx tsc --noEmit` (0) · `npx jest` (verde, ≥104) · `npm run build` (Compiled successfully).
- [ ] **NO push** hasta autorización explícita del dueño.

## Fuera de alcance de F1 (planes siguientes)
- **F2 — Operación crítica:** registrar pago manual de reservas Espot + conciliación; "balance por reserva" reutilizable; unificar definición de "Por pagar"; audit log transversal admin; unificar gestión Pro. *(Azul NO integrado → el pago manual es el camino real del dinero; el plan no depende de Azul.)*
- **F3 — CRM líder:** recordatorios + "próxima acción"; plantillas WhatsApp editables; embudo/pipeline unificado; notas/timeline por reserva; cotización+contrato canal directo.
- **F4 — Pulido sistémico:** `StatusBadge` global + tokenizar admin; `ConfirmDialog` (21 `window.confirm`); `PageHeader` + `DataTable`; migrar AdminSidebar a AppSidebar; consolidar pantallas financieras.
</content>
