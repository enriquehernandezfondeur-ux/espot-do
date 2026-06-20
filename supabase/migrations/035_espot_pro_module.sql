-- ============================================================
-- 035 — Modelo de datos del módulo Espot Pro (prueba gratuita,
-- estados ampliados, auditoría y notificaciones).
-- Aditiva e idempotente. Aplicar antes de desplegar la UI del módulo.
-- ============================================================

-- ── host_subscriptions: estados ampliados + columnas nuevas ──
-- Amplía el CHECK de status para añadir 'trialing' (prueba) y 'suspended'.
alter table host_subscriptions drop constraint if exists host_subscriptions_status_check;
alter table host_subscriptions add constraint host_subscriptions_status_check
  check (status in ('trialing','active','pending_payment','past_due','cancelled','expired','suspended'));

alter table host_subscriptions add column if not exists activation_type text not null default 'manual'
  check (activation_type in ('trial','manual','azul'));
alter table host_subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table host_subscriptions add column if not exists admin_note text;

-- Índice único "una suscripción viva por host" — ampliado a trialing/suspended.
drop index if exists uq_host_subscription_live;
create unique index if not exists uq_host_subscription_live
  on host_subscriptions(host_id)
  where status in ('trialing','active','pending_payment','past_due','suspended');

-- ── profiles: marca de prueba ya usada (anti-reactivación) ──
alter table profiles add column if not exists pro_trial_used boolean not null default false;

-- ── is_pro_host(): 'trialing' también desbloquea (fuente única con resolvePlan TS) ──
create or replace function is_pro_host(uid uuid default auth.uid())
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from host_subscriptions
    where host_id = uid
      and status in ('active','trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- ── Registro de auditoría de cambios de plan ────────────────
create table if not exists subscription_audit_log (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references profiles(id) on delete cascade,
  subscription_id uuid references host_subscriptions(id) on delete set null,
  admin_id        uuid references profiles(id),
  action          text not null,
  old_status      text,
  new_status      text,
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_sub_audit_host on subscription_audit_log(host_id, created_at desc);
alter table subscription_audit_log enable row level security;
do $$ begin
  create policy sub_audit_admin_read on subscription_audit_log for select using (is_admin());
exception when duplicate_object then null; end $$;
-- Escrituras solo por service_role (las server actions admin); sin policy de insert para usuarios.

-- ── Registro de comunicaciones (anti-duplicado) ─────────────
create table if not exists subscription_notifications (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references profiles(id) on delete cascade,
  subscription_id uuid references host_subscriptions(id) on delete set null,
  event_type      text not null,
  channel         text not null default 'email' check (channel in ('email','whatsapp')),
  status          text not null default 'pending' check (status in ('pending','sent','failed')),
  error           text,
  period_key      text,          -- p.ej. el current_period_end ISO, para dedupe por periodo
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
-- Dedupe: una sola notificación por host + evento + periodo + canal.
create unique index if not exists uq_sub_notif_dedupe
  on subscription_notifications(host_id, event_type, period_key, channel);
create index if not exists idx_sub_notif_host on subscription_notifications(host_id, created_at desc);
alter table subscription_notifications enable row level security;
do $$ begin
  create policy sub_notif_admin_read on subscription_notifications for select using (is_admin());
exception when duplicate_object then null; end $$;

-- ── Config general del módulo (marketplace_config) ──────────
insert into marketplace_config (key, value, label, group_name)
values
  ('pro_auto_trial_enabled', 'false', 'Prueba gratuita automática al registrarse', 'espot_pro'),
  ('pro_trial_days',         '30',    'Duración de la prueba (días)',              'espot_pro'),
  ('pro_price_dop',          '499',   'Precio Espot Pro (RD$/mes)',                'espot_pro')
on conflict (key) do nothing;
