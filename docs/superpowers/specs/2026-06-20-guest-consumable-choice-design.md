# Elección de consumible por el cliente al reservar

**Fecha:** 2026-06-20 · **Estado:** diseño aprobado · **Tipo:** feature marketplace + booking

## Problema

Hoy `space_pricing.is_consumable` (solo para precio `hourly`) es un ajuste **fijo del host**: el monto por horas cubre *solo el uso del espacio* **o** es *consumible* (crédito de A&B). El propietario quiere que el **cliente** pueda **elegir al reservar** entre ambas modalidades, cuando el host lo permita.

## Decisiones de producto (tomadas con el dueño)

1. **Mismo precio, distinto destino.** La elección NO cambia la tarifa. Solo cambia qué incluye el monto: en *consumible* todo el dinero se aplica a A&B el día del evento; en *uso del espacio* cubre el alquiler. El host necesita conocer la elección para asignar (o no) el crédito.
2. **El host lo activa por espacio.** El selector actual del editor (binario) gana una 3ª opción "El cliente elige". El host mantiene control: puede forzar una modalidad o delegar la decisión al cliente.
3. **Solo aplica a precio `hourly`.** `minimum_consumption` es consumible por naturaleza; `fixed_package`/`custom_quote` quedan fuera.

## Enfoque elegido: A — aditivo y mínimo

Se descartó el enum `consumable_mode` (B) porque obligaría a migrar datos y refactorizar todos los lectores de `is_consumable` (tarjeta, widget, detalle, pricing.ts) → más riesgo, contra la regla de cambios mínimos de Espot.

## Diseño

### 1. Datos (migración aditiva, idempotente — patrón de la 033)
- `space_pricing.consumable_optional boolean not null default false` — opt-in del host. Solo se honra cuando `pricing_type = 'hourly'`.
- `bookings.is_consumable boolean` — la elección efectiva fijada al reservar. NULL para reservas no-hourly o previas.

Semántica resultante por espacio (hourly):
| consumable_optional | is_consumable (pricing) | Comportamiento |
|---|---|---|
| false | false | Siempre "uso del espacio" (actual) |
| false | true  | Siempre "consumible" (actual) |
| true  | (default presentado) | El cliente elige al reservar |

### 2. pricing.ts (fuente única)
`PricingSummary.consumption` gana el valor `'optional'`. `summarizePricing` lo devuelve cuando `pricing_type==='hourly' && consumable_optional===true`. No cambia ningún cálculo (`computeBasePrice` sigue ignorando el consumo). `consumptionLabel(boolean)` se reutiliza para los textos.

### 3. Editor del host (`dashboard/host/espacio/page.tsx`)
El selector "¿Qué incluye el precio?" pasa de 2 a 3 tarjetas:
- *Solo uso del espacio* → `consumable_optional=false, is_consumable=false`
- *Solo consumible* → `consumable_optional=false, is_consumable=true`
- *El cliente elige* → `consumable_optional=true` (is_consumable guarda el valor por defecto que verá pre-seleccionado el cliente: "uso del espacio")

Estado del editor: se reemplaza el booleano `isConsumable` por un modo derivado (`'space' | 'consumable' | 'choice'`) mapeado a las dos columnas al guardar/cargar.

### 4. Reserva (`BookingWidget` + `createBooking`)
- **Widget:** si `pricing.consumable_optional && isHourly`, renderiza un selector binario (Uso del espacio / Consumible) con `consumptionLabel` de explicación; default = "uso del espacio". El precio mostrado **no cambia** con la elección. Si no es opcional, comportamiento actual intacto.
- **createBooking:** acepta `isConsumable?: boolean` en el payload y lo persiste en `bookings.is_consumable`. Validación servidor: la elección solo se respeta si el `space_pricing` es hourly y `consumable_optional=true`; en otro caso se fija el valor del host (`is_consumable` de la tarifa) o NULL.

### 5. Visibilidad de la elección
- **Host** — detalle de la reserva: muestra "El cliente eligió: Consumible / Uso del espacio" para que sepa si asignar crédito de A&B.
- **Cliente** — su detalle de reserva/confirmación: refleja lo que eligió.
- *(Emails/WhatsApp: fuera del MVP, follow-up.)*

### 6. Tarjeta / detalle del marketplace
Cuando `consumption==='optional'`, la tarjeta muestra un pill neutro ("Tú eliges") en vez de afirmar una modalidad. El detalle del espacio indica que el cliente elige al reservar. Sin cambios de precio ni del cálculo de "Desde".

## Testing
- `pricing.test.ts`: `summarizePricing` devuelve `consumption:'optional'` con `consumable_optional=true` (hourly), y mantiene `'space'/'consumable'` en los casos fijos; el mínimo (`minTotal`) no cambia.
- `createBooking`: rechaza/ignora una elección de consumible cuando el espacio no la permite; persiste la elegida cuando sí.

## Fuera de alcance (YAGNI)
- Precios distintos por modalidad (decidido: mismo precio).
- Elección en `fixed_package`/`custom_quote`.
- Notificaciones email/WhatsApp de la modalidad elegida.
