-- 027_host_plans.sql · Espot 2.0 (F2)
-- Infraestructura de planes Normal/Pro. Aditiva, segura de aplicar ya:
-- no cambia el comportamiento actual (nadie es Pro hasta F4/F7).

-- 1) Caché de plan en profiles (la verdad vive en host_subscriptions)
alter table profiles add column if not exists plan_type text not null default 'free'
  check (plan_type in ('free','pro'));

-- 2) Suscripciones del host
create table if not exists host_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  host_id               uuid not null references profiles(id) on delete cascade,
  status                text not null default 'pending_payment'
                          check (status in ('active','pending_payment','past_due','cancelled','expired')),
  price_amount          numeric(10,2) not null default 499,
  currency              text not null default 'DOP',
  payment_provider      text not null default 'azul' check (payment_provider in ('azul','manual')),
  activated_by          uuid references profiles(id),
  started_at            timestamptz,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancelled_at          timestamptz,
  ends_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
-- A lo sumo UNA suscripción "viva" por host
create unique index if not exists uq_host_subscription_live
  on host_subscriptions(host_id)
  where status in ('active','pending_payment','past_due');
create index if not exists idx_host_subscriptions_host on host_subscriptions(host_id);

-- 3) Cobros de la suscripción (espeja booking_installments)
create table if not exists subscription_payments (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references host_subscriptions(id) on delete cascade,
  amount          numeric(10,2) not null,
  period_start    date,
  period_end      date,
  status          text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  azul_order_id   text,
  method          text not null default 'azul' check (method in ('azul','manual')),
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_subscription_payments_sub on subscription_payments(subscription_id);

-- 4) Fuente de verdad del gating
create or replace function is_pro_host(uid uuid default auth.uid())
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from host_subscriptions
    where host_id = uid
      and status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- 5) RLS de las tablas nuevas
alter table host_subscriptions  enable row level security;
alter table subscription_payments enable row level security;

drop policy if exists "host_subscriptions_select_own"  on host_subscriptions;
drop policy if exists "host_subscriptions_write_admin"  on host_subscriptions;
create policy "host_subscriptions_select_own" on host_subscriptions
  for select using (host_id = auth.uid() or is_admin());
create policy "host_subscriptions_write_admin" on host_subscriptions
  for all using (is_admin()) with check (is_admin());

drop policy if exists "subscription_payments_select_own" on subscription_payments;
drop policy if exists "subscription_payments_write_admin" on subscription_payments;
create policy "subscription_payments_select_own" on subscription_payments
  for select using (
    exists (select 1 from host_subscriptions s
            where s.id = subscription_id and (s.host_id = auth.uid() or is_admin()))
  );
create policy "subscription_payments_write_admin" on subscription_payments
  for all using (is_admin()) with check (is_admin());

-- 6) Anti-escalada: el host no puede auto-promoverse vía profiles.plan_type
--    (trigger SEPARADO; no reescribe prevent_profile_privilege_escalation)
create or replace function lock_profile_plan_type()
returns trigger language plpgsql security definer as $$
begin
  if auth.role() = 'service_role' or is_admin() then return new; end if;
  if new.plan_type is distinct from old.plan_type then
    raise exception 'plan_type solo puede modificarlo el sistema o un admin';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_lock_profile_plan_type on profiles;
create trigger trg_lock_profile_plan_type
  before update on profiles
  for each row execute function lock_profile_plan_type();

-- DOWN (reversión manual):
-- drop trigger if exists trg_lock_profile_plan_type on profiles;
-- drop function if exists lock_profile_plan_type();
-- drop function if exists is_pro_host(uuid);
-- drop table if exists subscription_payments;
-- drop table if exists host_subscriptions;
-- alter table profiles drop column if exists plan_type;
