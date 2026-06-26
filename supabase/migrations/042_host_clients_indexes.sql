-- ============================================================
-- 042 — Índices y unicidad para host_clients (escala CRM)
--
-- Auditoría 2026-06-26 (preparación para ~500 hosts): el CRM filtra SIEMPRE por
-- host_id y deduplica clientes por email, pero la tabla sólo tenía el índice
-- parcial de next_action (041). Esto añade:
--   1. Índice por host_id  → toda lista/búsqueda del CRM (getUnifiedClients,
--      searchClients, getClientWithHistory, getUpcomingFollowups) acota por él.
--   2. Unicidad case-insensitive por (host_id, email)  → cierra la carrera del
--      chequeo de duplicados de createClient_ a nivel de base (el chequeo en la
--      app sólo da el mensaje amable; la base es la fuente de verdad).
--
-- Aditivo e idempotente. El push NO aplica SQL — correr a mano en el SQL Editor
-- de Supabase de Espot. Revisar antes de aplicar.
-- ============================================================

create index if not exists idx_host_clients_host_id
  on host_clients (host_id);

-- ⚠️ Si ya existieran emails duplicados (mismo host, distinta caja) este índice
--    fallaría al crearse. Detectarlos primero:
--    select host_id, lower(email) e, count(*)
--    from host_clients where email is not null
--    group by host_id, lower(email) having count(*) > 1;
--    Resolver los duplicados (fusionar/borrar) antes de crear el índice único.
create unique index if not exists uniq_host_clients_host_email
  on host_clients (host_id, lower(email))
  where email is not null;

comment on index uniq_host_clients_host_email is
  'Un cliente por email (case-insensitive) por host. Respalda el de-dup de createClient_.';
