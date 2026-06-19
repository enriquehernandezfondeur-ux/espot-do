-- 031_space_clicks.sql · Espot 2.0 (F6b)
-- Tracking de clics de intención (ej. pulsar "Reservar") por espacio y día.
-- Espeja space_views. Escritura solo por service-role (API). Lectura: dueño/admin.
create table if not exists space_clicks (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references spaces(id) on delete cascade,
  click_date  date not null,
  click_type  text not null default 'book_intent',
  click_count int  not null default 0,
  unique (space_id, click_date, click_type)
);
create index if not exists idx_space_clicks_space on space_clicks(space_id);

alter table space_clicks enable row level security;
drop policy if exists "space_clicks_select_host" on space_clicks;
create policy "space_clicks_select_host" on space_clicks
  for select using (
    is_admin() or exists (select 1 from spaces s where s.id = space_id and s.host_id = auth.uid())
  );
-- Sin policy de escritura: solo service-role (la ruta /api/spaces/click) puede insertar/actualizar.

-- DOWN (reversión manual):
-- drop table if exists space_clicks;
