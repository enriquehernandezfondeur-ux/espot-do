-- ============================================================
-- 042 — Plantillas de mensajes del host para el chat de Espot (F3)
--
-- Todo se comunica DENTRO de Espot (no WhatsApp). El host guarda mensajes
-- reutilizables (confirmar disponibilidad, pedir anticipo, etc.) y los inserta
-- en el chat con un clic. Reemplaza las respuestas rápidas clavadas en
-- localStorage por plantillas editables y persistidas.
--
-- Aditivo e idempotente. El push NO aplica SQL — correr a mano en Supabase.
-- ============================================================

create table if not exists host_message_templates (
  id         uuid primary key default gen_random_uuid(),
  host_id    uuid not null references profiles(id) on delete cascade,
  body       text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_message_templates_host on host_message_templates (host_id, position);

alter table host_message_templates enable row level security;

create policy "message_templates_host_only" on host_message_templates
  for all using (host_id = auth.uid()) with check (host_id = auth.uid());

comment on table host_message_templates is 'Plantillas de mensaje del host para el chat interno de Espot.';
