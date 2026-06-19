-- 032_prevent_double_booking.sql · Espot 2.0
-- Constraint atómico anti-sobre-reserva: impide DOS reservas que se solapan en
-- horario para el MISMO espacio. Hoy la validación es read-then-insert (sin
-- atomicidad) → dos requests concurrentes pueden colarse ambas.
--
-- ⚠️ APLICAR CON CUIDADO Y EN ESTE ORDEN:
--   1) Correr el PRE-CHECK de abajo. DEBE devolver 0 filas. Si devuelve filas,
--      hay solapamientos YA existentes en producción que hay que resolver a mano
--      ANTES de crear el constraint (si no, el ALTER falla).
--   2) Recién entonces, correr el bloque de creación.
--
-- Estados que "ocupan" el horario = todos EXCEPTO rejected/cancelled_*
-- (igual criterio que la app: booking.ts usa `.not('status','in', rejected/cancelled)`).
-- Cruce de medianoche: si end_time <= start_time, el fin es del día siguiente.
-- NOTA: single_booking_per_day NO lo cubre este constraint (eso bloquea por DÍA,
-- no por solape de horas); se sigue validando en la app.

-- ── PRE-CHECK (correr primero; debe devolver 0 filas) ───────────────────────
-- select a.id, b.id, a.space_id, a.event_date
-- from bookings a
-- join bookings b
--   on a.space_id = b.space_id
--  and a.id < b.id
--  and a.status not in ('rejected','cancelled_guest','cancelled_host')
--  and b.status not in ('rejected','cancelled_guest','cancelled_host')
--  and tsrange(a.event_date + a.start_time,
--              a.event_date + a.end_time + case when a.end_time <= a.start_time then interval '1 day' else interval '0' end)
--   && tsrange(b.event_date + b.start_time,
--              b.event_date + b.end_time + case when b.end_time <= b.start_time then interval '1 day' else interval '0' end);

-- ── CREACIÓN (solo tras pre-check en 0) ─────────────────────────────────────
create extension if not exists btree_gist;

alter table bookings drop constraint if exists bookings_no_overlap;
alter table bookings add constraint bookings_no_overlap
  exclude using gist (
    space_id with =,
    tsrange(
      (event_date + start_time),
      (event_date + end_time + case when end_time <= start_time then interval '1 day' else interval '0' end)
    ) with &&
  )
  where (status not in ('rejected','cancelled_guest','cancelled_host'));

-- DOWN (reversión):
-- alter table bookings drop constraint if exists bookings_no_overlap;
