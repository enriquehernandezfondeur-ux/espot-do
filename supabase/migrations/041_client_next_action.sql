-- ============================================================
-- 041 — Próxima acción / recordatorio por cliente del CRM (F3)
--
-- El corazón de un CRM: el host anota la siguiente acción de seguimiento con un
-- cliente y su fecha, y la ve en una cola en su Inicio. Hasta ahora no había
-- ningún campo de "próxima acción".
--
-- Aditivo e idempotente. El push NO aplica SQL — correr a mano en Supabase.
-- ============================================================

alter table host_clients add column if not exists next_action      text;
alter table host_clients add column if not exists next_action_date  date;

create index if not exists idx_host_clients_next_action
  on host_clients (host_id, next_action_date) where next_action_date is not null;

comment on column host_clients.next_action      is 'Próxima acción de seguimiento del host con este cliente (CRM).';
comment on column host_clients.next_action_date is 'Fecha de la próxima acción; alimenta la cola de seguimientos del Inicio.';
