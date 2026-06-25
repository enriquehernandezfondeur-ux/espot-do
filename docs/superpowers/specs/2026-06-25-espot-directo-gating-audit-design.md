# Auditoría de blindaje — Espot Directo (función Pro) · 2026-06-25

## Objetivo

Auditar el gating de extremo a extremo de **Espot Directo** y cerrar **solo** los
huecos que falten. No se reconstruye nada: la función ya existe y ya está gated en
su mayor parte. Esta es una auditoría de seguridad defensiva con fixes mínimos.

## Definición de "Espot Directo" (alcance exacto a gated)

Conjunto de funciones **exclusivas de Espot Pro** para gestionar eventos y clientes
fuera del marketplace:

- **Eventos externos** — `external_events` (crear/editar/borrar/cambiar estado).
- **Pagos de eventos externos** — `external_event_payments` (registrar/borrar abonos).
- **CRM de clientes propios** — `host_clients` (crear/editar/borrar).
- **Captación pública** — microsite `/h/[slug]`, tarjeta digital `/t/[slug]`,
  formulario público de leads (`createFromPublicForm`).

**El plan Normal conserva solo:** eventos por marketplace (`bookings`) y **vista
previa de solo lectura** de lo anterior. La lectura del dueño queda libre a propósito
(preview); solo la **escritura** requiere Pro.

## Principio de diseño

Defensa en profundidad: **ninguna capa puede ser la única barrera**.
1. **UI** — candado/upsell + submit deshabilitado (cosmético, no es barrera real).
2. **Server action** — `requirePro()` / `isHostProById()` (barrera primaria; cubre
   también a miembros de equipo que escriben por service-role).
3. **RLS** — `is_pro_host()` en las tablas (barrera de respaldo ante la API REST directa).

## Estado verificado (capa → ¿bloquea sin Pro? → archivo)

| Capa | ¿Bloquea sin Pro? | Archivo |
|---|---|---|
| Server action eventos (5 escrituras) | ✅ | `src/lib/actions/external-events.ts` (`requirePro()`) |
| Server action CRM (create/update/delete/unified) | ✅ | `src/lib/actions/clients.ts` (`requirePro()`) |
| Server action lead público | ✅ | `external-events.ts` `createFromPublicForm` (`isHostProById`) |
| RLS `external_events` | ✅ | `supabase/migrations/029_espot_directo_gating.sql` |
| RLS `host_clients` | ✅ | `029_espot_directo_gating.sql` |
| RLS `external_event_payments` | ✅ (tras fix) | `supabase/migrations/20260625_external_event_payments_gating.sql` — Hueco #1 cerrado |
| Página pública `/t/[slug]` | ✅ | `isHostProById` → `notFound()` |
| Página pública `/h/[slug]` | ✅ | `getHostPublicProfile` → null → `notFound()` |
| UI eventos / eventos-nuevo / clientes / finanzas | ✅ | `ProUpsell` + `canSubmit` deshabilitado |
| UI agenda (panel de evento Directo) | ✅ (tras fix) | `agenda/page.tsx` `DirectPanel` — ProUpsell + oculta abono/estado/eliminar — Hueco #2 cerrado |
| UI calendario | ✅ N/A | Solo lectura; sin ruta de escritura |

Un barrido de `src` confirma que **no hay escrituras directas** a tablas de Directo
fuera de las server actions gated (único match: un `.select()` en `admin-pro.ts`).

## Huecos a cerrar

### Hueco #1 — `external_event_payments` sin RLS `is_pro_host()` (y sin versionar) · ALTO

**Riesgo:** la action `addEventPayment`/`deleteEventPayment` está gated, pero la capa
de respaldo (RLS) no existe para esta tabla. Un host **Normal** podría, vía la API REST
directa de Supabase (`POST/DELETE /rest/v1/external_event_payments`), escribir abonos de
Directo saltándose la action. Si la RLS estuviera permisiva u OFF, además habría riesgo
de IDOR entre hosts. El servidor no debe ser la única barrera.

**Enfoque (verificar → luego fix):**
1. Correr query de **solo lectura** para conocer el estado real de la RLS de
   `external_event_payments` en prod (¿RLS habilitado?, ¿qué políticas?, ¿columnas?).
2. Con el resultado, escribir migración **idempotente** calcada al patrón de 029:
   - `enable row level security`
   - `drop policy if exists` de las políticas legacy detectadas
   - `select_own` → `host_id = auth.uid()` (lectura libre, preview)
   - `write_pro` / `update_pro` / `delete_pro` → `host_id = auth.uid() AND is_pro_host()`
   - De paso, **versionar** el DDL real de la tabla (gobernanza; igual que el resto de
     tablas de Directo).

**Prueba de bloqueo:**
- Host **Normal** autenticado → `INSERT`/`DELETE` REST directo a `external_event_payments`
  devuelve `42501 new row violates row-level security policy`.
- Host **Pro** → la misma operación pasa.
- La action `addEventPayment` sigue funcionando para Pro y sigue devolviendo el error
  "Esta función es exclusiva de Espot Pro." para Normal (test de regresión).

### Hueco #2 — agenda sin candado visual · BAJO (cosmético)

**Riesgo:** UX, no seguridad — el abono ya está bloqueado en server. Un host Normal ve el
botón "registrar pago" en `agenda` y al pulsarlo recibe un error en vez de un upsell.

**Fix mínimo:** en `src/app/dashboard/host/agenda/page.tsx`, gatear el form de abono con
`isPro === false` (ocultar el botón o mostrar `ProUpsell`), consistente con `eventos`.

**Prueba:** host Normal en agenda no ve el form de abono (o ve upsell); host Pro lo ve.

## Fuera de alcance (YAGNI)

- Reescribir o rediseñar Espot Directo.
- Tocar las capas ya verificadas como correctas (029, server actions, páginas públicas, UI de eventos/clientes/finanzas).
- Refactors no relacionados.

## Gobernanza

- No push/commit/deploy automático. Las migraciones se entregan listas; el dueño decide
  cuándo aplicarlas en Supabase (el push a Vercel no aplica SQL).
- No ejecutar SQL destructivo en prod.

## Entregables finales

1. Tabla "capa → ¿bloquea sin Pro? → archivo" (actualizada tras el fix).
2. Lista de huecos encontrados (este doc).
3. Fixes aplicados con sus tests (migración #1 + verificación; UI #2 + test).
