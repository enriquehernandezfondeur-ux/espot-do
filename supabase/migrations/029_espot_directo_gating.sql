-- 029_espot_directo_gating.sql · Espot 2.0 (F5)
-- (a) Amplía los canales de origen de reservas externas (Espot Directo).
-- (b) Gating de RESPALDO (defense-in-depth): la lectura del dueño sigue libre
--     (vista previa), pero crear/editar/borrar external_events y host_clients
--     requiere Pro. El guard PRIMARIO es requirePro() en las server actions
--     (cubre además a miembros de equipo, que escriben por service-role).
--
-- ⚠️ APLICAR JUNTO CON EL DEPLOY DEL CÓDIGO F5: al aplicarse, los hosts
--    gratuitos dejan de poder ESCRIBIR estas tablas (sus datos se conservan y
--    siguen siendo legibles). La UI de vista previa explica el porqué.

-- ── (a) Canales de origen ───────────────────────────────────
alter table external_events drop constraint if exists external_events_source_check;
alter table external_events add constraint external_events_source_check
  check (source in (
    'espot','whatsapp','instagram','telefono','recomendacion',
    'directo','referido','redes','otro'
  ));

-- ── (b) host_clients: lectura libre / escritura Pro ─────────
drop policy if exists "host_clients_host_only"  on host_clients;
drop policy if exists "host_clients_select_own" on host_clients;
drop policy if exists "host_clients_write_pro"  on host_clients;
drop policy if exists "host_clients_update_pro" on host_clients;
drop policy if exists "host_clients_delete_pro" on host_clients;

create policy "host_clients_select_own" on host_clients
  for select using (host_id = auth.uid());
create policy "host_clients_write_pro" on host_clients
  for insert with check (host_id = auth.uid() and is_pro_host());
create policy "host_clients_update_pro" on host_clients
  for update using (host_id = auth.uid() and is_pro_host())
  with check (host_id = auth.uid() and is_pro_host());
create policy "host_clients_delete_pro" on host_clients
  for delete using (host_id = auth.uid() and is_pro_host());

-- ── (b) external_events: lectura libre / escritura Pro ──────
drop policy if exists "external_events_host_only"   on external_events;
drop policy if exists "external_events_select_own"  on external_events;
drop policy if exists "external_events_write_pro"   on external_events;
drop policy if exists "external_events_update_pro"  on external_events;
drop policy if exists "external_events_delete_pro"  on external_events;

create policy "external_events_select_own" on external_events
  for select using (host_id = auth.uid());
create policy "external_events_write_pro" on external_events
  for insert with check (host_id = auth.uid() and is_pro_host());
create policy "external_events_update_pro" on external_events
  for update using (host_id = auth.uid() and is_pro_host())
  with check (host_id = auth.uid() and is_pro_host());
create policy "external_events_delete_pro" on external_events
  for delete using (host_id = auth.uid() and is_pro_host());

-- DOWN (reversión manual): restaurar las policies FOR ALL originales y el CHECK
-- anterior de source ('directo','referido','redes','otro').
