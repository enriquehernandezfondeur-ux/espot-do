-- ============================================================
-- 038 — Pago manual de cuotas de reservas Espot
-- (Plan F2; Azul no está integrado → los cobros se registran a mano).
--
-- Guarda cómo se cobró una cuota fuera de Azul (transferencia/efectivo/otro) y
-- una referencia opcional (nº de transferencia). El estado/monto de la reserva
-- se sigue derivando de booking_installments (computePaymentState).
--
-- Aditivo e idempotente: NO-OP si ya existen. El push NO aplica SQL — correr a
-- mano en el SQL Editor de Supabase.
-- ============================================================

alter table booking_installments add column if not exists payment_method    text;
alter table booking_installments add column if not exists payment_reference text;

comment on column booking_installments.payment_method    is 'Cómo se cobró la cuota fuera de Azul: transferencia | efectivo | otro. NULL = pagada por Azul o no pagada.';
comment on column booking_installments.payment_reference is 'Referencia opcional del pago manual (nº de transferencia, etc.).';

-- DOWN (reversión manual):
-- alter table booking_installments drop column if exists payment_method;
-- alter table booking_installments drop column if exists payment_reference;
