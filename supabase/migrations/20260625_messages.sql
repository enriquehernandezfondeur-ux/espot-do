-- ============================================================
-- 20260625_messages — Versionado de la tabla `messages`
-- (Gobernanza 2026-06-25: la tabla existía en runtime sin migración
--  en el repo. Este archivo refleja EXACTAMENTE el esquema de prod —
--  exportado de information_schema/pg_constraint/pg_policies — para que
--  su RLS sea auditable y se pueda recrear en una DB limpia.)
--
-- Idempotente: en producción es un no-op (todo ya existe); en una base
-- nueva crea la tabla, FKs, RLS y políticas idénticas a las de prod.
-- ============================================================

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid references public.bookings(id),
  quote_id        uuid references public.quotes(id),
  space_id        uuid not null references public.spaces(id),
  sender_id       uuid not null references public.profiles(id),
  receiver_id     uuid not null references public.profiles(id),
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz default now(),
  attachment_url  text,
  attachment_type text,
  attachment_name text
);

-- Columnas añadidas en iteraciones posteriores (no-op si ya existen)
alter table public.messages add column if not exists attachment_url  text;
alter table public.messages add column if not exists attachment_type text;
alter table public.messages add column if not exists attachment_name text;

-- ── RLS ──────────────────────────────────────────────────────
alter table public.messages enable row level security;

-- Insertar: solo como uno mismo (no suplantar emisor)
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
  on public.messages for insert
  with check (sender_id = auth.uid());

-- Leer: emisor, receptor o admin
drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
  on public.messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid() or is_admin());

-- Actualizar: solo el emisor o un admin (no reasignar el mensaje)
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
  on public.messages for update
  using      (sender_id = auth.uid() or is_admin())
  with check (sender_id = auth.uid() or is_admin());

-- Índices recomendados (no existen hoy en prod; descomentar si se
-- quieren acelerar las consultas por participante de getMyConversations):
-- create index if not exists idx_messages_sender   on public.messages (sender_id);
-- create index if not exists idx_messages_receiver on public.messages (receiver_id);
-- create index if not exists idx_messages_space    on public.messages (space_id);
