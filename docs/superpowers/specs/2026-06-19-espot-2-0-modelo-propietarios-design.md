# Espot 2.0 — Rediseño del modelo para propietarios (Diseño / Spec)

> Fecha: 2026-06-19 · Estado: **diseño aprobado por el dueño, pendiente de plan de implementación**
> Alcance: solo Fase 1 entregó auditoría + este diseño. **No se ha tocado código.**
> Gobernanza: aditivo y reversible en DB; sin push/commit/deploy automático (ver `CLAUDE.md`). El cobro Pro va por Azul; capa de planes desacoplada del cobro.

---

## 1. Objetivo

Lanzar **Espot 2.0**: dos planes para propietarios (**Normal gratis** / **Espot Pro RD$499/mes**), monetizando con un muro Pro funciones que en buena parte **ya existen** en el código, simplificar el modelo de precios a "por hora" con condición consumible, y destacar 4 categorías estrella sin perder las demás.

**Restricciones (del dueño):** no perder funcionalidades existentes; no cambiar visualmente partes no relacionadas; no borrar datos; no romper reservas actuales; no mezclar reservas directas con reservas cobradas dentro de Espot; mantener cálculos financieros exactos; responsive; probar vistas cliente/propietario/admin; proteger Pro en frontend **y** backend; documentar cada migración; no marcar como terminado sin pruebas reales.

---

## 2. Hallazgo clave de la auditoría

Un esfuerzo previo (`20260524_host_saas_core.sql`) dejó construido **el motor de Espot Directo** sin el muro Pro. Por tanto, el trabajo principal **no** es construir features desde cero, sino: (a) crear la capa de planes/suscripción + gating, (b) conectar el muro Pro a features existentes, (c) completar las piezas faltantes.

| Función Espot 2.0 | Estado hoy | Ubicación |
|---|---|---|
| Reservas externas (registro manual + pagos parciales) | ✅ Existe | `external_events`, `external_event_payments`, `src/lib/actions/external-events.ts`, `dashboard/host/eventos/page.tsx` (518 L) |
| Canal de origen de reserva | ✅ Existe (`source`: directo/referido/redes/otro) | `external_events.source` |
| Calendario unificado interno+externo | ✅ Existe | `dashboard/host/calendario/page.tsx` (759 L) |
| CRM de clientes | ✅ Existe | `host_clients`, `dashboard/host/clientes/page.tsx` (565 L) |
| Estadísticas (visitas, conversión, embudo) | ⚠️ Parcial (no clics) | `src/lib/actions/host-analytics.ts`, `space_views` |
| WhatsApp transaccional (Twilio) | ✅ Existe | `src/lib/whatsapp/send.ts` |
| Página pública del host | ⚠️ Base (`/h/[slug]`, sin QR ni botón WhatsApp) | `src/app/h/[slug]/page.tsx` |
| Google Calendar / iCal sync | ✅ Existe | `src/lib/google-calendar.ts`, `014_ical_calendar.sql` |
| Espacios destacados | ⚠️ Flag sin lógica de boost | `spaces.is_featured` (`007_admin_role.sql:79`) |

**No existe (hay que crear):** cualquier concepto de plan/suscripción; cobro recurrente; gating backend Pro (`is_pro_host()`); tarjeta digital con QR; botón WhatsApp/teléfono público en el detalle; modelo de precio consumible por hora y la simplificación.

---

## 3. Decisiones tomadas (dueño, 2026-06-19)

1. **Cobro Pro por Azul**, diseñado "desde ahora" (sin fecha de julio). Capa de planes **desacoplada del cobro** → admin puede activar/extender Pro manualmente como puente mientras Azul se estabiliza (Azul lleva roto desde 2026-05).
2. **Precio consumible = todo el monto es crédito de consumo** (estilo "mínimo de consumo" de bares/restaurantes). Un solo cálculo por hora + interruptor de presentación `es_consumible`.
3. **Cotización (`custom_quote`):** se quita de la creación de espacios nuevos, se **conserva** para los espacios existentes (marcados para revisión admin). No se pierde la bandeja ni el historial de `quotes`.
4. **Categorías:** añadir las nuevas faltantes (**wellness/bienestar**, **pop-ups/bazares/eventos temporales**), centralizar el catálogo, destacar las 4 (estudios, coworkings, wellness, pop-ups). Se conservan las 11 actuales.
5. **Transición a Pro:** Pro de aquí en adelante con **vista previa** para gratuitos. Datos existentes se conservan en **solo-lectura** si el host no es Pro. Nunca se borra nada.

---

## 4. Definición de los planes

### Plan Normal — Gratis
Publicación de espacios · gestión básica · precio por hora · calendario y disponibilidad · recepción de solicitudes dentro de Espot · aceptar/rechazar reservas · gestión básica de reservas · fotos/descripción/capacidad/amenidades/reglas · servicios adicionales · cobro de comisión 10% cuando la reserva se procesa dentro de Espot.

### Espot Pro — RD$499/mes
Espot Directo (botón WhatsApp/teléfono/formulario) · registro de reservas externas · calendario unificado interno+externo · tarjeta digital del espacio + enlace + QR · badge "Espot Pro" · mayor visibilidad / prioridad en resultados · estadísticas avanzadas (visitas, clics, solicitudes, reservas) · CRM · recordatorios automáticos · más capacidad de fotos/videos · herramientas para compartir · acceso futuro a herramientas exclusivas.

> Límites por plan a confirmar con números exactos en la fase de pricing (ej. fotos: free N vs Pro M). Marcado como TODO de producto, no bloquea la arquitectura.

---

## 5. Esquema de datos (entregable #4)

### Tablas nuevas

**`host_subscriptions`** — fuente de verdad del plan. Sin fila = gratis; fila activa = Pro.
```
id uuid pk
host_id uuid -> profiles(id)
status text check ('active','pending_payment','past_due','cancelled','expired')
price_amount numeric default 499
currency text default 'DOP'
payment_provider text check ('azul','manual')
activated_by uuid -> profiles(id)   -- admin que activó manualmente (nullable)
started_at timestamptz
current_period_start timestamptz
current_period_end timestamptz       -- = fecha del próximo cobro
cancelled_at timestamptz
ends_at timestamptz
created_at, updated_at timestamptz
```

**`subscription_payments`** — log de cada cobro mensual (espeja `booking_installments`).
```
id uuid pk
subscription_id uuid -> host_subscriptions(id)
amount numeric
period_start, period_end date
status text check ('pending','paid','failed','refunded')
azul_order_id text
method text check ('azul','manual')
paid_at timestamptz
created_at timestamptz
```

### Columnas nuevas
- `profiles.plan_type text default 'free' check ('free','pro')` — cache, mantenido por trigger/cron; verdad en `host_subscriptions`.
- `space_pricing.is_consumable boolean default false` — interruptor de presentación.
- `space_pricing.needs_pricing_review boolean default false` — cola de revisión admin (migraciones no automáticas).
- `spaces.direct_contact_enabled boolean default false`, `spaces.show_whatsapp boolean`, `spaces.show_phone boolean`, `spaces.lead_form_enabled boolean` — config Espot Directo (gateada a Pro).
- `spaces.card_token text unique` — token público de la tarjeta digital.
- `external_events.source` — **ampliar CHECK** a `espot|whatsapp|instagram|telefono|recomendacion|directo|referido|redes|otro` (valores viejos conservados; no rompe data).

### Reutilizado sin cambio
`external_events`, `external_event_payments`, `host_clients`, `space_views`, `spaces.is_featured`, triggers anti-escalada (`prevent_profile_privilege_escalation`, `lock_booking_financial_columns`).

### Nota de infraestructura
Hay **dos directorios de migraciones** que se apilan sobre la misma DB: `espot-saas/supabase/migrations/` (base/canónico) y `espot-saas/host-dashboard/supabase/migrations/` (RLS/parches). Documentar el orden canónico de aplicación en cada migración nueva.

---

## 6. Gating Pro (frontend + backend) — entregable #9

- **SQL:** función `is_pro_host()` (molde de `is_admin()` en `019_rls_policies.sql:19-29`). Verifica fila `active` en `host_subscriptions` con `current_period_end > now()`.
- **RLS:** `SELECT` de datos propios **siempre permitido** (vista previa / solo-lectura). `INSERT/UPDATE` en `external_events`, `host_clients` y config Directo **requieren `is_pro_host()`**. Esto implementa "vista previa sin borrar; escritura solo Pro".
- **Server:** helper `requirePro()` en las server actions Pro (verifica suscripción antes de escribir). Un gratuito que llame la API a mano es rechazado en backend.
- **Frontend:** componente `<PlanGate>` + avisos contextuales de upgrade (sin pop-ups agresivos; aparecen en el punto de fricción).
- **Anti-downgrade:** trigger que impide modificar `profiles.plan_type` / `host_subscriptions.status` salvo `service_role`/admin.

---

## 7. Modelo de precios (entregables #3 y #5)

### Cálculo único
`base = precio_hora × horas` (ya en `src/lib/pricing.ts:computeBasePrice`), fin de semana opcional (`weekend_multiplier`), comisión 10% sobre el total (`computePlatformFee`). **`es_consumible` NO cambia el cálculo**, solo el texto que ve el cliente.

### Creación de espacios nuevos
Solo `hourly`. UI: precio/hora · mínimo de horas · máximo opcional · precio fin de semana opcional · toggle **"El precio es consumible"** (todo el monto = crédito de alimentos/bebidas/servicios).

### Legacy
`computeBasePrice` mantiene los 4 casos (`hourly`, `minimum_consumption`, `fixed_package`, `custom_quote`) para que los espacios viejos calculen hasta migrarse. Corregir además la **duplicación de la comisión** en `src/lib/actions/booking.ts:658` (debe usar `computePlatformFee`).

### Presentación (tarjeta de precio del detalle — visible, sin tooltips)
Precio/hora · mínimo de horas · costo estimado según horas elegidas · "Todo consumible en alimentos y bebidas" **o** "Cubre el uso del espacio" · servicios adicionales. Debe verse antes de confirmar la solicitud (BookingWidget y SpaceDetailClient).

---

## 8. Espot Directo + reservas externas (entregable #7)

- **Reutilizado:** registro de reservas externas con pagos parciales, canal de origen, calendario unificado, CRM. → Se **gatean a Pro** (con vista previa) y se **amplían los canales** de `source`.
- **Nuevo:** botón **WhatsApp / teléfono / formulario público** en el detalle del espacio (infra Twilio `src/lib/whatsapp/send.ts` ya existe). Gateado a Pro vía `spaces.direct_contact_enabled`.
- **Anti-conflicto interno↔externo:** el calendario ya bloquea fechas; se refuerza la validación al crear reserva externa contra reservas Espot y bloqueos (`space_availability`).
- **Cada reserva muestra:** tipo (Espot/Directo) · canal de origen · estado · fecha/hora · datos del cliente · monto estimado · **si generó comisión** (Espot sí; Directo no). Las directas **no** se mezclan con las cobradas dentro de Espot (tablas separadas: `bookings` vs `external_events`).

---

## 9. Tarjeta digital (entregable #6 parcial / #8)

Página pública nueva por espacio (`/t/[card_token]`) que **reutiliza los datos del espacio**: nombre · fotos · categoría · ubicación · capacidad · precio/hora · condición de consumo · amenidades · botón "Solicitar fecha" · botón WhatsApp/contacto · enlace para compartir · **QR** (lib `qrcode`). Generación gateada a Pro; visualización pública. Sin duplicar datos: lee de `spaces`.

---

## 10. Suscripción y panel (entregables #6 y #7)

### Flujo de suscripción
1. Host pulsa *Mejorar a Pro* → `/dashboard/host/pro` (comparativa Normal vs Pro, RD$499/mes).
2. Activar → crea `host_subscriptions` (`pending_payment`) → cobro Azul RD$499 → confirma → `active`, periodo 30 días.
3. **Puente admin:** admin puede activar `payment_provider='manual'` con periodo (mientras Azul se estabiliza).
4. **Cron diario:** expira suscripciones vencidas (`current_period_end < now`) → `expired` y `plan_type='free'`; envía recordatorios 7d/3d/1d (WhatsApp/email ya existen).
5. Pantallas **éxito/error/cancelado** (reusan patrón de `/pago`).

### Panel del host
Plan actual · estado de suscripción · próximo cobro · beneficios activos · botón mejorar · resumen de uso de herramientas Pro · reservas Espot vs Directas · visitas/solicitudes · tarjeta digital · config Espot Directo. **Badge Pro** en panel y publicaciones. Para gratuitos: vista previa de herramientas Pro sin bloquear ni deteriorar lo básico.

### Mayor visibilidad
Espacios de hosts Pro ordenados por encima en resultados (sutil), reusando `spaces.is_featured` + plan.

### Avisos de upgrade (inteligentes, no agresivos)
Al intentar: agregar contacto directo · registrar reserva externa · ver stats avanzadas · crear tarjeta digital · obtener mayor visibilidad. Explican el beneficio **antes** de pedir el pago. Ej.: *"Recibe solicitudes directamente por WhatsApp y administra tus reservas externas con Espot Pro por RD$499 al mes."*

---

## 11. Categorías (entregable de migración de categorías)

- Crear catálogo único `src/lib/categories.ts`: `{ value, label, labelPlural, icon, group, featured, order }`. Fuente única de verdad.
- **Añadir:** `wellness` (bienestar), `popup` (pop-ups/bazares/eventos temporales). Ampliar el CHECK de `spaces.category`.
- **Destacar 4 grupos** en captación/home: estudios (podcast/fotografía), coworkings/salas, wellness, pop-ups.
- Reemplazar los **9 mapas duplicados** por imports del catálogo (`buscar/constants.ts`, `dashboard/host/espacio`, `admin/reportes`, `admin/aplicaciones`, `admin/aplicaciones/[id]`, `dashboard/host/solicitud`, `aplicar/AplicarClient`, `HomepageSections`, `i18n/locales/es`).
- Conservar las 11 categorías actuales; resolver la inconsistencia `lounge`/`jardin` (en TS pero no en el CHECK SQL).

---

## 12. Estrategia de migración de datos (entregable #10)

- Migraciones SQL **aditivas**; **ningún `DROP`** en fases tempranas (deprecación de columnas viejas se difiere).
- **Migración de datos** en archivo idempotente con **tabla de respaldo** `space_pricing_backup_pre_espot2`:
  - `minimum_consumption` → `hourly` + `is_consumable=true`, `hourly_price = round(minimum_consumption / session_hours)`. Si falta `session_hours` → `needs_pricing_review=true`.
  - `fixed_package` → `hourly`, `hourly_price = round(fixed_price / package_hours)` → `needs_pricing_review=true`.
  - `custom_quote` → intacto, `needs_pricing_review=true` (sigue funcionando; sale de creación de nuevos).
- **Cola de revisión admin** para lo no migrable automáticamente.
- Toda migración documentada y reversible. El push **no** aplica SQL: el SQL se entrega al dueño para Supabase.

---

## 13. Riesgos y regresiones (entregable #11)

| Riesgo | Mitigación |
|---|---|
| Exactitud del dinero al migrar precios | Respaldo + cola admin + tests de derivación antes de producción |
| Quitar features a hosts gratuitos | Vista previa + cero borrado + solo-lectura de datos existentes |
| Azul roto bloquea cobro Pro | Puente de activación manual por admin |
| Bypass de gating por API | `requirePro()` en backend **y** RLS, no solo UI; tests de bypass |
| CHECK de categorías + 9 mapas duplicados | Centralizar catálogo **primero** (F1) |
| Dos directorios de migraciones | Documentar orden canónico de aplicación |
| Monolitos (BookingWidget 1274 L, BuscarClient 1615 L, SpaceDetailClient 1473 L) | Tests antes de tocar; superficie de cambio mínima |
| Duplicación de comisión `booking.ts:658` | Unificar a `computePlatformFee` durante F3 |

---

## 14. Casos de prueba (entregable #12)

- Cálculo consumible vs no-consumible · fin de semana · mínimo/máximo de horas.
- Derivaciones de migración de precios (minimum_consumption, fixed_package) con casos límite (sin `session_hours`/`package_hours`).
- `is_pro_host`: gratuito bloqueado en escritura, Pro permitido, vista previa lee.
- Máquina de estados de suscripción: activar (Azul/manual), expirar, renovar, cancelar, past_due.
- Canales de origen de reservas externas (enum ampliado).
- Anti-doble-reserva interno↔externo.
- Exactitud de comisión 10% (incluye corrección de `booking.ts:658`).
- Intentos de bypass RLS (gratuito escribiendo external_events/host_clients por API).
- Acceso público de la tarjeta digital (`/t/[card_token]`) + QR.
- Integridad del catálogo de categorías (todos los consumidores leen del único `lib/categories.ts`).

---

## 15. Fases de implementación (entregable de plan por fases)

Cada fase = rama/commits pequeños y verificables (`npx tsc --noEmit` + `npm run build` + `npx jest` en verde). Sin push/commit automático (entrega al dueño para deploy y SQL para Supabase).

- **F1 — Categorías.** Centralizar `lib/categories.ts`, añadir wellness + pop-ups, destacar las 4. *(Bajo riesgo, sin dinero, fundacional.)*
- **F2 — Modelo de datos de planes.** `host_subscriptions`, `subscription_payments`, `is_pro_host()`, `requirePro()`, RLS, anti-downgrade. Sin cambio visible (todos gratis).
- **F3 — Simplificación de precios + presentación.** `is_consumable`, creación solo-hora, tarjeta de precio, unificar comisión.
- **F4 — Panel Normal vs Pro + vista previa/gating frontend.** Activación manual admin → Pro ya probable end-to-end. *(Skill: `ui-ux-pro-max`.)*
- **F5 — Espot Directo público.** Botón WhatsApp/teléfono/formulario + ampliar canales + gatear reservas externas/CRM con vista previa.
- **F6 — Tarjeta digital + QR + stats avanzadas** (tracking de clics). *(Skill: `ui-ux-pro-max`.)*
- **F7 — Cobro Azul RD$499** + activación manual + éxito/error/cancelado + cron de renovación/recordatorios.
- **F8 — Migración de datos** de precios existentes (respaldo + cola admin).
- **F9 — Pruebas integrales**, seguridad (gating front+back), notificaciones, responsive, 3 roles. *(Skills: `webapp-testing`, `systematic-debugging`, `code-review`.)*

---

## 16. Herramientas por fase

- **Diseño/plan:** brainstorming (hecho) → writing-plans (siguiente).
- **UI Pro (F4, F6):** `ui-ux-pro-max` respetando el sistema visual actual (no rediseñar; mantener branding `#35C493`/`#03313C`, temas CSS, Poppins).
- **Verificación (todas las fases) y F9:** `webapp-testing`, `systematic-debugging`, `code-review`.

---

## 17. Lo que NO se hace

No rediseñar Espot completo · no modificar páginas no relacionadas · no eliminar datos · no romper reservas actuales · no mezclar reservas directas con cobradas dentro de Espot · no cambiar branding/tipografías/colores · no auto-push/commit/deploy · no aplicar SQL automáticamente.
