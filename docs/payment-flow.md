# Flujo de Pagos — Espot

## Resumen
Espot usa **Azul Payments** (gateway dominicano, modelo PaymentPage) para procesar
todos los cobros. El cliente paga a Espot, Espot retiene el 10% y transfiere el 90%
al host después del evento.

---

## Gateway: Azul Payments — PaymentPage
El modelo PaymentPage redirige al cliente a una página hosteada por Azul para
ingresar sus datos de tarjeta. Espot nunca maneja datos de tarjeta directamente.

```
Cliente → Espot → [redirect] → Azul (página segura) → callback → Espot
```

### Seguridad
- Firma HMAC-SHA512 en cada request/response
- Verificación del `AuthHash` de Azul antes de confirmar cualquier reserva
- IsoCode "00" = aprobado, cualquier otro = rechazado

---

## Plan de Cuotas Automático

El sistema calcula automáticamente el plan según los días al evento:

| Días al evento | Modelo | Cuotas |
|----------------|--------|--------|
| < 7 días | `100` — Pago único | 1 cuota: 100% al confirmar |
| 7–30 días | `50_50` | C1: 50% hoy · C2: 50% 48h antes |
| 31–60 días | `30_70` | C1: 30% hoy · C2: 70% 48h antes |
| > 60 días | `25_50_25` | C1: 25% hoy · C2: 50% (60d antes) · C3: 25% (48h antes) |

Los montos se redondean al peso. La última cuota absorbe diferencias de redondeo.

---

## Flujo Completo

### Paso 1: Cliente crea reserva
```
POST /lib/actions/booking.ts → createBooking()
  ↓
Validaciones:
  - Fecha no pasada
  - capacity_min ≤ guestCount ≤ capacity_max
  - Horario dentro del rango permitido
  - No hay booking conflictivo (double-booking check)
  - Amount > 0
  ↓
INSERT bookings (status: 'pending')
  ↓
Emails: tplSolicitudCliente + tplSolicitudHost
```

### Paso 2: Host acepta
```
POST /lib/actions/booking.ts → acceptBooking()
  ↓
UPDATE bookings SET status = 'accepted'
  ↓
createInstallments(bookingId, eventDate, totalAmount)
  → buildSchedule() calcula cuotas según días
  → INSERT booking_installments
  ↓
Email: tplAceptadaCliente
```

### Paso 3: Cliente paga (primera cuota)
```
Cliente visita /pago/[bookingId]
  ↓
Detecta próxima cuota pendiente
Valida amount > 0
  ↓
GET /api/payments/redirect/[bookingId]?amount=X&cuota=Y
  ↓
buildPaymentPageFields({
  amount, itbis: 0, orderNumber, bookingId, cuotaId
})
  → Calcula HMAC-SHA512
  → Construye HTML form con campos ocultos
  → Auto-submit → Azul PaymentPage
```

### Paso 4: Azul confirma
```
Cliente aprueba tarjeta en Azul
  ↓
Azul redirige al ApprovedUrl: /pago/exitoso?b=[id]&[azul_params]
  ↓
Cliente POSTea params a /api/payments/confirm
  ↓
Verificaciones:
  1. IsoCode === "00"
  2. verifyResponseHash(azulParams) — HMAC válido
  3. Booking existe y pertenece al usuario
  4. No fue procesado antes (idempotencia)
  ↓
UPDATE bookings:
  status: 'confirmed'
  payment_status: 'advance' | 'partial' | 'paid'
  paid_amount: acumulado
  azul_order_id, azul_auth_code, azul_response_code
  payout_status: 'pending'
  ↓
UPSERT liquidaciones
INSERT payments
  ↓
Emails: tplConfirmadaCliente + tplConfirmadaHost
```

### Paso 5: Cuotas subsiguientes
```
Cliente visita /pago/[bookingId]
  ↓
Detecta próxima cuota pendiente (installment_number ascendente)
Repite Paso 3-4 con cuotaId específico
  ↓
markInstallmentPaid(cuotaId)
  ↓
UPDATE payment_status:
  - Si quedan cuotas → 'partial'
  - Si todas pagadas → 'paid'
```

### Paso 6: Recordatorios automáticos (Cron)
```
Diario 9am RD (13:00 UTC) — /api/cron/payment-reminders
  ↓
getUpcomingInstallments(7d) → reminder_7d_sent = false
  → Enviar tplRecordatorioCuota
  → markReminderSent(id, '7d')
  ↓
getUpcomingInstallments(1d) → reminder_1d_sent = false
  → Enviar tplRecordatorioCuota
  → markReminderSent(id, '1d')
  ↓
Reservas con evento mañana → tplRecordatorioEvento
  ↓
Reservas con evento ayer → tplSolicitudResena (si no hay reseña)
  ↓
Bookings pending > 48h → recordatorio al host (SLA)
```

---

## Estados del Pago

| `payment_status` | Significado |
|-----------------|-------------|
| `null` / `unpaid` | Sin pagos registrados |
| `advance` | Primera cuota pagada, quedan más |
| `partial` | Más de una cuota pagada, no todas |
| `paid` | Todas las cuotas pagadas |

### Función helper
```typescript
// src/lib/bookingConfig.ts
export function isPaid(status: string | null): boolean {
  return status === 'paid' || status === 'partial'
}
```

---

## Liquidaciones (Payouts al Host)

### Proceso
1. Cada reserva confirmada genera un registro en `liquidaciones`
2. Estado inicial: `pendiente`
3. Equipo de Espot transfiere manualmente vía banco
4. Admin marca como `pagada` en el panel + genera email `tplLiquidacion`

### Cálculo
```
Total cliente: RD$60,000
Comisión Espot (10%): RD$6,000
Neto al host: RD$54,000
```

---

## Casos de Error

| Error | Comportamiento |
|-------|----------------|
| IsoCode ≠ "00" | Redirect a /pago/fallido con código |
| HMAC inválido | Log error, return 400 — NO confirmar |
| Amount = 0 | Redirect a /dashboard/reservas |
| Booking no existe | Redirect a /dashboard/reservas |
| Booking ya confirmado | Return { success: true, already: true } |
| Email falla | Promise.allSettled — no bloquea pago |

---

## Variables de Entorno Requeridas
```env
AZUL_MERCHANT_ID=          # ID del comercio en Azul
AZUL_PRIVATE_KEY=          # Clave privada para HMAC-SHA512
AZUL_MERCHANT_NAME=        # Nombre del comercio
AZUL_MERCHANT_TYPE=        # ECommerce
NEXT_PUBLIC_SITE_URL=      # Base URL para callbacks
AZUL_RETURN_BASE_URL=      # URL de retorno registrada en Azul (puede diferir)
```

---

## Pendiente
- **Fix HMAC en producción:** El campo order puede tener una diferencia en el orden
  de campos que Azul espera. Pendiente respuesta de soporte técnico de Azul RD.
  Referencia: `src/lib/azul/client.ts` — comentario interno.
