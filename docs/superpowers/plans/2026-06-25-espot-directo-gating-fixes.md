# Cierre de huecos de gating — Espot Directo · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los 2 huecos de gating de Espot Directo detectados en la auditoría: (#1) `external_event_payments` sin RLS `is_pro_host()` ni migración versionada; (#2) `agenda` sin candado visual para host Normal.

**Architecture:** Defensa en profundidad. #1 añade la capa RLS de respaldo (la server action ya gatea) mediante una migración idempotente calcada al patrón de `029_espot_directo_gating.sql`, y de paso versiona el DDL real de la tabla. #2 es un cambio de UI mínimo que replica el patrón `isPro === false` ya usado en `eventos`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase Postgres + RLS, React 19, Jest. Migraciones SQL en `supabase/migrations/` (se aplican a mano en Supabase; el push a Vercel NO aplica SQL).

**Gobernanza:** NO push/deploy automático. Los commits locales en la rama son OK; el dueño decide cuándo aplicar el SQL en Supabase y cuándo hacer push.

---

## Referencia del enfoque (leer antes de empezar)

- Spec: `docs/superpowers/specs/2026-06-25-espot-directo-gating-audit-design.md`
- Patrón de RLS a calcar: `supabase/migrations/029_espot_directo_gating.sql`
- Función SQL de gating ya existente: `is_pro_host(uid uuid default auth.uid())` (de `035_espot_pro_module.sql`). Devuelve `true` si el host tiene suscripción viva Pro.
- Server actions ya gated (no se tocan): `addEventPayment`/`deleteEventPayment` en `src/lib/actions/external-events.ts` usan `requirePro()`.

---

## Task 1: Verificar el estado real de RLS de `external_event_payments` en prod (verify-then-fix)

No se puede escribir la migración sin saber qué hay hoy. Esta tarea produce el insumo
para la Task 2. La corre el dueño en el SQL Editor de Supabase (proyecto Espot).

**Files:**
- Create: `supabase/VERIF_external_event_payments_2026-06-25.sql` (query de solo lectura)

- [ ] **Step 1: Escribir el script de verificación**

Create `supabase/VERIF_external_event_payments_2026-06-25.sql`:

```sql
-- Solo lectura. Estado de external_event_payments para diseñar el RLS de Directo.
-- 1) ¿RLS habilitado?
select 'rls' as bloque, relname as tabla,
       case when relrowsecurity then 'RLS ON' else '⛔ RLS OFF' end as estado
from pg_class where relname = 'external_event_payments';

-- 2) Políticas actuales (nombre, comando, expresiones)
select 'policy' as bloque, policyname, cmd,
       qual as using_expr, with_check as check_expr
from pg_policies
where schemaname = 'public' and tablename = 'external_event_payments'
order by cmd, policyname;

-- 3) Columnas reales (para versionar el DDL idéntico a prod)
select 'column' as bloque, ordinal_position, column_name, data_type,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'external_event_payments'
order by ordinal_position;

-- 4) FKs / índices / constraints
select 'constraint' as bloque, conname,
       case contype when 'p' then 'PK' when 'f' then 'FK' when 'u' then 'UNIQUE'
            when 'c' then 'CHECK' else contype::text end as tipo,
       pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.external_event_payments'::regclass
order by tipo;
```

- [ ] **Step 2: Pedir al dueño que lo corra y pegue los 4 bloques de resultado**

El dueño ejecuta el script en Supabase y comparte la salida. Con eso se conocen:
las políticas legacy a borrar (paso clave: `drop policy if exists` por nombre),
las columnas exactas para el `create table if not exists`, y si el RLS está OFF
(escenario más grave: IDOR entre hosts además del hueco de Pro).

- [ ] **Step 3: Commit del script de verificación**

```bash
git add supabase/VERIF_external_event_payments_2026-06-25.sql
git commit -m "chore(db): script de verificación RLS de external_event_payments"
```

---

## Task 2: Migración — versionar `external_event_payments` + RLS `is_pro_host()`

Calca el patrón de 029: lectura libre del dueño (preview), escritura solo Pro.
Idempotente: no-op en prod salvo crear las políticas que faltan.

**Files:**
- Create: `supabase/migrations/20260625_external_event_payments_gating.sql`

- [ ] **Step 1: Ajustar columnas del `create table` con el resultado de la Task 1**

Tomar el bloque `column` de la Task 1. Si difiere de las columnas asumidas abajo
(derivadas de lo que inserta `addEventPayment`), corregir el `create table` para que
sea idéntico a prod. Las columnas asumidas: `id, event_id, host_id, amount,
payment_method, payment_date, notes, is_deposit, receipt_url, created_at`.

- [ ] **Step 2: Escribir la migración**

Create `supabase/migrations/20260625_external_event_payments_gating.sql`:

```sql
-- ============================================================
-- 20260625_external_event_payments_gating
-- Cierra el hueco de la auditoría 2026-06-25: external_event_payments (pagos de
-- Espot Directo) no tenía migración ni RLS is_pro_host(). La server action
-- addEventPayment/deleteEventPayment ya gatea (requirePro); esto añade la capa
-- de respaldo a nivel BD, calcada a 029_espot_directo_gating.sql:
--   lectura libre del dueño (preview) / escritura solo Pro.
--
-- Idempotente: no-op en prod salvo crear las políticas que falten.
-- ⚠️ Ajustar el create table al DDL real (ver VERIF_external_event_payments_2026-06-25.sql).
-- ============================================================

-- (a) Versionado del esquema (no-op si la tabla ya existe en prod)
create table if not exists public.external_event_payments (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.external_events(id) on delete cascade,
  host_id        uuid not null,
  amount         numeric(12,2) not null,
  payment_method text,
  payment_date   date,
  notes          text,
  is_deposit     boolean not null default false,
  receipt_url    text,
  created_at     timestamptz default now()
);

-- (b) RLS de respaldo: lectura libre / escritura Pro
alter table public.external_event_payments enable row level security;

-- Borrar políticas legacy (ajustar nombres con el bloque `policy` de la Task 1)
drop policy if exists "external_event_payments_host_only"   on public.external_event_payments;
drop policy if exists "external_event_payments_select_own"  on public.external_event_payments;
drop policy if exists "external_event_payments_write_pro"   on public.external_event_payments;
drop policy if exists "external_event_payments_update_pro"  on public.external_event_payments;
drop policy if exists "external_event_payments_delete_pro"  on public.external_event_payments;

create policy "external_event_payments_select_own" on public.external_event_payments
  for select using (host_id = auth.uid());

create policy "external_event_payments_write_pro" on public.external_event_payments
  for insert with check (host_id = auth.uid() and is_pro_host());

create policy "external_event_payments_update_pro" on public.external_event_payments
  for update using (host_id = auth.uid() and is_pro_host())
  with check (host_id = auth.uid() and is_pro_host());

create policy "external_event_payments_delete_pro" on public.external_event_payments
  for delete using (host_id = auth.uid() and is_pro_host());

-- DOWN (reversión manual): restaurar la política FOR ALL previa (ver Task 1) y
-- drop de las 4 políticas creadas aquí.
```

- [ ] **Step 3: Definir la prueba de bloqueo (se corre tras aplicar el SQL en Supabase)**

Documentar en el commit / PR el test manual (el dueño lo ejecuta porque toca prod):

```
PRUEBA host NORMAL (debe FALLAR con 42501):
  - Autenticado como host sin Pro, vía REST de Supabase:
    POST /rest/v1/external_event_payments
      { "event_id": "<evento propio>", "host_id": "<su uid>", "amount": 1 }
    Esperado: 401/403 con "new row violates row-level security policy".
PRUEBA host PRO (debe PASAR):
  - Mismo POST con un host Pro → 201 Created.
PRUEBA lectura (preview, debe PASAR para Normal):
  - GET /rest/v1/external_event_payments?host_id=eq.<su uid> → 200 con sus filas.
```

- [ ] **Step 4: Commit de la migración**

```bash
git add supabase/migrations/20260625_external_event_payments_gating.sql
git commit -m "feat(db): RLS is_pro_host en external_event_payments (gating Directo)"
```

---

## Task 3: Candado visual en `agenda` (Hueco #2)

Replica el patrón de `eventos/page.tsx`: cargar el plan y ocultar/upsell el form de
abono para host Normal. Es UX; la barrera real ya está en la server action.

**Files:**
- Modify: `src/app/dashboard/host/agenda/page.tsx`

- [ ] **Step 1: Leer el archivo y localizar el form de abono**

Run: `grep -n "addEventPayment\|setShowPay\|getMyPlan\|ProUpsell\|isPro" src/app/dashboard/host/agenda/page.tsx`
Expected: aparece `addEventPayment` (~línea 853) y el control que abre el form (`setShowPay`/botón "registrar pago"). NO aparece `getMyPlan`/`ProUpsell`/`isPro` (confirma el hueco).

- [ ] **Step 2: Importar el plan en agenda**

Añadir el import (junto a los otros imports de acciones del archivo):

```tsx
import { getMyPlan } from '@/lib/actions/subscription'
```

- [ ] **Step 3: Cargar el plan en el componente que renderiza el form de abono**

En el componente cliente que muestra el evento/form de abono, añadir estado y carga
(mismo patrón que `eventos/page.tsx:45-47`):

```tsx
const [isPro, setIsPro] = useState<boolean | null>(null)
useEffect(() => { getMyPlan().then(p => setIsPro(p === 'pro')).catch(() => setIsPro(null)) }, [])
```

- [ ] **Step 4: Gatear el botón/form de abono**

Envolver el control que abre el form de abono (el botón "Registrar pago" / `setShowPay(true)`)
para que un host Normal no lo vea. Ejemplo (adaptar al JSX real del botón):

```tsx
{isPro !== false && (
  <button onClick={() => setShowPay(true)} /* …clases existentes… */>
    Registrar pago
  </button>
)}
```

Si el form de abono se renderiza condicional a `showPay`, además forzar el guard en el
submit como cinturón (defensa en UI, no reemplaza al server):

```tsx
async function handleAddPayment() {
  if (isPro === false) return   // server ya bloquea; evita request inútil
  // …resto sin cambios…
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, sin errores.

- [ ] **Step 6: Prueba manual (QA en navegador, consistente con el resto de UI gating)**

```
Host NORMAL en /dashboard/host/agenda:
  - NO ve el botón "Registrar pago" (o ve upsell). No puede abrir el form.
Host PRO en /dashboard/host/agenda:
  - Ve el botón y puede registrar el abono como hoy.
```

(No se añade test RTL: la página tiene 1094 líneas y el codebase no testea componentes
de ese tamaño con RTL; el patrón idéntico ya está validado en `eventos`. La regresión
de la lógica de plan está cubierta por `src/lib/__tests__/plans.test.ts`.)

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/host/agenda/page.tsx
git commit -m "feat(ux): candado Pro en form de abono de agenda (gating Directo)"
```

---

## Task 4: Verificación final + entregables

**Files:** (ninguno nuevo; verificación)

- [ ] **Step 1: Suite de tests completa (regresión)**

Run: `npx jest --silent`
Expected: `Tests: 139 passed` (o más si se añadieron) y 0 fallos.

- [ ] **Step 2: Typecheck global**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Actualizar el spec con la tabla "capa → bloquea sin Pro" final**

Modify `docs/superpowers/specs/2026-06-25-espot-directo-gating-audit-design.md`:
cambiar la fila de `external_event_payments` de 🔴 NO a ✅ (apuntando a la nueva
migración) y la de `agenda` de ⚠️ a ✅.

- [ ] **Step 4: Commit del cierre**

```bash
git add docs/superpowers/specs/2026-06-25-espot-directo-gating-audit-design.md
git commit -m "docs(spec): cierre de huecos de gating de Espot Directo"
```

- [ ] **Step 5: Entregar al dueño los 3 artefactos**

1. Tabla "capa → ¿bloquea sin Pro? → archivo" (actualizada).
2. Lista de huecos encontrados (#1 RLS pagos, #2 UI agenda).
3. Fixes aplicados con sus tests: migración + query de prueba REST (#1), gating UI + QA (#2).
   Recordar: el SQL se aplica a mano en Supabase; sin push automático.
