-- ============================================================
-- 040 — Notas internas del host por reserva (CRM, F3)
--
-- El host ya tiene notas a nivel de cliente y de evento externo, pero NO a nivel
-- de reserva Espot. Permite anotar contexto operativo ("cliente pidió cambiar
-- decoración", "confirmar headcount el viernes") en cada reserva.
--
-- Aditivo e idempotente. El push NO aplica SQL — correr a mano en Supabase.
-- ============================================================

alter table bookings add column if not exists host_notes text;

comment on column bookings.host_notes is 'Notas internas del propietario sobre la reserva (no visibles para el cliente).';
