-- ============================================================
-- 20260625_external_event_payments_gating
-- Cierra el hueco de la auditoría 2026-06-25: external_event_payments (pagos de
-- Espot Directo) tenía RLS ON pero una sola política permisiva
-- `external_event_payments_host_only` (FOR ALL, host_id = auth.uid(), SIN
-- is_pro_host) → un host Normal podía INSERT/UPDATE/DELETE sus pagos por la API
-- REST directa, saltándose la server action gated (addEventPayment usa requirePro).
--
-- Este cambio reemplaza esa política por el patrón de 029_espot_directo_gating.sql:
--   lectura libre del dueño (preview) / escritura solo Pro (is_pro_host()).
-- De paso versiona el DDL real de la tabla (gobernanza).
--
-- Idempotente: en producción es un no-op de esquema (la tabla ya existe) y solo
-- recompone las políticas. Verificado contra prod (VERIF_external_event_payments_2026-06-25.sql).
-- ============================================================

-- (a) Versionado del esquema — calcado a prod (no-op si la tabla ya existe)
create table if not exists public.external_event_payments (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.external_events(id) on delete cascade,
  host_id        uuid not null references public.profiles(id) on delete cascade,
  amount         numeric not null check (amount > 0),
  payment_method text default 'efectivo'
                 check (payment_method = any (array['efectivo','transferencia','tarjeta','otro'])),
  payment_date   date not null,
  notes          text,
  is_deposit     boolean default false,
  created_at     timestamptz default now(),
  receipt_url    text
);

-- (b) RLS de respaldo: lectura libre / escritura solo Pro
alter table public.external_event_payments enable row level security;

-- Borrar la política permisiva legacy (FOR ALL sin is_pro_host) y cualquier otra
drop policy if exists "external_event_payments_host_only"   on public.external_event_payments;
drop policy if exists "external_event_payments_select_own"  on public.external_event_payments;
drop policy if exists "external_event_payments_write_pro"   on public.external_event_payments;
drop policy if exists "external_event_payments_update_pro"  on public.external_event_payments;
drop policy if exists "external_event_payments_delete_pro"  on public.external_event_payments;

-- Lectura libre del dueño (vista previa para hosts Normal)
create policy "external_event_payments_select_own" on public.external_event_payments
  for select using (host_id = auth.uid());

-- Escritura solo Pro (mismo criterio que external_events / host_clients en 029)
create policy "external_event_payments_write_pro" on public.external_event_payments
  for insert with check (host_id = auth.uid() and is_pro_host());

create policy "external_event_payments_update_pro" on public.external_event_payments
  for update using (host_id = auth.uid() and is_pro_host())
  with check (host_id = auth.uid() and is_pro_host());

create policy "external_event_payments_delete_pro" on public.external_event_payments
  for delete using (host_id = auth.uid() and is_pro_host());

-- DOWN (reversión manual): restaurar la política permisiva previa y borrar las 4 nuevas:
--   drop policy if exists "external_event_payments_select_own" on public.external_event_payments;
--   drop policy if exists "external_event_payments_write_pro"  on public.external_event_payments;
--   drop policy if exists "external_event_payments_update_pro" on public.external_event_payments;
--   drop policy if exists "external_event_payments_delete_pro" on public.external_event_payments;
--   create policy "external_event_payments_host_only" on public.external_event_payments
--     for all using (host_id = auth.uid()) with check (host_id = auth.uid());
