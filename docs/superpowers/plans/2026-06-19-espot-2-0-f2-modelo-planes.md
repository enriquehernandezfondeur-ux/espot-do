# Espot 2.0 — F2: Modelo de datos de planes/suscripción + gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o superpowers:executing-plans. Steps en checkbox.

**Goal:** Crear la infraestructura de planes (Normal/Pro) — tablas de suscripción, función `is_pro_host()` y helpers de servidor — SIN cambiar el comportamiento actual (todos siguen 'free' hasta que F4/F5 conecten el gating con su UI).

**Architecture:** Fuente de verdad = tabla `host_subscriptions`. La función SQL `is_pro_host()` y el helper TS `resolvePlan()` derivan el plan. `profiles.plan_type` es solo caché de visualización (protegido por trigger). El gating resuelve el `hostId` dueño vía `resolveHostId` (respeta equipos). El bloqueo RLS de escrituras Pro se difiere a F5.

**Tech Stack:** Next.js 16 server actions, Supabase (Postgres + RLS), TypeScript, Jest.

**Gobernanza:** sin push/commit automático. SQL se entrega al dueño. La migración 027 es **segura de aplicar ya** (aditiva, sin cambio de comportamiento).

---

## File Structure

**Crear:**
- `supabase/migrations/027_host_plans.sql` — `profiles.plan_type`, `host_subscriptions`, `subscription_payments`, `is_pro_host()`, RLS de las tablas nuevas, trigger anti-escalada de `plan_type`.
- `src/lib/plans.ts` — lógica pura: `PlanType`, `resolvePlan()`, `PRO_PRICE_DOP`.
- `src/lib/__tests__/plans.test.ts` — tests de `resolvePlan`.
- `src/lib/actions/subscription.ts` — server actions: `getMyPlan()`, `isProHost()`, `requirePro()`.

**Diferido a F5 (NO en F2):** RLS que exige `is_pro_host()` para INSERT/UPDATE en `external_events`, `host_clients` y la config Directo. Se escribirá junto con la UI de vista previa.

---

## Task 1: Migración SQL — tablas de planes + función + protección

**Files:**
- Create: `supabase/migrations/027_host_plans.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- 027_host_plans.sql · Espot 2.0 (F2)
-- Infraestructura de planes Normal/Pro. Aditiva, segura de aplicar ya:
-- no cambia el comportamiento actual (nadie es Pro hasta F4/F7).

-- 1) Caché de plan en profiles (la verdad vive en host_subscriptions)
alter table profiles add column if not exists plan_type text not null default 'free'
  check (plan_type in ('free','pro'));

-- 2) Suscripciones del host
create table if not exists host_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  host_id               uuid not null references profiles(id) on delete cascade,
  status                text not null default 'pending_payment'
                          check (status in ('active','pending_payment','past_due','cancelled','expired')),
  price_amount          numeric(10,2) not null default 499,
  currency              text not null default 'DOP',
  payment_provider      text not null default 'azul' check (payment_provider in ('azul','manual')),
  activated_by          uuid references profiles(id),
  started_at            timestamptz,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancelled_at          timestamptz,
  ends_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
-- A lo sumo UNA suscripción "viva" por host
create unique index if not exists uq_host_subscription_live
  on host_subscriptions(host_id)
  where status in ('active','pending_payment','past_due');
create index if not exists idx_host_subscriptions_host on host_subscriptions(host_id);

-- 3) Cobros de la suscripción (espeja booking_installments)
create table if not exists subscription_payments (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references host_subscriptions(id) on delete cascade,
  amount          numeric(10,2) not null,
  period_start    date,
  period_end      date,
  status          text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  azul_order_id   text,
  method          text not null default 'azul' check (method in ('azul','manual')),
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_subscription_payments_sub on subscription_payments(subscription_id);

-- 4) Fuente de verdad del gating
create or replace function is_pro_host(uid uuid default auth.uid())
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from host_subscriptions
    where host_id = uid
      and status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- 5) RLS de las tablas nuevas
alter table host_subscriptions  enable row level security;
alter table subscription_payments enable row level security;

drop policy if exists "host_subscriptions_select_own"  on host_subscriptions;
drop policy if exists "host_subscriptions_write_admin"  on host_subscriptions;
create policy "host_subscriptions_select_own" on host_subscriptions
  for select using (host_id = auth.uid() or is_admin());
create policy "host_subscriptions_write_admin" on host_subscriptions
  for all using (is_admin()) with check (is_admin());

drop policy if exists "subscription_payments_select_own" on subscription_payments;
drop policy if exists "subscription_payments_write_admin" on subscription_payments;
create policy "subscription_payments_select_own" on subscription_payments
  for select using (
    exists (select 1 from host_subscriptions s
            where s.id = subscription_id and (s.host_id = auth.uid() or is_admin()))
  );
create policy "subscription_payments_write_admin" on subscription_payments
  for all using (is_admin()) with check (is_admin());

-- 6) Anti-escalada: el host no puede auto-promoverse vía profiles.plan_type
--    (trigger SEPARADO; no reescribe prevent_profile_privilege_escalation)
create or replace function lock_profile_plan_type()
returns trigger language plpgsql security definer as $$
begin
  if auth.role() = 'service_role' or is_admin() then return new; end if;
  if new.plan_type is distinct from old.plan_type then
    raise exception 'plan_type solo puede modificarlo el sistema o un admin';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_lock_profile_plan_type on profiles;
create trigger trg_lock_profile_plan_type
  before update on profiles
  for each row execute function lock_profile_plan_type();

-- DOWN (reversión manual):
-- drop trigger if exists trg_lock_profile_plan_type on profiles;
-- drop function if exists lock_profile_plan_type();
-- drop function if exists is_pro_host(uuid);
-- drop table if exists subscription_payments;
-- drop table if exists host_subscriptions;
-- alter table profiles drop column if exists plan_type;
```

- [ ] **Step 2: Verificar lectura**

Run: `cat supabase/migrations/027_host_plans.sql`
Expected: archivo completo, sin marcadores `<...>`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/027_host_plans.sql
git commit -m "F2(db): infraestructura de planes (host_subscriptions, is_pro_host)"
```

> ⚠️ Entregar SQL al dueño para Supabase. Segura de aplicar ya.

---

## Task 2: Lógica pura `src/lib/plans.ts`

**Files:**
- Create: `src/lib/plans.ts`

- [ ] **Step 1: Escribir la lógica pura**

```ts
export type PlanType = 'free' | 'pro'
export type SubscriptionStatus =
  | 'active' | 'pending_payment' | 'past_due' | 'cancelled' | 'expired'

export interface SubscriptionLike {
  status: SubscriptionStatus | string
  current_period_end: string | null
}

export const PRO_PRICE_DOP = 499

/**
 * Plan efectivo a partir de la suscripción. Pro sólo si está 'active' y el
 * periodo no venció. Cualquier otro estado (o sin suscripción) => 'free'.
 */
export function resolvePlan(sub: SubscriptionLike | null | undefined, nowISO: string): PlanType {
  if (!sub) return 'free'
  if (sub.status !== 'active') return 'free'
  if (sub.current_period_end) {
    const end = new Date(sub.current_period_end).getTime()
    const now = new Date(nowISO).getTime()
    if (end <= now) return 'free'
  }
  return 'pro'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/plans.ts
git commit -m "F2(plans): lógica pura resolvePlan + constantes"
```

---

## Task 3: Tests de `resolvePlan`

**Files:**
- Create: `src/lib/__tests__/plans.test.ts`

- [ ] **Step 1: Escribir los tests**

```ts
import { resolvePlan } from '@/lib/plans'

const NOW = '2026-06-19T12:00:00.000Z'

describe('resolvePlan', () => {
  it('sin suscripción => free', () => {
    expect(resolvePlan(null, NOW)).toBe('free')
    expect(resolvePlan(undefined, NOW)).toBe('free')
  })
  it('active sin fecha de fin => pro', () => {
    expect(resolvePlan({ status: 'active', current_period_end: null }, NOW)).toBe('pro')
  })
  it('active con periodo vigente => pro', () => {
    expect(resolvePlan({ status: 'active', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)).toBe('pro')
  })
  it('active pero vencido => free', () => {
    expect(resolvePlan({ status: 'active', current_period_end: '2026-06-01T12:00:00.000Z' }, NOW)).toBe('free')
  })
  it('pending_payment => free', () => {
    expect(resolvePlan({ status: 'pending_payment', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)).toBe('free')
  })
  it('cancelled/expired/past_due => free', () => {
    expect(resolvePlan({ status: 'cancelled', current_period_end: null }, NOW)).toBe('free')
    expect(resolvePlan({ status: 'expired', current_period_end: null }, NOW)).toBe('free')
    expect(resolvePlan({ status: 'past_due', current_period_end: '2026-07-19T12:00:00.000Z' }, NOW)).toBe('free')
  })
})
```

- [ ] **Step 2: Ejecutar**

Run: `npx jest src/lib/__tests__/plans.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/plans.test.ts
git commit -m "F2(plans): tests de resolvePlan"
```

---

## Task 4: Server actions `src/lib/actions/subscription.ts`

**Files:**
- Create: `src/lib/actions/subscription.ts`

- [ ] **Step 1: Escribir las server actions**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveHostId } from './_resolveHost'
import { resolvePlan, type PlanType } from '@/lib/plans'

/** Plan efectivo del host del usuario autenticado (resuelve equipo → dueño). */
export async function getMyPlan(): Promise<PlanType> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'

  const { hostId } = await resolveHostId(supabase, user.id)
  const svc = createServiceClient()
  const { data: sub } = await svc
    .from('host_subscriptions')
    .select('status, current_period_end')
    .eq('host_id', hostId)
    .in('status', ['active', 'pending_payment', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return resolvePlan(sub, new Date().toISOString())
}

export async function isProHost(): Promise<boolean> {
  return (await getMyPlan()) === 'pro'
}

/**
 * Guard para server actions Pro. Devuelve un resultado discriminado para que
 * la action pueda cortar antes de escribir. NO confía en el frontend.
 */
export async function requirePro(): Promise<{ ok: true } | { ok: false; error: string }> {
  const plan = await getMyPlan()
  if (plan !== 'pro') {
    return { ok: false, error: 'Esta función es exclusiva de Espot Pro.' }
  }
  return { ok: true }
}
```

- [ ] **Step 2: Verificar compilación + build**

Run: `npx tsc --noEmit && npm run build`
Expected: OK. (Las actions existen pero aún no se llaman desde ningún sitio — cero cambio de comportamiento.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/subscription.ts
git commit -m "F2(plans): server helpers getMyPlan/isProHost/requirePro"
```

---

## Task 5: Verificación integral

- [ ] **Step 1: tsc + build + jest**

Run: `npx tsc --noEmit && npm run build && npx jest`
Expected: tsc limpio, build OK, todos los tests verdes (incluye `plans.test.ts`).

- [ ] **Step 2: Confirmar cero cambio de comportamiento**

Run: `grep -rn "requirePro\|isProHost\|getMyPlan" src --include='*.ts' --include='*.tsx' | grep -v "subscription.ts"`
Expected: sin coincidencias (los helpers existen pero nadie los llama todavía — el gating real llega en F4/F5).

---

## Self-Review (F2)

- **Cobertura del spec §5/§6 (infra):** `host_subscriptions` ✅, `subscription_payments` ✅, `profiles.plan_type` ✅, `is_pro_host()` ✅, `requirePro()` ✅, anti-downgrade ✅.
- **Diferido conscientemente:** RLS de escritura Pro en external_events/host_clients → F5 (con la UI de vista previa), para no romper hosts gratuitos en producción.
- **Equipos:** `getMyPlan` resuelve `hostId` dueño vía `resolveHostId` → un miembro de equipo hereda el plan del dueño.
- **Seguridad:** `is_pro_host()` lee `host_subscriptions` (no `profiles.plan_type`); `plan_type` es caché protegida por trigger. El gating nunca debe leer `plan_type`.
- **Sin placeholders:** migración, lógica pura, tests y server actions con código completo.
