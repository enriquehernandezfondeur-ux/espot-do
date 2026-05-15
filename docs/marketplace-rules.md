# Reglas del Marketplace — Espot

## Para Propietarios (Hosts)

### Publicar un espacio
- Registro gratuito — Espot cobra solo cuando se concreta una reserva
- El espacio pasa revisión humana antes de publicarse (< 24h en horario laboral)
- Requisitos mínimos: nombre, descripción, capacidad máxima, precio, al menos 1 foto
- Fotos deben ser reales y actuales del espacio — no renders ni stock photos
- Precio debe ser el precio real cobrado en la plataforma (no precio de lista inflado)

### Gestión de reservas
- Las solicitudes deben responderse en < 48h (SLA). Espot envía reminder a las 48h.
- Si el host no responde en 72h, la solicitud puede cancelarse automáticamente
- El host puede habilitar "Reserva instantánea" para confirmación automática al pago
- El host puede bloquear fechas en su calendario para cualquier razón

### Lo que el host NO puede hacer
- Pedir pagos directamente al cliente fuera de la plataforma
- Cobrar precios diferentes a los publicados en Espot para la misma reserva
- Cancelar reservas confirmadas sin causa justificada (afecta rating)
- Bloquear fechas que ya tienen reservas confirmadas
- Contactar a clientes para sacarlos de la plataforma

### Políticas de cancelación
Cada host elige su política al publicar:

| Política | Reembolso si cancela el cliente |
|----------|--------------------------------|
| Flexible | 100% si cancela > 72h antes |
| Moderada | 50% si cancela > 7 días antes, 0% después |
| Estricta | 0% — no hay reembolso |

### Comisión
- **10%** sobre el total confirmado de cada reserva
- Se deduce proporcionalmente de cada cuota pagada
- El 90% neto se transfiere después del evento vía transferencia bancaria
- La cuenta bancaria del host debe estar verificada antes de recibir pagos

---

## Para Clientes (Guests)

### Buscar y reservar
- Los espacios son gratuitos de browsear — no se requiere cuenta para ver listados
- Para enviar una solicitud de reserva se requiere cuenta verificada
- Los precios mostrados incluyen el consumo mínimo o precio base total
- La reserva se confirma solo cuando el pago es aprobado por Azul

### Plan de pagos
El plan se genera automáticamente según la anticipación:
- **< 7 días:** Pago completo al confirmar (100%)
- **7–30 días:** 50% al confirmar + 50% 48h antes
- **31–60 días:** 30% al confirmar + 70% 48h antes
- **> 60 días:** 25% → 50% (60d antes) → 25% (48h antes)

### Cancelaciones por el cliente
- Aplica la política de cancelación del espacio (visible antes de confirmar)
- Espot deduce su comisión del 10% sobre pagos ya procesados
- El reembolso se gestiona directamente con el propietario según su política

### Lo que el cliente NO puede hacer
- Pagar directamente al host sin pasar por Espot
- Usar el espacio fuera del horario y fechas contratadas
- Exceder la capacidad máxima del espacio

---

## Reglas de Reseñas

### Quién puede dejar una reseña
- Solo clientes con reservas en estado `completed` o cuya fecha haya pasado y estén `confirmed`
- La reserva NO puede estar cancelada ni rechazada
- Solo una reseña por reserva (constraint único en base de datos)
- El evento debe haber ocurrido (event_date < hoy)

### Contenido de reseñas
- Rating de 1 a 5 estrellas (obligatorio)
- Comentario opcional (texto libre)
- Las reseñas son visibles públicamente en la página del espacio
- Las reseñas se marcan como públicas (`is_public: true`) por defecto

### Respuesta del host
- El host puede responder a cada reseña una vez
- Las respuestas son visibles bajo la reseña original
- No se pueden editar respuestas después de publicadas

---

## Reglas de Mensajería

### Chat en la plataforma
- Los mensajes son privados entre cliente y host
- Solo los participantes (sender/receiver) pueden ver la conversación
- Adjuntos permitidos: imágenes (JPG/PNG/GIF/WebP), documentos (PDF, DOC)
- Tamaño máximo por archivo: 20MB

### Prohibiciones en el chat
- No compartir datos de contacto para pagos externos (email de transferencia, etc.)
- No coordinar reservas fuera de la plataforma

---

## Verificación de Espacios

### Proceso
1. Host publica espacio → estado `pendiente de revisión`
2. Equipo Espot verifica: fotos reales, precio razonable, descripción precisa
3. Si aprueba → `is_published: true` + email de activación al host
4. Si rechaza → email con motivo, host puede corregir y reenviar

### Criterios de rechazo
- Fotos de baja calidad, genéricas o de stock
- Precio irreal (demasiado bajo como gancho, demasiado alto sin justificación)
- Información de contacto fuera de la plataforma en la descripción
- Espacio que no existe o no es de quien publica

### Badge "Verificado"
Los espacios verificados muestran el badge verde en las cards y en el detalle.
Esto indica que Espot ha confirmado que el espacio es real y la información es precisa.

---

## Disputas y Soporte

### Tipos de disputa
1. **Espacio diferente al publicado:** Cliente llega y el espacio no coincide con las fotos
2. **Cancelación injustificada del host:** Host cancela después de confirmar
3. **Comportamiento indebido del cliente:** Daños, exceso de capacidad

### Proceso de disputa
1. Cliente o host reporta vía `contacto@espot.do` o chat de soporte
2. Equipo Espot investiga en < 48h hábiles
3. Decisión basada en evidencia (fotos, mensajes, historial)
4. Resolución puede incluir reembolso parcial/total o sanción al host

---

## Sanciones

| Infracción | Consecuencia |
|------------|--------------|
| Pago fuera de plataforma | Suspensión de cuenta |
| Cancelación injustificada (host) | Reducción de rating + advertencia |
| Daños al espacio (cliente) | Cargo adicional + posible ban |
| Reseñas falsas | Eliminación de reseña + advertencia |
| Información falsa en listado | Despublicación inmediata |
| Reincidencia de cualquier infracción | Ban permanente |
