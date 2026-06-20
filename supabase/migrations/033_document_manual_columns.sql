-- ============================================================
-- 033 — Versiona columnas que se aplicaron a mano en Supabase
-- (deuda de migración detectada en la auditoría 2026-06-19).
--
-- TODO es `ADD COLUMN IF NOT EXISTS`: en producción es un NO-OP (las columnas
-- ya existen); su único efecto es que un entorno NUEVO/staging quede idéntico
-- a producción sin aplicar SQL manual. Seguro de correr siempre.
-- Tipos derivados de los datos reales en prod y del uso en el código
-- (src/lib/actions/space.ts, src/types/index.ts, marketplace queries).
-- ============================================================

-- ── spaces ──────────────────────────────────────────────────
alter table spaces add column if not exists is_featured          boolean not null default false;
alter table spaces add column if not exists primary_activity     text;
alter table spaces add column if not exists secondary_activities text[] not null default '{}';

-- ── space_conditions: amenidades (has_*) ────────────────────
alter table space_conditions add column if not exists has_parking        boolean not null default false;
alter table space_conditions add column if not exists has_valet_parking  boolean not null default false;
alter table space_conditions add column if not exists has_wifi           boolean not null default false;
alter table space_conditions add column if not exists has_ac             boolean not null default false;
alter table space_conditions add column if not exists has_sound_system   boolean not null default false;
alter table space_conditions add column if not exists has_projector      boolean not null default false;
alter table space_conditions add column if not exists has_dance_floor    boolean not null default false;
alter table space_conditions add column if not exists has_outdoor_area   boolean not null default false;
alter table space_conditions add column if not exists has_pool           boolean not null default false;
alter table space_conditions add column if not exists has_kitchen        boolean not null default false;
alter table space_conditions add column if not exists has_bar            boolean not null default false;
alter table space_conditions add column if not exists has_stage          boolean not null default false;
alter table space_conditions add column if not exists has_cyclorama      boolean not null default false;
alter table space_conditions add column if not exists has_natural_light  boolean not null default false;
alter table space_conditions add column if not exists has_generator      boolean not null default false;
alter table space_conditions add column if not exists has_dressing_room  boolean not null default false;
alter table space_conditions add column if not exists chairs_count       integer;
alter table space_conditions add column if not exists tables_count       integer;
alter table space_conditions add column if not exists bathrooms_count    integer;

-- ── space_conditions: permisos (allows_*) ───────────────────
alter table space_conditions add column if not exists allows_live_music  boolean not null default false;
alter table space_conditions add column if not exists allows_dj          boolean not null default false;
alter table space_conditions add column if not exists allows_children    boolean not null default false;
alter table space_conditions add column if not exists allows_parties     boolean not null default false;
alter table space_conditions add column if not exists allows_corporate   boolean not null default false;

-- ── space_conditions: limpieza y horas extra ───────────────
alter table space_conditions add column if not exists cleaning_included  boolean not null default false;
alter table space_conditions add column if not exists cleaning_fee       numeric(10,2);
alter table space_conditions add column if not exists overtime_allowed   boolean not null default false;
alter table space_conditions add column if not exists overtime_price     numeric(10,2);

-- ── space_pricing ───────────────────────────────────────────
alter table space_pricing add column if not exists package_includes  text[];
alter table space_pricing add column if not exists extra_hour_price   numeric(10,2);
