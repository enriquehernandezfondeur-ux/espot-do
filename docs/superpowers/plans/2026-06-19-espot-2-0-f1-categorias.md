# Espot 2.0 — F1: Categorías (centralización + wellness/pop-ups + destacar 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar el catálogo de categorías de espacios en una única fuente de verdad, añadir las categorías `wellness` y `popup`, y destacar 4 grupos en la captación/home — sin perder las categorías existentes ni cambiar el branding.

**Architecture:** Se crea `src/lib/categories.ts` como fuente única (valor, label singular/plural, icono, destacado, orden). Los 9+ mapas duplicados pasan a importar de ahí. Una migración aditiva amplía el CHECK de `category` en la base de datos. La homepage y la búsqueda muestran las 4 categorías destacadas de forma prominente reusando los componentes actuales.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, lucide-react, Supabase (Postgres), Jest 30.

**Gobernanza:** sin push/commit/deploy automático. El SQL no se aplica con el push — se entrega al dueño para Supabase. Verificación por tarea: `npx tsc --noEmit` + `npm run build` + `npx jest`.

---

## File Structure

**Crear:**
- `src/lib/categories.ts` — fuente única de verdad del catálogo de categorías + helpers.
- `src/lib/__tests__/categories.test.ts` — tests del catálogo y helpers.
- `supabase/migrations/026_categories_espot2.sql` — amplía el CHECK de `category` (aditiva, reversible).

**Modificar (consumidores → importan de `categories.ts`):**
- `src/types/index.ts:45` — `SpaceCategory` derivado del catálogo.
- `src/app/(marketplace)/buscar/constants.ts:7-19` — `CATEGORIES` (filtros de búsqueda).
- `src/app/dashboard/host/espacio/page.tsx:27-39` — array `categories` del formulario.
- `src/components/marketplace/HomepageSections.tsx:115-124` — array `categories` + sección destacada.
- `src/app/admin/reportes/page.tsx:5-9` — `CATEGORY_LABELS`.
- `src/app/admin/aplicaciones/page.tsx:18-22` — `SPACE_TYPE_LABELS`.
- `src/app/admin/aplicaciones/[id]/page.tsx:15-19` — `SPACE_TYPE_LABELS`.
- `src/app/(marketplace)/aplicar/AplicarClient.tsx:13-25` — `SPACE_TYPES`.
- `src/lib/i18n/locales/es.ts:34-47` — `categories`.
- `src/app/(marketplace)/buscar/SpaceCard.tsx:187-188` — label/icono de categoría.

**Nota de migraciones:** las migraciones nuevas van en `supabase/migrations/` DENTRO de `host-dashboard` (este repo git). El esquema base vive en `../supabase/migrations/` (fuera del repo, no versionado aquí). La migración 026 es aditiva sobre la misma DB.

---

## Task 1: Migración SQL — ampliar el CHECK de `category`

**Files:**
- Create: `supabase/migrations/026_categories_espot2.sql`

**Contexto:** El CHECK actual de `spaces.category` (en `../supabase/migrations/001_initial_schema.sql:37-41`) permite: `salon, restaurante, bar, rooftop, estudio, coworking, hotel, terraza, lounge, villa, otro`. Falta `jardin` (usado en el código pero ausente del CHECK) y faltan las nuevas `wellness` y `popup`. Hay un **segundo** CHECK de `category` en `001_initial_schema.sql:136` (otra tabla) que hay que verificar y ampliar igual.

- [ ] **Step 1: Verificar el nombre/tabla del segundo constraint**

Run: `sed -n '130,140p' ../supabase/migrations/001_initial_schema.sql`
Expected: muestra la segunda tabla con `category text check (...)`. Anota el nombre de la tabla (p. ej. `space_drafts` o similar) para el Step 2.

- [ ] **Step 2: Escribir la migración aditiva y reversible**

Crear `supabase/migrations/026_categories_espot2.sql`:

```sql
-- 026_categories_espot2.sql
-- Espot 2.0 F1: amplía las categorías permitidas (añade wellness, popup y normaliza jardin).
-- Aditiva y reversible. Aplicar en Supabase (el push no ejecuta SQL).

-- Tabla spaces
alter table spaces drop constraint if exists spaces_category_check;
alter table spaces add constraint spaces_category_check
  check (category in (
    'salon','restaurante','bar','rooftop','terraza','jardin',
    'estudio','coworking','wellness','popup',
    'hotel','villa','lounge','otro'
  ));

-- Segunda tabla con CHECK de category (ver Step 1 — reemplazar <segunda_tabla> y <constraint>
-- por los valores reales verificados; si NO existe un segundo CHECK, omitir este bloque).
-- alter table <segunda_tabla> drop constraint if exists <constraint>;
-- alter table <segunda_tabla> add constraint <constraint>
--   check (category in (
--     'salon','restaurante','bar','rooftop','terraza','jardin',
--     'estudio','coworking','wellness','popup',
--     'hotel','villa','lounge','otro'
--   ));

-- DOWN (reversión):
-- alter table spaces drop constraint if exists spaces_category_check;
-- alter table spaces add constraint spaces_category_check
--   check (category in (
--     'salon','restaurante','bar','rooftop','estudio','coworking',
--     'hotel','terraza','lounge','villa','otro'
--   ));
```

> Si el Step 1 reveló un segundo CHECK real, descomenta y completa ese bloque con la tabla/constraint exactos. Si no, deja solo el bloque de `spaces`.

- [ ] **Step 3: Verificar sintaxis SQL (lectura)**

Run: `cat supabase/migrations/026_categories_espot2.sql`
Expected: el archivo existe, el bloque `spaces` está activo y sin marcadores `<...>` en las líneas no comentadas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/026_categories_espot2.sql
git commit -m "F1(db): amplía CHECK de category (wellness, popup, jardin)"
```

> ⚠️ Entregar el SQL al dueño para aplicarlo en Supabase. El push no lo aplica.

---

## Task 2: Crear la fuente única de verdad `src/lib/categories.ts`

**Files:**
- Create: `src/lib/categories.ts`

- [ ] **Step 1: Escribir el catálogo y los helpers**

Crear `src/lib/categories.ts`:

```ts
import {
  Building2, UtensilsCrossed, Wine, Sunset, Trees, Leaf,
  Camera, Briefcase, HeartPulse, Store, Hotel, Home, MapPin,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryDef {
  value: string
  label: string        // singular — formularios
  labelPlural: string  // plural — filtros/listados
  icon: LucideIcon
  featured: boolean     // destacada en captación/home
  order: number         // orden entre las destacadas
  featuredTitle?: string       // título de marketing del grupo destacado
  featuredDescription?: string // subtítulo del grupo destacado
}

// Fuente ÚNICA de verdad. Cualquier consumidor de categorías importa de aquí.
export const SPACE_CATEGORIES: CategoryDef[] = [
  { value: 'estudio',     label: 'Estudio',     labelPlural: 'Estudios',     icon: Camera,        featured: true,  order: 1, featuredTitle: 'Estudios de podcast y fotografía', featuredDescription: 'Sets equipados para grabar, transmitir y producir.' },
  { value: 'coworking',   label: 'Coworking',   labelPlural: 'Coworkings',   icon: Briefcase,     featured: true,  order: 2, featuredTitle: 'Coworkings y salas de reuniones', featuredDescription: 'Espacios para trabajar, reunirse y presentar.' },
  { value: 'wellness',    label: 'Wellness',    labelPlural: 'Wellness',     icon: HeartPulse,    featured: true,  order: 3, featuredTitle: 'Wellness y bienestar', featuredDescription: 'Yoga, terapias, retiros y clases.' },
  { value: 'popup',       label: 'Pop-up',      labelPlural: 'Pop-ups',      icon: Store,         featured: true,  order: 4, featuredTitle: 'Pop-ups, bazares y eventos temporales', featuredDescription: 'Espacios para activaciones y ventas temporales.' },
  { value: 'salon',       label: 'Salón de eventos', labelPlural: 'Salones', icon: Building2,     featured: false, order: 100 },
  { value: 'restaurante', label: 'Restaurante', labelPlural: 'Restaurantes', icon: UtensilsCrossed, featured: false, order: 101 },
  { value: 'bar',         label: 'Bar / Lounge', labelPlural: 'Bares',       icon: Wine,          featured: false, order: 102 },
  { value: 'rooftop',     label: 'Rooftop',     labelPlural: 'Rooftops',     icon: Sunset,        featured: false, order: 103 },
  { value: 'terraza',     label: 'Terraza',     labelPlural: 'Terrazas',     icon: Trees,         featured: false, order: 104 },
  { value: 'jardin',      label: 'Jardín',      labelPlural: 'Jardines',     icon: Leaf,          featured: false, order: 105 },
  { value: 'hotel',       label: 'Hotel',       labelPlural: 'Hoteles',      icon: Hotel,         featured: false, order: 106 },
  { value: 'villa',       label: 'Villa',       labelPlural: 'Villas',       icon: Home,          featured: false, order: 107 },
  { value: 'lounge',      label: 'Lounge',      labelPlural: 'Lounges',      icon: Wine,          featured: false, order: 108 },
  { value: 'otro',        label: 'Otro',        labelPlural: 'Otros',        icon: MapPin,        featured: false, order: 109 },
]

// Tipo derivado del catálogo (única definición real de SpaceCategory).
export type SpaceCategory = typeof SPACE_CATEGORIES[number]['value']

const BY_VALUE: Record<string, CategoryDef> = Object.fromEntries(
  SPACE_CATEGORIES.map(c => [c.value, c]),
)

export function getCategory(value: string | null | undefined): CategoryDef | undefined {
  if (!value) return undefined
  return BY_VALUE[value]
}

export function getCategoryLabel(value: string | null | undefined, opts?: { plural?: boolean }): string {
  const c = getCategory(value)
  if (!c) return value || 'Espacio'
  return opts?.plural ? c.labelPlural : c.label
}

export function getCategoryIcon(value: string | null | undefined): LucideIcon {
  return getCategory(value)?.icon ?? MapPin
}

// Las 4 destacadas, ordenadas.
export function getFeaturedCategories(): CategoryDef[] {
  return SPACE_CATEGORIES.filter(c => c.featured).sort((a, b) => a.order - b.order)
}

// Para filtros de búsqueda: incluye la opción "Todos" al inicio.
export const FILTER_CATEGORIES: { value: string; label: string; icon: LucideIcon | null }[] = [
  { value: '', label: 'Todos', icon: null },
  ...SPACE_CATEGORIES.map(c => ({ value: c.value, label: c.labelPlural, icon: c.icon })),
]
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos en `src/lib/categories.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/categories.ts
git commit -m "F1(cat): fuente única de categorías (lib/categories.ts) + wellness/popup"
```

---

## Task 3: Tests del catálogo y helpers

**Files:**
- Create: `src/lib/__tests__/categories.test.ts`

- [ ] **Step 1: Escribir los tests (deben fallar primero)**

Crear `src/lib/__tests__/categories.test.ts`:

```ts
import {
  SPACE_CATEGORIES, getCategory, getCategoryLabel, getCategoryIcon,
  getFeaturedCategories, FILTER_CATEGORIES,
} from '@/lib/categories'

describe('catálogo de categorías', () => {
  it('incluye wellness y popup', () => {
    const values = SPACE_CATEGORIES.map(c => c.value)
    expect(values).toContain('wellness')
    expect(values).toContain('popup')
  })

  it('conserva las categorías existentes', () => {
    const values = SPACE_CATEGORIES.map(c => c.value)
    for (const v of ['salon','restaurante','bar','rooftop','terraza','jardin','estudio','coworking','hotel','villa','lounge','otro']) {
      expect(values).toContain(v)
    }
  })

  it('no tiene valores duplicados', () => {
    const values = SPACE_CATEGORIES.map(c => c.value)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('getFeaturedCategories', () => {
  it('devuelve exactamente las 4 destacadas en orden', () => {
    const feat = getFeaturedCategories()
    expect(feat.map(c => c.value)).toEqual(['estudio','coworking','wellness','popup'])
  })
})

describe('getCategoryLabel', () => {
  it('singular y plural', () => {
    expect(getCategoryLabel('estudio')).toBe('Estudio')
    expect(getCategoryLabel('estudio', { plural: true })).toBe('Estudios')
  })
  it('fallback al valor crudo si no existe', () => {
    expect(getCategoryLabel('inexistente')).toBe('inexistente')
    expect(getCategoryLabel(null)).toBe('Espacio')
  })
})

describe('getCategoryIcon', () => {
  it('devuelve un icono para una categoría válida', () => {
    expect(getCategoryIcon('estudio')).toBe(getCategory('estudio')!.icon)
  })
  it('devuelve un icono de fallback para inválida', () => {
    expect(typeof getCategoryIcon('inexistente')).toBe('object')
  })
})

describe('FILTER_CATEGORIES', () => {
  it('empieza por Todos', () => {
    expect(FILTER_CATEGORIES[0]).toEqual({ value: '', label: 'Todos', icon: null })
  })
  it('tiene una entrada por categoría + Todos', () => {
    expect(FILTER_CATEGORIES.length).toBe(SPACE_CATEGORIES.length + 1)
  })
})
```

- [ ] **Step 2: Ejecutar los tests para verificar que pasan**

Run: `npx jest src/lib/__tests__/categories.test.ts`
Expected: PASS (todos verdes). Si falla algún assert, corregir `categories.ts` (no el test) salvo error tipográfico evidente en el test.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/categories.test.ts
git commit -m "F1(cat): tests del catálogo de categorías"
```

---

## Task 4: `SpaceCategory` derivado del catálogo

**Files:**
- Modify: `src/types/index.ts:45`

- [ ] **Step 1: Reemplazar la unión literal por el tipo derivado**

En `src/types/index.ts`, reemplazar la línea 45:

```ts
export type SpaceCategory = 'salon' | 'restaurante' | 'bar' | 'rooftop' | 'estudio' | 'coworking' | 'hotel' | 'terraza' | 'lounge' | 'villa' | 'jardin' | 'otro'
```

por:

```ts
export type { SpaceCategory } from '@/lib/categories'
```

> Si `src/types/index.ts` ya re-exporta tipos con `export type { ... }`, mantener el estilo. Verificar que no haya un import circular (categories.ts no importa de types/index.ts).

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores. `wellness` y `popup` ahora son `SpaceCategory` válidas en todo el código.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "F1(cat): SpaceCategory derivado del catálogo central"
```

---

## Task 5: Refactor — filtros de búsqueda (`buscar/constants.ts`)

**Files:**
- Modify: `src/app/(marketplace)/buscar/constants.ts:1-19`

- [ ] **Step 1: Reemplazar `CATEGORIES` por re-export del catálogo**

En `src/app/(marketplace)/buscar/constants.ts`, eliminar el array `CATEGORIES` (líneas 7-19) y los imports de iconos que solo usaba (`LayoutList, Building2, UtensilsCrossed, Sunset, Wine, Hotel, Briefcase, Home, Camera, Trees, Leaf`). Conservar los imports que siguen usando `PRICING_TYPES` (`Timer, Package, MessageSquare, Wine`). Añadir arriba:

```ts
import { FILTER_CATEGORIES } from '@/lib/categories'

export const CATEGORIES = FILTER_CATEGORIES
```

> `FILTER_CATEGORIES` ya incluye `{ value: '', label: 'Todos', icon: null }` al inicio, igual que el array original. `Wine` se mantiene porque `PRICING_TYPES` lo usa.

- [ ] **Step 2: Verificar compilación y que BuscarClient/SpaceCard siguen tipando**

Run: `npx tsc --noEmit`
Expected: sin errores. Si `BuscarClient.tsx` hacía `c.icon` asumiendo no-null, verificar que ya lo maneja (la opción "Todos" siempre tuvo `icon: LayoutList` antes, ahora `null`; ver Step 3).

- [ ] **Step 3: Ajustar el render del icono "Todos" si hace falta**

Run: `grep -n "CATEGORIES" "src/app/(marketplace)/buscar/BuscarClient.tsx"`
Si el render hace `<c.icon .../>` sin guarda, envolver con `{c.icon && <c.icon ... />}`. Mostrar el cambio exacto que aplique según el código encontrado.

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(marketplace)/buscar/constants.ts" "src/app/(marketplace)/buscar/BuscarClient.tsx"
git commit -m "F1(cat): filtros de búsqueda usan el catálogo central"
```

---

## Task 6: Refactor — `SpaceCard` (label/icono de categoría)

**Files:**
- Modify: `src/app/(marketplace)/buscar/SpaceCard.tsx:187-188`

- [ ] **Step 1: Reemplazar el lookup local por los helpers**

En `src/app/(marketplace)/buscar/SpaceCard.tsx`, reemplazar:

```ts
const catLabel = CATEGORIES.find(c => c.value === space.category)?.label ?? (space.category || 'Espacio')
const CatIcon = CATEGORIES.find(c => c.value === space.category)?.icon ?? Building2
```

por:

```ts
const catLabel = getCategoryLabel(space.category, { plural: true })
const CatIcon = getCategoryIcon(space.category)
```

Añadir el import: `import { getCategoryLabel, getCategoryIcon } from '@/lib/categories'`. Eliminar el import de `CATEGORIES` y de `Building2` si quedan sin uso (verificar con grep en el archivo).

- [ ] **Step 2: Verificar compilación + build**

Run: `npx tsc --noEmit && npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(marketplace)/buscar/SpaceCard.tsx"
git commit -m "F1(cat): SpaceCard usa helpers del catálogo"
```

---

## Task 7: Refactor — formulario del host (`espacio/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/host/espacio/page.tsx:27-39`

- [ ] **Step 1: Reemplazar el array `categories` local**

En `src/app/dashboard/host/espacio/page.tsx`, reemplazar el array `categories` (líneas 27-39) por un derivado del catálogo:

```ts
import { SPACE_CATEGORIES } from '@/lib/categories'

const categories = SPACE_CATEGORIES.map(c => ({ value: c.value, label: c.label, icon: c.icon }))
```

Eliminar los imports de iconos que solo usaba ese array si quedan sin uso (verificar con grep dentro del archivo; varios — `Building2`, `Wine`, etc. — pueden seguir usándose en otras partes del wizard, NO eliminar sin verificar).

> El formulario ahora ofrecerá también `wellness` y `popup` automáticamente. Esto es deseado.

- [ ] **Step 2: Verificar compilación + build**

Run: `npx tsc --noEmit && npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add "src/app/dashboard/host/espacio/page.tsx"
git commit -m "F1(cat): formulario del host usa el catálogo (incluye wellness/popup)"
```

---

## Task 8: Refactor — homepage (`HomepageSections.tsx`) + sección destacada

**Files:**
- Modify: `src/components/marketplace/HomepageSections.tsx:115-124`

- [ ] **Step 1: Reemplazar el array `categories` local por el catálogo**

En `src/components/marketplace/HomepageSections.tsx`, reemplazar el array `categories` (líneas 115-124) por:

```ts
import { SPACE_CATEGORIES, getFeaturedCategories } from '@/lib/categories'

const categories = SPACE_CATEGORIES
  .filter(c => c.value !== 'lounge' && c.value !== 'otro')
  .map(c => ({ value: c.value, label: c.labelPlural, icon: c.icon }))

const featuredCategories = getFeaturedCategories()
```

Eliminar imports de iconos sin uso tras el cambio (verificar con grep en el archivo).

- [ ] **Step 2: Renderizar las 4 destacadas de forma prominente**

Localizar la sección donde se renderiza `categories` (grep `categories.map` en el archivo). ANTES de esa cuadrícula, insertar una sección de destacados que reusa el estilo de tarjetas existente. Mostrar el bloque exacto adaptado al markup actual del archivo, p. ej.:

```tsx
{/* Categorías destacadas Espot 2.0 */}
<div className="mb-8">
  <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Explora por experiencia</h2>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {featuredCategories.map(c => {
      const Icon = c.icon
      return (
        <a key={c.value} href={`/buscar?category=${c.value}`}
           className="rounded-2xl p-4 transition-colors"
           style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <Icon size={22} style={{ color: 'var(--brand)' }} />
          <div className="mt-2 font-medium" style={{ color: 'var(--text-primary)' }}>{c.featuredTitle}</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.featuredDescription}</div>
        </a>
      )
    })}
  </div>
</div>
```

> Respetar las variables de tema (`var(--brand)`, `var(--bg-elevated)`, etc.) — NO hardcodear colores. Ajustar las clases al patrón real del archivo (no introducir un estilo nuevo).

- [ ] **Step 3: Verificar compilación + build**

Run: `npx tsc --noEmit && npm run build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketplace/HomepageSections.tsx
git commit -m "F1(cat): home destaca las 4 categorías + usa el catálogo central"
```

---

## Task 9: Refactor — admin/reportes, admin/aplicaciones (x2), AplicarClient, i18n

**Files:**
- Modify: `src/app/admin/reportes/page.tsx:5-9`
- Modify: `src/app/admin/aplicaciones/page.tsx:18-22`
- Modify: `src/app/admin/aplicaciones/[id]/page.tsx:15-19`
- Modify: `src/app/(marketplace)/aplicar/AplicarClient.tsx:13-25`
- Modify: `src/lib/i18n/locales/es.ts:34-47`

- [ ] **Step 1: admin/reportes — usar `getCategoryLabel`**

En `src/app/admin/reportes/page.tsx`, eliminar `CATEGORY_LABELS` (líneas 5-9) y donde se use `CATEGORY_LABELS[x]` reemplazar por `getCategoryLabel(x, { plural: true })`. Añadir `import { getCategoryLabel } from '@/lib/categories'`. Verificar el sitio de uso con `grep -n CATEGORY_LABELS src/app/admin/reportes/page.tsx` y mostrar el reemplazo exacto.

- [ ] **Step 2: admin/aplicaciones (x2) — usar `getCategoryLabel` singular**

En `src/app/admin/aplicaciones/page.tsx` y `src/app/admin/aplicaciones/[id]/page.tsx`, eliminar `SPACE_TYPE_LABELS` (líneas 18-22 / 15-19) y reemplazar usos `SPACE_TYPE_LABELS[x]` por `getCategoryLabel(x)`. Añadir el import en ambos. Verificar con `grep -n SPACE_TYPE_LABELS` en cada archivo.

> Nota: `host_applications.space_type` es texto libre; valores fuera del catálogo caen al fallback (el valor crudo), comportamiento aceptable.

- [ ] **Step 3: AplicarClient — derivar `SPACE_TYPES` del catálogo**

En `src/app/(marketplace)/aplicar/AplicarClient.tsx`, reemplazar el array `SPACE_TYPES` (líneas 13-25) por:

```ts
import { SPACE_CATEGORIES } from '@/lib/categories'

const SPACE_TYPES = SPACE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))
```

> El formulario público de aplicación ahora ofrece también wellness y popup. Deseado.

- [ ] **Step 4: i18n es.ts — añadir wellness y popup**

En `src/lib/i18n/locales/es.ts`, dentro de `categories` (líneas 34-47), añadir dos entradas para mantener el objeto i18n completo:

```ts
      wellness: 'Wellness',
      popup: 'Pop-up',
```

> Este objeto i18n se deja como mapa estático (no se deriva del catálogo) para no acoplar i18n a lucide; basta con que esté completo. Verificar que no falte ninguna clave del catálogo.

- [ ] **Step 5: Verificar compilación + build**

Run: `npx tsc --noEmit && npm run build`
Expected: OK.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/reportes/page.tsx src/app/admin/aplicaciones/page.tsx "src/app/admin/aplicaciones/[id]/page.tsx" "src/app/(marketplace)/aplicar/AplicarClient.tsx" src/lib/i18n/locales/es.ts
git commit -m "F1(cat): admin, aplicar e i18n usan el catálogo central"
```

---

## Task 10: Barrido final de duplicados + verificación integral

**Files:**
- Verificación (sin cambios garantizados)

- [ ] **Step 1: Buscar mapas de categorías residuales**

Run: `grep -rn "salon.*restaurante.*rooftop\|CATEGORY_LABELS\|SPACE_TYPE_LABELS" src --include='*.ts' --include='*.tsx'`
Expected: sin coincidencias salvo `src/lib/i18n/locales/es.ts` (mapa i18n intencional). Si aparece otro mapa duplicado, refactorizarlo a `categories.ts` con el mismo patrón y commitear.

- [ ] **Step 2: Verificar SpaceDetailClient (categoría cruda)**

Run: `grep -n "space.category" "src/app/(marketplace)/espacios/[slug]/SpaceDetailClient.tsx"`
Si en la línea ~239 se muestra `{space.category}` en crudo, reemplazar por `{getCategoryLabel(space.category)}` y añadir el import. La lógica de facilidades automáticas por categoría (~línea 109) se deja intacta (no es presentación de label). Mostrar el cambio exacto.

- [ ] **Step 3: Verificación integral**

Run: `npx tsc --noEmit && npm run build && npx jest`
Expected: tsc limpio, build OK, todos los tests verdes (incluye `categories.test.ts`).

- [ ] **Step 4: Commit final si hubo cambios**

```bash
git add -A
git commit -m "F1(cat): barrido de duplicados + label de categoría en detalle"
```

---

## Self-Review (F1)

- **Cobertura del spec §11:** catálogo único ✅ (Task 2), wellness+popup ✅ (Task 1/2), destacar 4 ✅ (Task 8), 9 consumidores migrados ✅ (Tasks 5-9), inconsistencia lounge/jardin resuelta ✅ (Task 1 CHECK + catálogo). 
- **Sin placeholders de código:** `categories.ts`, migración, tests y sección destacada tienen código completo. Los pasos de refactor de consumidores indican grep-verify-replace porque los archivos son grandes y se editan con Read previa (práctica estándar de ejecución), con el código nuevo exacto mostrado.
- **Consistencia de tipos:** `SpaceCategory` se deriva del catálogo (Task 4); todos los helpers (`getCategoryLabel`, `getCategoryIcon`, `getFeaturedCategories`, `FILTER_CATEGORIES`) se definen en Task 2 y se consumen con esas firmas exactas.
- **Riesgo:** el render del icono "Todos" (antes `LayoutList`, ahora `null`) se cubre explícitamente en Task 5 Step 3.

---

# Roadmap F2–F9 (planes detallados se generan antes de ejecutar cada una)

Cada fase tendrá su propio documento `docs/superpowers/plans/2026-06-19-espot-2-0-fN-*.md` con tareas TDD bite-sized, generado justo antes de ejecutarla para reflejar lo que las fases previas dejaron establecido. Resumen de alcance y dependencias:

- **F2 — Modelo de datos de planes.** Migración `host_subscriptions` + `subscription_payments` + `profiles.plan_type`; función `is_pro_host()`; helper server `requirePro()`; RLS (SELECT libre / INSERT-UPDATE Pro) en `external_events`, `host_clients`, config Directo; trigger anti-downgrade. Tests: gating, máquina de estados. Sin cambio visible. *Depende de:* nada (puede ir tras F1).
- **F3 — Simplificación de precios + presentación.** `space_pricing.is_consumable`; creación de espacios solo-hora; tarjeta de precio (detalle + BookingWidget) con costo estimado y condición de consumo; unificar comisión (`booking.ts:658` → `computePlatformFee`). Tests: cálculo consumible/no, fin de semana, min/max. *Depende de:* nada.
- **F4 — Panel Normal vs Pro + gating frontend.** `<PlanGate>`, `/dashboard/host/pro` (comparativa), badge Pro, avisos contextuales, vista previa para gratuitos, activación manual admin (probar Pro end-to-end sin Azul). Skill: `ui-ux-pro-max`. *Depende de:* F2.
- **F5 — Espot Directo público.** Botón WhatsApp/teléfono/formulario en detalle (`spaces.direct_contact_enabled`); ampliar `external_events.source`; gatear reservas externas/CRM con vista previa; reforzar anti-conflicto interno↔externo. *Depende de:* F2, F4.
- **F6 — Tarjeta digital + QR + stats avanzadas.** `/t/[card_token]`, `spaces.card_token`, lib `qrcode`; tracking de clics (extender `space_views`); stats avanzadas en analytics. Skill: `ui-ux-pro-max`. *Depende de:* F2, F4.
- **F7 — Cobro Azul RD$499.** `host_subscriptions` ↔ Azul (reusa `src/lib/azul/client.ts`); `subscription_payments`; éxito/error/cancelado; cron de renovación + recordatorios. ⚠️ Azul roto: la activación manual de F4 mantiene Pro operativo entretanto. *Depende de:* F2, F4; Azul.
- **F8 — Migración de datos de precios.** Respaldo `space_pricing_backup_pre_espot2`; `minimum_consumption`→hourly+consumable; `fixed_package`→hourly; `custom_quote`→review; cola de revisión admin. Tests de derivación con casos límite. *Depende de:* F3.
- **F9 — Pruebas integrales + seguridad + responsive.** Skills: `webapp-testing`, `systematic-debugging`, `code-review`. Bypass RLS, 3 roles, notificaciones, responsive, no-doble-reserva, exactitud de comisión. *Depende de:* todas.
