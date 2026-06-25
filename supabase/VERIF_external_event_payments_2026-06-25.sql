-- Solo lectura. Estado de external_event_payments para diseñar el RLS de Directo.
-- Correr en el SQL Editor de Supabase (proyecto Espot) y pegar los 4 bloques.

-- 1) ¿RLS habilitado?
select 'rls' as bloque, relname as tabla,
       case when relrowsecurity then 'RLS ON' else '⛔ RLS OFF' end as estado
from pg_class where relname = 'external_event_payments';

-- 2) Políticas actuales (nombre, comando, expresiones)
select 'policy' as bloque, policyname, cmd,
       qual as using_expr, with_check as check_expr
from pg_policies
where schemaname = 'public' and tablename = 'external_event_payments'
order by cmd, policyname;

-- 3) Columnas reales (para versionar el DDL idéntico a prod)
select 'column' as bloque, ordinal_position, column_name, data_type,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'external_event_payments'
order by ordinal_position;

-- 4) FKs / índices / constraints
select 'constraint' as bloque, conname,
       case contype when 'p' then 'PK' when 'f' then 'FK' when 'u' then 'UNIQUE'
            when 'c' then 'CHECK' else contype::text end as tipo,
       pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.external_event_payments'::regclass
order by tipo;
