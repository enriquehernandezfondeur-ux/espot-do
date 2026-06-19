# Auditoría de limpieza — Espot 2.0

> Fecha: 2026-06-19 · **Solo lectura. Nada eliminado.** Pendiente de aprobación del dueño antes de ejecutar.
> Método: 4 auditores en paralelo (rutas/componentes, DB, actions/APIs/helpers, integraciones/config) + hallazgos de auditorías previas de la sesión.
> Reglas: sin DROP, sin borrar datos/reservas, conservar modelos de precio hasta migrar espacios, sin push automático, worktree para ejecutar.

Clasificación por elemento: **(1)** se mantiene · **(2)** se modifica · **(3)** se reutiliza · **(4)** conserva-temporal por compat · **(5)** se migra · **(6)** elimina-seguro.

---

## 1. Inventario completo (resumen)
- **Rutas:** marketplace (home, buscar, espacios/[slug], h/[slug], t/[slug], aplicar), dashboard host (16 secciones), dashboard cliente (8), admin (16), api (20 routes), pago, auth, contrato.
- **Componentes:** ~60. **Server actions:** 18 archivos / ~150 funciones. **APIs:** 20 routes. **Migraciones:** 2 dirs (base `../supabase/migrations` 26 archivos + host-dashboard 23).
- **Integraciones activas:** Supabase, Azul (⚠️ redirect roto), Resend, Twilio/WhatsApp, Google Maps/Calendar, iCal, Sentry/winston.

## 2. Mapa de dependencias (claves)
- Flujo cotización: marketplace `custom_quote` → BookingWidget → `createBooking` (`quote_requested`) → `respondToQuote` → `accepted`+cuotas. **Vivo.** Tabla `quotes` NO participa (las cotizaciones viven en `bookings`).
- Pricing legacy: 29/37 espacios publicados usan minimum_consumption(24)/fixed_package(4)/custom_quote(1). `space.ts`/`booking.ts`/`BookingWidget`/`SpaceDetailClient` ramifican por tipo. **Bloqueado hasta migrar.**
- Pro: `host_subscriptions` ← `is_pro_host()` (RLS) + `requirePro()` (9 actions) + `getMyPlan`/badge.

## 3. Espot anterior vs Espot 2.0
| Área | Anterior | 2.0 | Estado |
|---|---|---|---|
| Pricing | 4 modelos (hora/consumo/paquete/cotización) | Solo "por hora" + consumible | Legacy **vivo** hasta migrar (29 espacios) |
| Planes | — | Normal/Pro RD$499 + gating | Nuevo, parcial (Azul pendiente) |
| Directo/CRM/reservas externas | gratis | Pro (vista previa para gratis) | RLS 029 pendiente de aplicar con deploy |
| Tarjeta digital | — | `/t/[slug]` + QR (Pro) | Nuevo |
| Categorías | 9 mapas duplicados | `lib/categories.ts` único + wellness/popup | Migrado ✅ |

## 4. Código muerto (elimina-seguro, sin datos)
- **Hooks huérfanos (0 importadores):** `src/hooks/performance.ts`, `src/hooks/ux.ts`. ⚠️ `src/hooks/pwa.ts` (verificar: registra `sw.js` pero nadie lo importa → el SW podría no estar activo; confirmar antes).
- **`src/lib/cache.ts`** completo (0 imports).
- **API `/api/payments/process`** — stub que devuelve 410.
- **~13 server actions sin callers:** `getNotificationSettings`/`updateNotificationSettings`/`isNotificationEnabled` (notifications.ts), `adminUpdatePricing`/`adminUpdateConditions`/`adminUpdatePaymentTerms` (admin.ts), `deleteSpace` admin, `getMyDisputes`/`getDisputeById`, `getUserPendingReview`, `getSpaceForEdit`, `getPendingCount`, `removeFavorite`, `getClients` (vieja), `isProHost`, `getSubActivities`. ⚠️ `getOverdueInstallments`/`getUpcomingInstallments`/`markReminderSent` (installments.ts) — verificar que el cron no las necesite (hoy hace query inline).
- **~106 imports/locals sin uso** (`tsc --noUnusedLocals`): destacan en BookingWidget, SpaceDetailClient, espacio/page, agenda. ⚠️ algunos son funciones locales (`toggleDay`, `addTimeBlock` en espacio) → revisar (¿lógica a medio quitar?).
- **5 SVG del scaffold Next** en `public/`: file/globe/next/vercel/window.svg.
- **Módulo i18n propio** `src/lib/i18n/*` (0 importadores) + `next-intl` — verificar y retirar.
- Ya eliminados esta sesión: `convertQuoteToEvent`, `src/hooks/i18n.ts`, estado huérfano de /buscar.

## 5. Funcionalidades obsoletas
- Rutas duplicadas: **`host/reservas` (lista)** ← duplicado de `/agenda` (la nav apunta a /agenda); **`admin/payouts`** ← duplicado de `/liquidaciones`. Ambas con back-links/revalidate a reapuntar.
- **`host/bienvenida`** (onboarding huérfano, 0 refs). **`host/solicitud`** (sin enlaces entrantes — decisión: recablear desde /aplicar o eliminar).
- Funciones SQL del flujo viejo de booking (no se llaman vía `.rpc()`): `accept_booking`, `reject_booking`, `confirm_booking_payment`, `complete_booking`, `create_booking_safe`, `calculate_booking_total`, `check_availability`(009), `generate_payment_schedule`, `process_booking_payment`, `mark_overdue_payments` — el flujo corre por server actions. **Verificar que ningún cron/Edge Function las use antes de retirar.**

## 6. Duplicaciones
- **Comisión 10% a mano** en ~30 sitios (`*0.10`/`*0.90`) en vez de `computePlatformFee`. Backend: booking.ts:658, host.ts:507, host-finance.ts:40, host-analytics.ts:38, admin.ts:247/248/593, confirm/route.ts:93, test-confirm. UI: ~18 archivos admin/host. **Riesgo:** el `*0.90` difiere ±RD$1 del `total−round(total*0.10)`. → crear `computeHostNet(total)` y reemplazar.
- **`PAID_STATUSES`** reescrito en `admin/pagos/page.tsx:6`. `paidStatuses=['confirmed','completed']` repetido en host.ts:370 + admin/usuarios.
- Mapas de color de estado (`payoutCfg`/`externalStatusCfg`) duplican `STATUS_COLORS` con opacidad distinta (0.10 vs 0.08).

## 7. Elementos a MIGRAR (antes de tocar nada)
- **29 espacios legacy → por hora** (24 consumo mínimo, 4 paquete, 1 cotización) vía **Admin → Revisión de precios** (sugerencias ya calculadas; el dueño confirma cada precio). **Prerrequisito** para retirar columnas/tipos legacy.
- Tras migrar: `space_pricing_backup_pre_espot2` queda como respaldo retirable; columnas legacy de `space_pricing` quedan sin uso.

## 8. Elementos que pueden eliminarse (resumen por fase — ver plan)
Hooks/cache/actions sin callers (F1) · imports muertos + deps sin importar (F2/F6) · rutas duplicadas (F3) · API process stub + SVGs scaffold (F1/F6). **DB solo en F8, tras respaldo + migración, sin DROP en este informe.**

## 9. Riesgos
- 🔴 **Sobre-reserva concurrente:** `createBooking` valida disponibilidad sin constraint atómico → doble-reserva posible. (Fix: `EXCLUDE` gist — tarea dedicada.)
- 🔴 **Seguridad — PAYMENT_TEST_MODE:** `/api/payments/test-confirm` confirma pagos **sin Azul** si `NEXT_PUBLIC_PAYMENT_TEST_MODE='1'`. **Verificar que esté apagado en prod.**
- 🔴 **Drift `external_events.source`:** el CHECK base era `(directo,referido,redes,otro)` pero el código escribe `espot/manual/whatsapp/instagram/...`. La migración 029 amplió el CHECK — **verificar que 029 esté aplicada** o los inserts fallan.
- 🟡 **RLS 024 / 029:** confirmar aplicadas en prod (limpieza de policies duplicadas + gating Pro).
- 🟡 **Stats admin infladas** (comisión completa sobre reservas con solo anticipo).
- 🟡 `.env.example` con nombres muertos (`AZUL_AUTH_KEY`→`AZUL_PRIVATE_KEY`, `HEALTH_CHECK_SECRET`→`HEALTH_SECRET`, `KV_*`/`LOG_LEVEL` obsoletas).
- Borrar `pwa.ts`/workbox sin verificar el SW; borrar `installments` huérfanas sin revisar el cron.

## 10. Plan de limpieza por fases
→ Documento separado generado con `/writing-plans` (10 fases, ver `docs/superpowers/plans/`).

## 11. Estrategia de respaldo
- **Git:** rama/worktree dedicado; commits pequeños y reversibles; nada a `main` sin verificación.
- **DB:** ninguna acción destructiva en este ciclo. Para F8 (futura): respaldo de cada tabla antes de tocar (ya existe `space_pricing_backup_pre_espot2`; replicar patrón). Verificar filas (`select count`) antes de clasificar cualquier tabla/columna como retirable.
- **Deps:** quitar de package.json en commit aislado; si algo rompe, revertir el commit.

## 12. Estrategia de reversión
- Cada fase = commits atómicos → `git revert` puntual.
- Worktree aislado: si la limpieza sale mal, se descarta el worktree sin tocar `main`.
- DB: toda migración futura con bloque DOWN; respaldos por tabla antes de cualquier cambio.

## 13. Pruebas necesarias (por fase)
`tsc --noEmit` + `next build` + `jest` en cada commit. Smoke E2E (3 roles): registro, login, solicitud propietario, crear/editar espacio, revisión admin, publicar, precio por hora, precio consumible, disponibilidad, reserva, pagos, liquidaciones, Espot Directo, CRM, reservas externas, calendario, Pro + activación manual, notificaciones, tarjeta digital, responsive. RLS/permisos verificados por rol.

## 14. Orden recomendado de ejecución
F1 código muerto sin datos → F2 imports/helpers/componentes/duplicados → F3 rutas/navegación obsoleta → F4 flujos viejos de UI → F5 actions/APIs obsoletas → F6 deps/env → F7 notificaciones → **[respaldar + migrar 29 espacios]** → F8 DB (sin DROP hasta respaldo+migración) → F9 simplificación → F10 QA completo.
