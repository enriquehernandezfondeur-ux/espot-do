-- ════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN DE MIGRACIONES CRÍTICAS — Espot · 2026-06-25
-- ════════════════════════════════════════════════════════════════════════
-- Solo LECTURA. No modifica nada. Pegar en el SQL Editor de Supabase (proyecto
-- Espot) y revisar la columna "estado" de cada bloque. Donde diga FALTA → aplicar
-- la migración correspondiente del repo (supabase/migrations/) a mano.
-- El push a Vercel NO aplica SQL.
-- ════════════════════════════════════════════════════════════════════════


-- ── 1. Migración 021 — RLS WITH CHECK (bloqueo financiero / anti-IDOR) ──────
-- Esperado: deben existir triggers que exoneran service_role y bloquean que el
-- cliente toque campos financieros. Si devuelve 0 filas → 021 NO aplicada (CRÍTICO).
select '021 — triggers financieros' as chequeo,
       coalesce(string_agg(tgname, ', '), '⛔ FALTA — aplicar 021') as estado
from pg_trigger
where not tgisinternal
  and (tgname ilike '%financial%' or tgname ilike '%lock%' or tgname ilike '%role%'
       or tgname ilike '%host_status%');

-- Políticas UPDATE con WITH CHECK en las tablas de dinero (deben aparecer todas)
select '021 — políticas RLS dinero' as chequeo,
       polrelid::regclass::text as tabla,
       polname,
       case when polwithcheck is not null then '✅ con WITH CHECK'
            else '⚠️ sin WITH CHECK' end as estado
from pg_policy
where polrelid::regclass::text in
      ('bookings','payments','liquidaciones','booking_installments','profiles')
  and polcmd in ('w','*')          -- w = UPDATE, * = ALL
order by tabla, polname;


-- ── 2. Migración 032 — constraint anti-overbooking (solape de horas) ────────
-- Esperado: 1 fila con la constraint EXCLUDE. Si 0 filas → 032 NO aplicada.
select '032 — constraint no-overlap' as chequeo,
       coalesce(string_agg(conname, ', '), '⛔ FALTA — aplicar 032 (correr PRE-CHECK antes)') as estado
from pg_constraint
where conrelid = 'bookings'::regclass and contype = 'x';   -- x = EXCLUDE


-- ── 3. Migración 023 — single_booking_per_day (espacios exclusivos por día) ──
select '023 — single booking/día' as chequeo,
       coalesce(string_agg(indexname, ', '), '⚠️ no presente') as estado
from pg_indexes
where tablename = 'bookings'
  and (indexname ilike '%single%' or indexname ilike '%per_day%' or indexname ilike '%active_booking%');


-- ── 4. Gobernanza — tablas en runtime sin migración versionada ──────────────
-- messages y conversation_hides existen en prod pero no tienen .sql en el repo.
-- Exportar su DDL (incl. RLS) y versionarlo. Aquí solo confirmamos que existen y
-- si tienen RLS habilitado.
select '04 — tablas sin versionar' as chequeo,
       c.relname as tabla,
       case when c.relrowsecurity then '✅ RLS on' else '⛔ RLS OFF' end as estado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('messages','conversation_hides');

-- Para exportar el DDL de esas tablas (correr y copiar el resultado a una migración):
--   select 'conversation_hides' as t, column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name in ('messages','conversation_hides') order by t, ordinal_position;


-- ── 5. Bug conversation_hides — ¿ya tiene la columna other_id? ───────────────
-- Sin other_id, ocultar UNA conversación esconde TODAS las del mismo espacio.
select '05 — conversation_hides.other_id' as chequeo,
       case when exists (
         select 1 from information_schema.columns
         where table_name = 'conversation_hides' and column_name = 'other_id'
       ) then '✅ columna presente (se puede hacer el fix de código)'
       else '⛔ FALTA other_id — el bug sigue activo' end as estado;
