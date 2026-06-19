# Limpieza Espot 2.0 — Plan por fases

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (ejecución por lotes con checkpoints) en un **worktree dedicado** (superpowers:using-git-worktrees). Steps con checkbox.

**Goal:** Retirar de forma segura y reversible el código muerto, duplicado y obsoleto de Espot tras Espot 2.0, sin romper datos, reservas, pagos, usuarios ni los espacios con pricing legacy.

**Architecture:** 10 fases de menor a mayor riesgo. Cada fase = commits atómicos, verificados con `tsc`+`build`+`jest`. Worktree separado; nada a `main` sin aprobación. La DB (F8) NO se toca hasta respaldar y migrar los 29 espacios legacy. **Sin DROP. Sin push automático.**

**Tech Stack:** Next.js 16, React 19, TS, Supabase, Jest, git worktree.

**Compuertas de aprobación del dueño:** antes de F8 (DB) y antes de cualquier `git push`. Base: `docs/superpowers/specs/2026-06-19-auditoria-limpieza-espot-2.md`.

**Verificación estándar (cada commit):** `npx tsc --noEmit && npm run build && npx jest`. Smoke por rol cuando la fase toque su flujo.

---

## Fase 0 — Worktree y baseline

### Task 0.1: Crear worktree aislado
- [ ] Crear worktree desde `main`:
```bash
cd "/Users/enriquehernandezfondeur/Espot SaaS & Marketplace/espot-saas/host-dashboard"
git worktree add ../host-dashboard-cleanup -b cleanup/espot-2
cd ../host-dashboard-cleanup && npm install
```
- [ ] Baseline verde:
```bash
npx tsc --noEmit && npm run build && npx jest
```
Expected: tsc limpio, build OK, jest verde (70 tests). **Trabajar SOLO en este worktree.**

---

## Fase 1 — Código muerto sin datos ni dependencias

### Task 1.1: Eliminar `src/lib/cache.ts` (0 imports)
- [ ] Confirmar 0 importadores: `grep -rn "@/lib/cache" src` → vacío.
- [ ] `git rm src/lib/cache.ts`
- [ ] Verificar: `npx tsc --noEmit && npm run build && npx jest`
- [ ] Commit: `git commit -m "F1: elimina lib/cache.ts sin uso"`

### Task 1.2: Eliminar hooks huérfanos
- [ ] Confirmar 0 importadores de cada uno: `grep -rn "hooks/performance\|hooks/ux" src` → vacío.
- [ ] `git rm src/hooks/performance.ts src/hooks/ux.ts`
- [ ] ⚠️ **`src/hooks/pwa.ts` NO borrar aún** — primero confirmar el estado del Service Worker: `grep -rn "hooks/pwa\|navigator.serviceWorker\|sw.js" src public`. Si nada lo importa y `public/sw.js` no se registra por otra vía, borrar pwa.ts + `public/sw.js` en un commit aparte; si hay PWA activa, conservar. Documentar el hallazgo.
- [ ] Verificar + commit: `git commit -m "F1: elimina hooks performance/ux sin uso"`

### Task 1.3: Eliminar API stub muerto `/api/payments/process`
- [ ] Confirmar que devuelve 410 y no tiene callers: `grep -rn "payments/process" src` → solo su propia ruta.
- [ ] `git rm -r src/app/api/payments/process`
- [ ] Verificar + commit: `git commit -m "F1: elimina /api/payments/process (stub 410)"`

### Task 1.4: Eliminar SVGs del scaffold de Next
- [ ] Confirmar sin referencias: `grep -rn "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg" src public` → vacío.
- [ ] `git rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg`
- [ ] Verificar build + commit: `git commit -m "F1: elimina SVGs del scaffold sin uso"`

### Task 1.5: Eliminar server actions sin callers (una por una, verificando)
Para CADA función, confirmar 0 callers con `grep -rn "<nombre>" src --include=*.ts --include=*.tsx | grep -v "export async function <nombre>"` → vacío, luego eliminar la función:
- [ ] `notifications.ts`: `getNotificationSettings`, `updateNotificationSettings`, `isNotificationEnabled`
- [ ] `admin.ts`: `adminUpdatePricing`, `adminUpdateConditions`, `adminUpdatePaymentTerms`, `deleteSpace`
- [ ] `disputes.ts`: `getMyDisputes`, `getDisputeById`
- [ ] `reviews.ts`: `getUserPendingReview`
- [ ] `space.ts`: `getSpaceForEdit`
- [ ] `host-application.ts`: `getPendingCount`
- [ ] `client.ts`: `removeFavorite`
- [ ] `clients.ts`: `getClients` (versión vieja; conservar `getUnifiedClients`)
- [ ] `subscription.ts`: `isProHost` (se usa `isHostProById`/`getMyPlan`)
- [ ] `activities.ts`: `getSubActivities`
- [ ] ⚠️ `installments.ts`: `getOverdueInstallments`/`getUpcomingInstallments`/`markReminderSent` — **NO borrar sin revisar `src/app/api/cron/payment-reminders/route.ts`**. Si el cron hace su query inline y no las usa, borrarlas; si el plan es que las use, conservar. Documentar.
- [ ] Verificar tras cada bloque + commit: `git commit -m "F1: elimina server actions sin callers"`

---

## Fase 2 — Imports/helpers/componentes/duplicados

### Task 2.1: Eliminar imports y locales sin uso (~106)
- [ ] Activar temporalmente `noUnusedLocals` o listar con `npx tsc --noEmit --noUnusedLocals 2>&1 | grep "is declared but"`.
- [ ] Eliminar imports muertos. ⚠️ Para **locals/funciones** (ej. `toggleDay`, `addTimeBlock` en `espacio/page.tsx:209-218`) revisar si es lógica a medio quitar antes de borrar — no solo el símbolo.
- [ ] Verificar + commit por archivo grande (BookingWidget, SpaceDetailClient, espacio, agenda): `git commit -m "F2: elimina imports sin uso"`

### Task 2.2: Componentes nunca importados
- [ ] Listar componentes sin consumidores: para cada archivo en `src/components/`, `grep -rn "<NombreComponente>" src` → si solo aparece su definición, es huérfano.
- [ ] Eliminar los confirmados huérfanos. Verificar + commit.

### Task 2.3: Unificar comisión 10% → `computePlatformFee` + `computeHostNet`
- [ ] Añadir helper puro en `src/lib/pricing.ts`:
```ts
/** Neto del host: total − comisión 10% (consistente con la liquidación registrada). */
export function computeHostNet(total: number): number {
  return total - computePlatformFee(total)
}
```
- [ ] Añadir test en `src/lib/__tests__/pricing.test.ts`:
```ts
import { computeHostNet } from '@/lib/pricing'
describe('computeHostNet', () => {
  it('total − comisión 10%', () => {
    expect(computeHostNet(10000)).toBe(9000)
    expect(computeHostNet(1505)).toBe(1505 - 151) // 1354, no 1355
  })
})
```
- [ ] `npx jest src/lib/__tests__/pricing.test.ts` → PASS.
- [ ] Reemplazar los `Math.round(x*0.10)` por `computePlatformFee(x)` y los `Math.round(x*0.90)`/`x*0.9` por `computeHostNet(x)` en: backend (`booking.ts:658`, `host.ts:507`, `host-finance.ts:40`, `host-analytics.ts:38`, `admin.ts:247-248`, `api/payments/confirm/route.ts:93`, `api/payments/test-confirm`) y UI admin/host (ver lista en la auditoría §6). ⚠️ Verificar que cada reemplazo da el MISMO número (o el correcto, para los `*0.90` que diferían ±RD$1) — documentar los que cambien.
- [ ] Verificar + commit en bloques pequeños (backend aparte de UI): `git commit -m "F2: unifica comisión/neto en computePlatformFee/computeHostNet"`

### Task 2.4: Unificar listas de estados
- [ ] `admin/pagos/page.tsx:6`: reemplazar `const PAID = [...]` por `import { PAID_STATUSES, isPaid } from '@/lib/bookingConfig'`.
- [ ] Extraer `REVENUE_BOOKING_STATUSES = ['confirmed','completed']` a `bookingConfig.ts` y usarlo en `host.ts:370` y `admin/usuarios/[id]/page.tsx:141`.
- [ ] Verificar + commit.

---

## Fase 3 — Rutas, páginas y navegación obsoleta

### Task 3.1: Eliminar lista `host/reservas` (conservar `[id]`)
- [ ] Confirmar que la nav apunta a `/agenda` (no a `/reservas`): `grep -rn "host/reservas" src` → revisar enlaces.
- [ ] Reapuntar los back-links de `host/reservas/[id]/page.tsx` (botón "volver") a `/dashboard/host/agenda`.
- [ ] `git rm src/app/dashboard/host/reservas/page.tsx` (conservar la carpeta `[id]`).
- [ ] ⚠️ `StatusBadge` se importa desde esta página — confirmar que su otro consumidor sigue importándolo; si no, mover el re-export.
- [ ] Verificar + smoke: navegar host → agenda → detalle reserva. Commit.

### Task 3.2: Eliminar `admin/payouts` (duplicado de `liquidaciones`)
- [ ] Confirmar que AdminSidebar enlaza `liquidaciones` y nada enlaza `payouts`.
- [ ] `git rm -r src/app/admin/payouts` y quitar `revalidatePath('/admin/payouts')` de `admin.ts:612`.
- [ ] Verificar + smoke: abrir `/admin/liquidaciones`. Commit.

### Task 3.3: Eliminar `host/bienvenida` (onboarding huérfano)
- [ ] Confirmar 0 enlaces entrantes: `grep -rn "host/bienvenida" src` → vacío.
- [ ] `git rm -r src/app/dashboard/host/bienvenida`. Verificar + commit.

### Task 3.4: Decisión `host/solicitud`
- [ ] **Compuerta de producto:** ¿recablear desde `/aplicar` (modificar) o eliminar? Sin enlaces entrantes hoy. Anotar decisión del dueño; ejecutar según corresponda.

---

## Fase 4 — Flujos viejos de interfaz
- [ ] Revisar `BookingWidget`, `SpaceDetailClient`, `espacio/page.tsx` por ramas de UI legacy que ya no se alcanzan (NO las de pricing legacy, que se conservan hasta migrar). Ej.: bloques de horarios muertos (`toggleDay`/`addTimeBlock`), `eventos` lista vs `agenda` (evaluar consolidar). Cada eliminación: verificar + smoke + commit.
- [ ] **NO tocar** las ramas `isQuote`/`isConsumption`/`isPackage` ni los textos de cotización/consumible — soportan espacios legacy vivos.

---

## Fase 5 — Server actions y APIs obsoletas
- [ ] `api/admin/sync-avatars`: confirmar con dueño si es one-off ya ejecutado → eliminar; si no, conservar.
- [ ] `api/admin/azul-check`, `api/payments/test-confirm`, `api/admin/{migrate,fix-pricing,cleanup-spaces}`: **conservar-temporal** (compat Azul/migración). Documentar para retiro post-Azul/post-migración.
- [ ] ⚠️ `api/payments/initiate`: **NO eliminar sin confirmar** que ningún cliente lo invoca (ruta de pago). Verificar y anotar.
- [ ] Funciones SQL del flujo viejo de booking: **inventariadas, NO retirar en código** (son DB → F8). Antes, `grep -rn "rpc(" src` + revisar `vercel.json`/crons para confirmar que no se llaman.

---

## Fase 6 — Dependencias y variables de entorno

### Task 6.1: Eliminar dependencias sin importar
- [ ] Para cada una confirmar 0 imports: `grep -rn "from '<dep>'\|require('<dep>')" src`:
  `framer-motion`, `react-hot-toast`, `next-themes`, `react-intersection-observer`, `class-variance-authority`, `date-fns`, `next-intl`, `@radix-ui/react-{progress,switch,tabs,avatar,dialog,dropdown-menu,select,toast}`, `workbox-sw`, `workbox-webpack-plugin`.
- [ ] ⚠️ Confirmar i18n: si `src/lib/i18n/*` no tiene importadores, eliminar módulo + `next-intl` juntos; si algo lo usa, conservar.
- [ ] `npm uninstall <deps>` en un commit aislado. Verificar `tsc+build+jest`. Commit: `git commit -m "F6: elimina dependencias sin uso"`. Si algo rompe → `git revert`.

### Task 6.2: Corregir `.env.example`
- [ ] Renombrar nombres muertos: `AZUL_AUTH_KEY`→`AZUL_PRIVATE_KEY`, `HEALTH_CHECK_SECRET`→`HEALTH_SECRET`.
- [ ] Quitar obsoletas: `KV_*`, `LOG_LEVEL`, `NEXT_PUBLIC_PWA_ENABLED`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_VERCEL_ANALYTICS`.
- [ ] Añadir las reales no documentadas (Azul/Google/admin/SITE_PASSWORD/PAYMENT_TEST_MODE/CRON_SECRET…).
- [ ] 🔴 **Verificar con el dueño** que `PAYMENT_TEST_MODE`/`NEXT_PUBLIC_PAYMENT_TEST_MODE` estén **apagados en prod** (bypass de pago). Documentar (no es cambio de código).
- [ ] Commit: `git commit -m "F6: sincroniza .env.example con el código real"`

---

## Fase 7 — Notificaciones antiguas o duplicadas
- [ ] Emails (`src/lib/email/`) y WhatsApp (`src/lib/whatsapp/send.ts`): la auditoría confirmó que **todas tienen callers**. Revisar solo si alguna plantilla describe el modelo viejo de forma incorrecta (texto) — corregir texto, no borrar la plantilla.
- [ ] Verificar que no haya notificaciones duplicadas (mismo evento, dos envíos). Documentar; corregir con cuidado + smoke.

---

## Fase 8 — Base de datos (SOLO tras respaldo + migración) — 🔒 COMPUERTA DE APROBACIÓN

> **No ejecutar sin aprobación explícita del dueño. Sin DROP en este ciclo.**

### Task 8.0 (prerrequisito): Migrar los 29 espacios legacy a por hora
- [ ] El dueño convierte los 29 espacios (24 consumo mínimo, 4 paquete, 1 cotización) en **Admin → Revisión de precios** (sugerencias ya calculadas). Hasta que `select count(*) from space_pricing where pricing_type <> 'hourly'` sea 0, NO continuar con columnas/tipos legacy.

### Task 8.1: Verificar datos antes de clasificar tablas
- [ ] Para cada tabla candidata, `select count(*)`: `quotes`, `payment_plans`, `booking_payments`, `site_content`, `space_activities`, `space_facilities`, `subscription_payments`. **Con datos → conservar/migrar, nunca eliminar.**
- [ ] Verificar joins embebidos: `grep -rn "space_facilities\|space_activities" src` (selects anidados) antes de declarar muertas.

### Task 8.2: Investigar drift activo `external_events.source`
- [ ] 🔴 Verificar en DB el CHECK real de `external_events.source` vs los valores que escribe el código (`espot/manual/whatsapp/instagram/...`). Confirmar que la migración **029** está aplicada (amplía el CHECK). Si no, alinear antes de cualquier limpieza (riesgo de inserts rotos hoy).

### Task 8.3: Confirmar RLS aplicada
- [ ] Verificar en prod que **024** (limpieza policies duplicadas) y **029** (gating Pro) están aplicadas.

### Task 8.4: Retiro DB (futuro, con migración reversible + respaldo)
- [ ] Solo tras 8.0–8.3: preparar migraciones con bloque DOWN para columnas/tipos legacy sin uso y funciones SQL órfanas confirmadas. **El dueño aplica el SQL.** Respaldo por tabla antes de tocar.

---

## Fase 9 — Simplificación final de arquitectura
- [ ] `/simplify` sobre el código tocado: reducir duplicación restante, aclarar límites de módulos (sin reescribir monolitos por iniciativa propia).
- [ ] Consolidar mapas de estado/color duplicados en `bookingConfig.ts`.
- [ ] Verificar + commit.

---

## Fase 10 — QA completo (🔒 antes de finalizar)
- [ ] `/webapp-testing` + `/verification-before-completion`.
- [ ] Smoke E2E por rol (cliente/propietario/admin): registro, login, solicitud propietario, crear/editar espacio, revisión admin, publicar, precio por hora, precio consumible, disponibilidad, reserva, pagos, liquidaciones, Espot Directo, CRM, reservas externas, calendario, Pro + activación manual, notificaciones, tarjeta digital, responsive.
- [ ] RLS/permisos por rol. Frontend + backend.
- [ ] `tsc + build + jest` final verde.
- [ ] **Compuerta de push:** entregar resumen al dueño; el dueño autoriza el merge/push a `main`.

---

## Self-Review
- **Cobertura del spec:** F1 (código muerto) ✅, F2 (imports/duplicados) ✅, F3 (rutas) ✅, F4 (flujos UI) ✅, F5 (actions/APIs) ✅, F6 (deps/env) ✅, F7 (notificaciones) ✅, F8 (DB con compuerta) ✅, F9 (simplificación) ✅, F10 (QA) ✅. Respaldo/reversión (§11/§12 del informe) → Fase 0 worktree + DOWN en F8. Pruebas (§13) → verificación por commit + F10.
- **Reglas duras respetadas:** sin DROP (F8 solo prepara, dueño aplica), sin borrar datos (8.1 verifica filas), pricing legacy conservado hasta 8.0, worktree (F0), commits pequeños, sin push automático (compuerta F10).
- **Riesgos marcados con ⚠️/🔴** en cada tarea sensible (pwa/SW, installments/cron, payments/initiate, source drift, PAYMENT_TEST_MODE).
