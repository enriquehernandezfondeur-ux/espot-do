-- A-1 (auditoría seguridad 2026-06-26): token de pago no adivinable para eventos
-- directos (Espot Directo). Hoy /pago/evento/[eventId] usa el id crudo del evento,
-- y getExternalEventForPayment() devuelve datos bancarios (cuenta + cédula/RNC) vía
-- service-role (bypassa RLS) sin token ni expiración. Un id filtrado expone PII
-- financiera del host. Con un payment_token dedicado, el id interno deja de ser la
-- llave del enlace público.
--
-- ⚠️ APLICAR A MANO en el SQL Editor de Supabase (el push NO corre SQL). Idempotente.
-- Tras aplicar, avísame y recableo el código:
--   1) getExternalEventForPayment(token) → .eq('payment_token', token)
--   2) ruta /pago/evento/[eventId] → /pago/evento/[token]
--   3) los enlaces de pago que comparte el host usan payment_token, no el id
--   4) (opcional) dejar de exponer cedula_or_rnc si no es imprescindible para transferir

create extension if not exists pgcrypto;

alter table external_events
  add column if not exists payment_token uuid not null default gen_random_uuid();

-- Backfill defensivo: filas viejas que pudieran tener el default sin generar.
update external_events set payment_token = gen_random_uuid() where payment_token is null;

create unique index if not exists uniq_external_events_payment_token
  on external_events (payment_token);
