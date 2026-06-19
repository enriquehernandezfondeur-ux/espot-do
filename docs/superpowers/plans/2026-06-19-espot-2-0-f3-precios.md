# Espot 2.0 — F3: Simplificación de precios (por hora + consumible) + presentación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o superpowers:executing-plans.

**Goal:** Hacer "por hora" el modelo principal de espacios nuevos, con un interruptor `es_consumible` (todo el monto = crédito de consumo) puramente presentacional, y mostrar el precio con claridad — sin romper los espacios existentes ni alterar el cálculo de dinero.

**Architecture:** `is_consumable` es una columna nueva en `space_pricing` que NO cambia `computeBasePrice` (el cálculo es idéntico). El wizard del host ofrece solo `hourly` para espacios nuevos y conserva el editor del modelo legacy al editar un espacio que ya lo usa. La presentación (detalle + BookingWidget) muestra la condición de consumo y el costo estimado.

**Tech Stack:** Next.js 16, React 19, TS, Supabase, Jest.

**Fuera de alcance (hallazgo registrado, NO se toca):** la comisión se calcula como 10% del `total_amount` en `confirm/route.ts:93` y `booking.ts` (consistente entre flujos), mientras el `platform_fee` al crear la reserva es 10% del subtotal. Es comportamiento de negocio existente; cambiarlo altera payouts → decisión separada del dueño.

---

## File Structure

**Crear:**
- `supabase/migrations/028_pricing_consumable.sql` — `space_pricing.is_consumable boolean default false`.

**Modificar:**
- `src/lib/pricing.ts` — helper puro `consumptionLabel()` (única fuente del copy de consumo) + `PricingInput.is_consumable`.
- `src/lib/__tests__/pricing.test.ts` — tests del helper + confirmar que el cálculo NO cambia con is_consumable.
- `src/lib/actions/space.ts` — `SaveSpacePayload.isConsumable` + persistir en `buildPricingData` (rama hourly) + leer al cargar.
- `src/app/dashboard/host/espacio/page.tsx` — estado `isConsumable`, default hourly para nuevos, `visiblePricingOptions`, toggle consumible, carga y guardado.
- `src/app/(marketplace)/espacios/[slug]/SpaceDetailClient.tsx` — tarjeta de precio: condición de consumo + costo estimado.
- `src/components/marketplace/BookingWidget.tsx` — línea de condición de consumo.

---

## Task 1: Migración `is_consumable`

- [ ] Create `supabase/migrations/028_pricing_consumable.sql`:

```sql
-- 028_pricing_consumable.sql · Espot 2.0 (F3)
-- Interruptor de presentación: si true, todo el monto pagado por horas es
-- crédito de consumo (alimentos/bebidas). NO cambia el cálculo del precio.
alter table space_pricing
  add column if not exists is_consumable boolean not null default false;
```

- [ ] Commit: `F3(db): space_pricing.is_consumable`.

---

## Task 2: `pricing.ts` — helper de presentación (sin tocar el cálculo)

- [ ] Add to `src/lib/pricing.ts`: en `PricingInput` añadir `is_consumable?: boolean | null`. Añadir al final:

```ts
/**
 * Texto de la condición de consumo para mostrar al cliente.
 * NO afecta el cálculo — el precio es el mismo, sólo cambia la explicación.
 */
export function consumptionLabel(isConsumable?: boolean | null): string {
  return isConsumable
    ? 'Todo el monto se aplica en alimentos y bebidas'
    : 'Cubre el uso del espacio'
}
```

- [ ] Add tests to `src/lib/__tests__/pricing.test.ts`:

```ts
import { consumptionLabel } from '@/lib/pricing'

describe('consumptionLabel', () => {
  it('consumible', () => {
    expect(consumptionLabel(true)).toBe('Todo el monto se aplica en alimentos y bebidas')
  })
  it('no consumible', () => {
    expect(consumptionLabel(false)).toBe('Cubre el uso del espacio')
    expect(consumptionLabel(null)).toBe('Cubre el uso del espacio')
    expect(consumptionLabel(undefined)).toBe('Cubre el uso del espacio')
  })
})

describe('is_consumable no cambia el cálculo', () => {
  it('mismo precio con o sin consumible', () => {
    const a = computeBasePrice({ pricing_type: 'hourly', hourly_price: 1000, is_consumable: true }, 3, '2026-05-25')
    const b = computeBasePrice({ pricing_type: 'hourly', hourly_price: 1000, is_consumable: false }, 3, '2026-05-25')
    expect(a).toBe(b)
    expect(a).toBe(3000)
  })
})
```

- [ ] Run `npx jest src/lib/__tests__/pricing.test.ts` → PASS. Commit.

---

## Task 3: `space.ts` — persistir is_consumable (rama hourly)

- [ ] En `SaveSpacePayload` añadir `isConsumable: boolean`.
- [ ] En `buildPricingData`, rama `hourly`, añadir `is_consumable: p.isConsumable`. (Las demás ramas quedan en el default false del schema.)
- [ ] Donde se carga el espacio para editar (la query que trae `space_pricing`), asegurarse de leer `is_consumable`.
- [ ] `npx tsc --noEmit` → OK. Commit.

---

## Task 4: Wizard del host — hourly por defecto + toggle consumible

**File:** `src/app/dashboard/host/espacio/page.tsx`

- [ ] Estado: `const [isConsumable, setIsConsumable] = useState(false)`.
- [ ] Default hourly para nuevos: `useState<PricingType | ''>('hourly')` y en la función de reset `setPricingType('hourly')`.
- [ ] `visiblePricingOptions`: solo hourly para nuevos; hourly + el modelo actual al editar legacy:

```ts
const visiblePricingOptions = pricingOptions.filter(o =>
  o.value === 'hourly' || o.value === pricingType
)
```
y en el render (línea ~1172) mapear `visiblePricingOptions` en vez de `pricingOptions`.

- [ ] Toggle consumible dentro del bloque `pricingType === 'hourly'` (tras el hint de "El cliente pagaría mínimo…", ~línea 1233), reusando el patrón del toggle de fin de semana (líneas 1340-1360) con variables de tema.
- [ ] Cargar: junto a `setPricingType(p.pricing_type ?? '')` (~404) añadir `setIsConsumable(p.is_consumable ?? false)`.
- [ ] Guardar: en el objeto payload (~286) añadir `isConsumable`.
- [ ] `npx tsc --noEmit && npm run build` → OK. Commit.

---

## Task 5: Presentación del precio (detalle + widget)

- [ ] `SpaceDetailClient.tsx`: en la tarjeta de precio, mostrar `consumptionLabel(space.pricing?.is_consumable)` y el costo estimado según horas (ya existe el desglose). Importar `consumptionLabel`.
- [ ] `BookingWidget.tsx`: añadir una línea con `consumptionLabel(pricing?.is_consumable)` cerca del desglose de precio. Importar `consumptionLabel`.
- [ ] `npx tsc --noEmit && npm run build` → OK. Commit.

---

## Task 6: Verificación integral

- [ ] `npx tsc --noEmit && npm run build && npx jest` → todo verde.
- [ ] Confirmar que `computeBasePrice` no cambió de firma de cálculo (los tests previos siguen verdes).

---

## Self-Review (F3)

- **Spec §3/§5:** hourly principal para nuevos ✅, `is_consumable` ✅, presentación ✅, legacy preservado ✅.
- **Dinero:** `computeBasePrice` intacto; `is_consumable` no entra al cálculo (test lo prueba). Comisión NO tocada (hallazgo registrado).
- **No-romper:** espacios legacy siguen editables (visiblePricingOptions incluye su modelo).
