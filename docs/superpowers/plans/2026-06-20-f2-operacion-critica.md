# Espot F2 — Operación crítica · Plan de implementación

> **Para workers:** ejecutar tarea por tarea con verificación. Steps en checkbox.

**Goal:** Permitir registrar pagos manuales de reservas Espot (Azul NO integrado → es el camino real del dinero), mostrar el balance pendiente por reserva, y unificar la definición de "Por pagar". (Audit log admin + unificar gestión Pro quedan como F2-bis.)

**Architecture:** La fuente de verdad del pago de una reserva Espot son sus `booking_installments`. Se extrae la lógica de cálculo (paid_amount + payment_status + balance) a un módulo **puro y testeable** (`booking-balance.ts`), reutilizado por: la nueva acción de pago manual, el balance del cliente, y la unificación de "Por pagar". NO se toca el camino de confirmación de Azul (es dinero que ya funciona) — solo se añade la ruta manual encima de `markInstallmentPaid`.

**Tech:** Next.js, TypeScript, Supabase (service-role para escritura), Jest.

**Regla:** variables de tema, no push automático. Money code: verificar con tests unitarios de la lógica pura + tsc/build + revisión.

---

### Task 1 — Módulo puro de balance/estado de pago (`booking-balance.ts`) + tests
Fuente única para: paid_amount, payment_status, y balance (total/pagado/pendiente) a partir de las cuotas. Replica la lógica del confirm de Azul (`'paid'` si todas pagadas, `'partial'` si >1, `'advance'` si ≥1, `'unpaid'` si 0) y añade el balance.

- Create `src/lib/booking-balance.ts`, Test `src/lib/__tests__/booking-balance.test.ts`.
- Funciones: `computePaymentState(installments)` → `{ paidAmount, paymentStatus }`; `bookingBalance({ totalAmount, paidAmount })` → `{ total, paid, pending }`.

### Task 2 — Migración: método/referencia de pago manual en cuotas
- `036`→ siguiente nº: `038_installment_manual_payment.sql`: `ADD COLUMN IF NOT EXISTS payment_method text`, `payment_reference text` en `booking_installments` (aditivo, idempotente). Push no aplica SQL → correr a mano.

### Task 3 — Acción `recordManualInstallmentPayment` (host/admin)
- En `installments.ts`: marca la cuota pagada (patrón de `markInstallmentPaid`: auth host/guest/admin, service-role, lock `neq status paid`), guarda `payment_method`/`payment_reference`/`paid_at`, y **recomputa** el booking (`paid_amount`/`payment_status` vía `computePaymentState`). Devuelve `{success}`.

### Task 4 — UI "Registrar pago" en el detalle de reserva del host
- En `dashboard/host/reservas/[id]`: por cada cuota `pending/overdue`, botón "Registrar pago" → modal (método: transferencia/efectivo/otro; referencia opcional) → llama la acción → refresca.

### Task 5 — Tarjeta de balance por reserva (cliente)
- Componente `BalanceCard` usando `bookingBalance`. Mostrar en el detalle de reserva del cliente ("Pagaste RD$X de RD$Y · faltan RD$Z").

### Task 6 — Unificar "Por pagar"
- Usar `bookingBalance`/`computePaymentState` como definición única en overview, pagos y el badge del sidebar (misma semántica: monto pendiente de cuotas).

## F2-bis (siguiente plan)
- Audit log transversal admin (tabla + wiring en cambios de rol, aprobaciones, publicar/verificar, disputas).
- Retirar `adminSetHostPlan` (gestión Pro duplicada en usuarios/[id]).
