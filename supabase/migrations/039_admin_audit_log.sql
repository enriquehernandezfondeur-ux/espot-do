-- ============================================================
-- 039 — Audit log transversal del panel admin
-- (Auditoría 2026-06-20: acciones sensibles sin rastro).
--
-- Registra quién hace acciones privilegiadas (otorgar rol admin, aprobar/rechazar
-- propietarios, publicar/verificar/destacar espacios, resolver disputas).
-- Solo suscripciones tenía auditoría; esto la generaliza.
--
-- El push NO aplica SQL — correr a mano en el SQL Editor de Supabase.
-- ============================================================

create table if not exists admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references profiles(id) on delete set null,
  action      text not null,        -- 'change_role' | 'approve_application' | 'reject_application' | 'update_space_status' | 'resolve_dispute' | ...
  target_type text,                 -- 'user' | 'space' | 'application' | 'dispute'
  target_id   text,
  detail      text,                 -- descripción legible (ej. "rol guest → admin")
  created_at  timestamptz not null default now()
);

create index if not exists idx_admin_audit_created on admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_target  on admin_audit_log (target_type, target_id);

-- RLS: la tabla se escribe/lee solo con service-role desde server actions de admin.
alter table admin_audit_log enable row level security;
-- (sin policies → solo service-role accede; el panel admin ya usa service-role)

comment on table admin_audit_log is 'Bitácora de acciones sensibles del panel admin. Escrito por logAdminAction (service-role).';
