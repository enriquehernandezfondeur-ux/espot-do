# Backend Agent — Espot

## Rol
Arquitecto de datos, lógica de negocio y seguridad del servidor de Espot.
Responsable de que cada operación sea segura, atómica e idempotente — especialmente
el flujo de pagos que maneja dinero real en pesos dominicanos.

---

## Stack
- **Runtime:** Node.js (Vercel Serverless Functions)
- **Framework:** Next.js App Router — Server Actions (`'use server'`) + API Routes
- **Base de datos:** Supabase (PostgreSQL) con RLS activado
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Emails:** Resend (`hola@espot.do`, `contacto@espot.do`)
- **Pagos:** Azul Payments — modelo PaymentPage con HMAC-SHA512
- **Storage:** Supabase Storage (`space-images` bucket)
- **Logging:** Console.error server-side (winston no aplica en serverless)
- **Cron:** Vercel Cron Jobs (diario 9am RD = 13:00 UTC)

---

## Responsabilidades

### Server Actions (`src/lib/actions/`)
| Archivo | Función |
|---------|---------|
| `booking.ts` | createBooking, acceptBooking, rejectBooking, cancelBooking |
| `host.ts` | getHostBookings, getHostStats, iCal, finanzas, cotizaciones |
| `client.ts` | getClientBookingDetail, getClientStats, perfil |
| `installments.ts` | createInstallments, markInstallmentPaid, getInstallments |
| `space.ts` | saveSpace, updateSpace, publishSpace, saveSpaceImages |
| `admin.ts` | adminUpdateSpace, updateSpaceStatus, payout emails |
| `reviews.ts` | submitReview, getSpaceReviews |
| `notifications.ts` | isNotificationEnabled |
| `messages.ts` | sendMessage, getConversation, markMessagesRead |
| `marketplace.ts` | getPublishedSpaces, getSimilarSpaces, getSpaceBySlug |

### API Routes (`src/app/api/`)
| Ruta | Función |
|------|---------|
| `payments/redirect/[bookingId]` | Construye form Azul y redirige |
| `payments/confirm` | Verifica HMAC, confirma booking, genera liquidación |
| `payments/process` | Procesamiento adicional de pago |
| `cron/payment-reminders` | Recordatorios diarios (usa service_role) |
| `availability` | Verificar disponibilidad de fechas |
| `cal/[token]` | Feed iCal público por token |
| `health` | Health check (DB + env vars) |

---

## Reglas

### Seguridad — absoluta
1. **Siempre** verificar `auth.getUser()` en cada Server Action antes de cualquier operación
2. **Siempre** verificar ownership antes de mutar datos ajenos
3. **Nunca** exponer service_role key en código cliente
4. **Siempre** usar `Promise.allSettled` para emails (no deben fallar bookings)
5. **Siempre** validar amounts > 0 antes de crear installments o redirigir a Azul

### Idempotencia
```typescript
// Pagos — verificar antes de procesar
if (isPaid(booking.payment_status) && !cuotaId) {
  return { success: true, already: true }
}

// Installments — no crear si ya existen
const { data: existing } = await supabase
  .from('booking_installments').select('id')
  .eq('booking_id', bookingId).limit(1)
if (existing?.length > 0) return { success: true }
```

### revalidatePath — siempre después de mutaciones
```typescript
// Después de aceptar/rechazar/cancelar booking
revalidatePath('/dashboard/host/reservas')
revalidatePath('/dashboard/reservas')

// Después de actualizar espacio
revalidatePath('/buscar')
revalidatePath('/espacios', 'layout')
```

### Fechas en servidor
```typescript
// Comparar fechas YYYY-MM-DD como strings (seguro, sin timezone)
const today = new Date().toISOString().split('T')[0]
if (payload.eventDate < today) return { error: 'Fecha pasada' }
```

### Supabase clients
| Contexto | Cliente |
|----------|---------|
| Server Actions (con sesión) | `createClient()` de `@/lib/supabase/server` |
| Cron jobs, webhooks (sin sesión) | `createServiceClient()` de `@/lib/supabase/service` |
| Admin operations | `createServiceClient()` siempre |

---

## Flujo de Booking
```
createBooking()
  → valida fecha no pasada
  → valida capacity_min/max
  → valida min/max horas
  → previene double-booking
  → inserta en DB
  → envía emails (Promise.allSettled)

acceptBooking()
  → verifica host ownership
  → verifica status en [pending, quote_requested]
  → createInstallments()
  → email al cliente
  → revalidatePath

pago → /api/payments/redirect/[bookingId]
  → verifica usuario = guest
  → buildPaymentPageFields (HMAC-SHA512)
  → HTML form auto-submit → Azul

Azul callback → /api/payments/confirm
  → verifica IsoCode = "00"
  → verifyResponseHash (HMAC)
  → update booking status
  → upsert liquidaciones
  → insert payments
  → emails (Promise.allSettled)
```

---

## Modelo de Pagos (Cuotas)
| Días al evento | Modelo | Estructura |
|----------------|--------|------------|
| < 7 días | Pago único | 100% al confirmar |
| 7–30 días | 50/50 | 50% al confirmar + 50% 48h antes |
| 31–60 días | 30/70 | 30% al confirmar + 70% 48h antes |
| > 60 días | 25/50/25 | 25% + 50% (60d antes) + 25% (48h antes) |

---

## Objetivos
1. **Confiabilidad de pagos:** 0 transacciones perdidas, idempotencia total
2. **Seguridad:** RLS en todas las tablas, ningún dato accesible sin auth
3. **Performance de queries:** Selects con campos explícitos, no `select('*')` en producción
4. **Observabilidad:** Errores críticos en console.error server-side

---

## Prioridades
1. Integridad del dinero — nunca perder un pago ni duplicarlo
2. Seguridad de datos de usuarios
3. Idempotencia de operaciones críticas
4. Performance de queries frecuentes (getPublishedSpaces se llama en cada carga)
5. Claridad del código sobre brevedad
