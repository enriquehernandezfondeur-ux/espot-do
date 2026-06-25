# Auditoría 2026-06-18 — Pendientes que requieren Supabase (aplicar a mano)

> El push a Vercel **no** aplica SQL. Estos cambios deben correrse manualmente en el
> SQL Editor de Supabase del proyecto Espot. Revisar antes de aplicar.

> **Actualización 2026-06-25 (re-auditoría — verificada contra la DB de prod):**
> Se corrió `supabase/VERIFICACION_2026-06-25.sql` en producción. Resultado:
> - ✅ **Punto 1 (021 RLS WITH CHECK) — RESUELTO.** Aplicada completa (Parte A y B). Los 4
>   triggers existen (`trg_lock_booking_financials`, `trg_lock_installment_paid`,
>   `trg_prevent_profile_escalation`, `trg_lock_profile_plan_type`). Las 3 políticas que el
>   verificador marca "SIN WITH CHECK" (`profiles`, `bookings`, `booking_installments`) son
>   correctas así **por diseño**: se protegen con trigger (compara OLD vs NEW), no con WITH CHECK.
> - ✅ **Punto 2 (anti-overbooking) — RESUELTO.** Constraint EXCLUDE `no_overlap_active_booking`
>   activo en `bookings`. Migración versionada: `032_prevent_double_booking.sql`.
> - ✅ **Punto 3 (conversation_hides) — RESUELTO.** La columna `other_id` existe en prod y el
>   código ya la usa (`src/lib/actions/messages.ts`: filtro por `space_id:other_id`, upsert con
>   `onConflict user_id,space_id,other_id`). La nota de "código sin aplicar" quedó obsoleta.
> - ✅ **Punto 4 (versionar `messages`/`conversation_hides`) — RESUELTO.** Se exportó el DDL real
>   de prod (columnas, FKs, índices, RLS) y se versionó en `supabase/migrations/20260625_messages.sql`
>   y `20260625_conversation_hides.sql` (idempotentes; no-op en prod, recrean todo en una DB limpia).
> - **Migración 038**: no falta nada. Era `038_installment_manual_payment.sql`, de un feature
>   **revertido** (`817bc83` → revert `b8fd04f`, 2026-06-20). Salto 037→039 esperado.
> - Build de producción y suite de tests (139) en verde al 2026-06-25.

## 1. CRÍTICO — Verificar/aplicar migración 021 (RLS WITH CHECK)
La memoria del proyecto indica que `021_rls_with_check.sql` podría estar **pendiente**.
Sin ella, un cliente autenticado podría (vía API REST directa de Supabase) marcar su
reserva como `payment_status='paid'` o `total_amount=0`. El código de la app ya escribe
lo financiero con service-role, así que **aplicar 021 es seguro y no rompe nada**.

Verificación (correr en Supabase; debe devolver filas para bookings/payments/installments):
```sql
-- ¿Existen los triggers/políticas de bloqueo financiero?
select tgname, tgrelid::regclass as tabla
from pg_trigger
where tgname ilike '%lock%financial%' or tgname ilike '%financial%';

select polname, polrelid::regclass as tabla, polcmd
from pg_policy
where polrelid::regclass::text in ('bookings','payments','liquidaciones','booking_installments');
```
Si faltan los triggers/políticas de 021 Parte A y B → aplicar `supabase/migrations/021_rls_with_check.sql`.

## 2. ALTO — Constraint anti-overbooking (cerrar la carrera TOCTOU)
`createBooking` valida disponibilidad con read-then-write; dos reservas simultáneas del
mismo slot pueden colarse. El código ya rechaza el caso normal; esto es el cinturón de
seguridad a nivel BD. **Revisar contra el esquema real antes de aplicar.**

```sql
-- Requiere la extensión btree_gist
create extension if not exists btree_gist;

-- Opción A — espacios exclusivos por día (single_booking_per_day):
-- un solo booking activo por (space_id, event_date).
create unique index if not exists uniq_active_booking_per_day
on bookings (space_id, event_date)
where status not in ('rejected','cancelled_guest','cancelled_host');
--   ⚠️ Solo aplicar si NINGÚN espacio permite múltiples reservas por hora el mismo día.
--   Si hay reservas por hora, NO usar este índice (bloquearía slots legítimos);
--   en su lugar evaluar una restricción EXCLUDE por rango horario (más compleja,
--   requiere normalizar start_time/end_time a un rango y manejar cruce de medianoche).
```

## 3. ALTO/MEDIO — `conversation_hides` por `(user_id, space_id)` borra todas las conversaciones del espacio
Hoy ocultar/borrar una conversación esconde **todas** las del mismo espacio (el host pierde
clientes legítimos). Requiere columna `other_id` + cambio de código emparejado
(`hideConversation` y el filtro en `getMyConversations`). **No apliqué el código todavía
porque rompería hasta tener la columna.** Pasos coordinados:

```sql
alter table conversation_hides add column if not exists other_id uuid;
-- backfill opcional: las filas viejas quedan con other_id null (ocultan todo el espacio,
-- comportamiento actual). Nuevas inserciones deben incluir other_id.
-- Nuevo índice único:
alter table conversation_hides drop constraint if exists conversation_hides_user_id_space_id_key;
create unique index if not exists uniq_conv_hide on conversation_hides (user_id, space_id, other_id);
```
Tras aplicar, avísame y hago el cambio de código (`hideConversation(spaceId, otherId)` +
filtro por `(space_id, other_id)`).

## 4. Gobernanza — tablas sin migración versionada
`messages` y `conversation_hides` existen en runtime pero no tienen migración en el repo.
Recomendado: exportar su DDL real desde Supabase y versionarlo en `supabase/migrations/`
para que su RLS sea auditable.
