-- ============================================================
-- 20260625_conversation_hides — Versionado de `conversation_hides`
-- (Gobernanza 2026-06-25: la tabla existía en runtime sin migración en
--  el repo. Refleja EXACTAMENTE el esquema de prod para auditabilidad y
--  para poder recrearla en una DB limpia.)
--
-- Modelo: una fila oculta una conversación para `user_id`. `other_id`
-- identifica al otro participante de esa conversación; si es NULL (filas
-- legacy) oculta TODAS las conversaciones del espacio. El índice único
-- (user_id, space_id, other_id) permite ocultar por conversación sin
-- chocar con el legacy (NULLs son distintos en un índice único de PG).
-- Emparejado con src/lib/actions/messages.ts (hideConversation/getMyConversations).
--
-- Idempotente: en producción es un no-op; en una base nueva crea todo.
-- ============================================================

create table if not exists public.conversation_hides (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  space_id   uuid not null,
  hidden_at  timestamptz default now(),
  other_id   uuid
);

-- Columna añadida en una iteración posterior (no-op si ya existe)
alter table public.conversation_hides add column if not exists other_id uuid;

-- Único por (usuario, espacio, otro participante)
create unique index if not exists uniq_conv_hide
  on public.conversation_hides (user_id, space_id, other_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.conversation_hides enable row level security;

-- Cada usuario gestiona solo sus propias filas
drop policy if exists "users manage own hides" on public.conversation_hides;
create policy "users manage own hides"
  on public.conversation_hides for all
  to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());
