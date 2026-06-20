# Diseño — Módulo administrativo "Espot Pro" + prueba gratuita (2026-06-19)

> **Solo diseño/plan. Nada implementado, nada eliminado.** Requiere aprobación antes de ejecutar. Basado en 3 auditorías de solo lectura del código actual (revisión de precios, sistema Pro, design-system admin).

---

## Entregable 1 — Auditoría de "Revisión de precios" (estado actual)

Son **dos features distintas**:
- **Revisión de precios** (`/admin/revision-precios`) → cola legacy que conviertes precios a "por hora". **Es la que pides retirar.**
- **Corregir precios** (`/admin/fix-pricing`) → herramienta separada y autónoma (mapa de precios por slug); **no depende** de la migración 030 ni de la cola.

Blast radius de **Revisión de precios** (todo confinado):
- UI: `src/app/admin/revision-precios/page.tsx` (única página, sin subcomponentes).
- Nav: `src/components/admin/AdminSidebar.tsx:54` (`Revisión de precios`, icono `Tag`).
- Acciones server (sin call sites externos): `getPricingReviewQueue` (`admin.ts:34`) y `applyHourlyConversion` (`admin.ts:57`). Ambas solo se usan en esa página.
- Helper `suggestHourlyFromLegacy` (`pricing.ts`) — solo lo usa `getPricingReviewQueue` + su test.

## Entregable 2 — Qué puede eliminarse / qué se conserva

**Eliminar (UI):** la página, el link de nav (+ import `Tag` huérfano), las 2 acciones server, y opcionalmente el helper `suggestHourlyFromLegacy` + su test.

**Conservar en DB (NO tocar — es DATA histórica):**
- Tabla `space_pricing_backup_pre_espot2` (respaldo de precios legacy antes de Espot 2.0) — **nunca dropear**.
- Columna `space_pricing.needs_pricing_review` — inerte sin la UI, se conserva para evitar una migración destructiva.

**No hay** migraciones pendientes, crons ni RLS que dependan de esto. **Veredicto: seguro de eliminar la UI sin tocar datos.**

> **Decisión a confirmar:** `fix-pricing` es independiente. Por defecto **lo dejo** (solo retiro "Revisión de precios"). Si quieres que también salga, lo incluyo.

---

## Entregable 3 — Diseño de la nueva sección "Espot Pro"

Nueva sección de nav admin (grupo "Finanzas" o sección propia "Suscripciones") → ruta `/admin/pro`. Hereda `.admin-theme` y el gate de `admin/layout.tsx`. Reutiliza el design-system existente (CRM como plantilla visual) para sentirse parte del mismo producto.

Estructura de la sección:
1. **Dashboard (resumen)** — KPIs (entregable 11) + filtros rápidos + tabla.
2. **Tabla de propietarios** — fila por host con todas las columnas pedidas; búsqueda + filtros + chips de segmento; acciones masivas (exportar/copiar).
3. **Vista individual del propietario** — panel lateral (estilo CRM): datos, plan, línea de tiempo del periodo, historial de cambios (audit), acciones rápidas con confirmación, notificaciones enviadas.

Patrón visual: header con eyebrow ("SUSCRIPCIONES" + Crown), `StatCard` para KPIs, `Card`/`Button variant="pro"`, búsqueda pill (input 16px anti-zoom), chips de filtro, tabla `divide-y` con grid y scroll horizontal, panel detalle `lg:sticky`, toast top-right, `EmptyState`/`LoadError`/`Pagination`. Cero estilos nuevos divergentes.

Columnas de la tabla (todas las pedidas): Nombre · Email · Teléfono · Espacios · Plan (Normal/Pro) · Estado Pro (badge) · Tipo de activación (Prueba/Manual/Azul) · Inicio · Fin · Próxima renovación · Días restantes · Estado de pago · Última actividad · Registro · Acciones.

---

## Entregable 4 — Modelo de datos definitivo

**Extender `host_subscriptions`** (migración aditiva):
- `status` CHECK ampliado a: `trialing`, `active`, `pending_payment`, `past_due`, `cancelled`, `expired`, **`suspended`** (nuevos: `trialing`, `suspended`).
- `activation_type text default 'manual'` CHECK `in ('trial','manual','azul')` — distingue prueba / activación manual gratuita / pago real (clave para ingresos).
- `cancel_at_period_end boolean default false` — para "cancelar al finalizar el periodo".
- `admin_note text` — última nota interna (el histórico va en el audit log).
- Reutilizar `current_period_start/end` (vigencia), `ends_at` (queda libre; no lo usamos).
- **Índice único de "una viva por host"** se amplía a incluir `trialing` y `suspended` (un host no puede tener dos suscripciones vivas).

**`profiles`**: añadir `pro_trial_used boolean default false` — evita reactivar la prueba repetidamente sin admin.

**Tabla nueva `subscription_audit_log`** (registro de auditoría):
`id, host_id, subscription_id, admin_id, action, old_status, new_status, note, created_at`.

**Tabla nueva `subscription_notifications`** (registro de comunicaciones, anti-duplicado):
`id, host_id, subscription_id, event_type, channel ('email'|'whatsapp'), status ('pending'|'sent'|'failed'), error, sent_at, created_at` + índice único `(host_id, event_type, period_key)` para no duplicar.

**`marketplace_config`** (ya existe): claves nuevas `pro_auto_trial_enabled` (`'false'` por defecto), `pro_trial_days` (`'30'`), `pro_price_dop` (`'499'`). Añadir a `ALLOWED_CONFIG_KEYS`.

**Fuente de verdad única:** `resolvePlan` (TS) e `is_pro_host` (SQL) se actualizan para que **`trialing` cuente como Pro** (desbloquea funciones) y `suspended` **no**. Se elimina la lógica duplicada de `admin.ts:642` (usar `resolvePlan`).

---

## Entregable 5 — Estados y transiciones

**Estados visibles al admin** (nunca nombres técnicos crudos). Mapeo estado interno → etiqueta/badge/color (vía `subscriptionStyle` en `statusConfig.ts`, mismo patrón que `payoutStyle`):

| Interno (DB) | Etiqueta admin | Color | Acciones disponibles |
|---|---|---|---|
| (sin sub viva) | **Normal** | gris | Activar prueba · Activar Pro |
| `trialing` (vigente) | **Prueba gratuita** (+días) | azul | Extender · Convertir a Pro (pagado) · Finalizar ahora · Volver a Normal |
| `active` + vigente | **Pro activo** | verde | Renovar 30d · Extender · Cambiar fin · Marcar pendiente · Cancelar (fin/inmediato) · Suspender · Normal |
| `active` + ≤7 días | **Próximo a vencer** (derivado) | ámbar | Renovar · Extender |
| `pending_payment` | **Pendiente de pago** | naranja | Marcar pagado · Cancelar |
| `past_due` / vencido por fecha | **Vencido** | rojo | Renovar · Volver a Normal |
| `cancelled` | **Cancelado** | gris | Restaurar Pro · Activar prueba |
| `suspended` | **Suspendido** | rojo | Restaurar Pro · Cancelar |

"Próximo a vencer" y "Vencido por fecha" son **derivados** de `current_period_end` (no estados almacenados): la vista los calcula. `expired` sí se persiste cuando el cron barre.

**Transiciones clave:** Normal→(Prueba|Pro) · Prueba→(Pro|Expired|Normal) · Pendiente→(Pro|Cancelado) · Pro→(Renovado|Past_due|Cancelado|Suspendido|Normal) · Suspendido→(Pro|Cancelado) · Cancelado/Expired→(Pro|Prueba si no usada). Toda transición ⇒ fila en `subscription_audit_log`.

---

## Entregable 6 — Flujo de prueba gratuita (30 días)

- **Automática (opcional, controlada):** si `pro_auto_trial_enabled = true`, al registrarse un propietario nuevo (o publicar su primer espacio) y `pro_trial_used = false` → crea sub `status='trialing'`, `activation_type='trial'`, periodo 30d, marca `pro_trial_used=true`, registra audit + notificación "inicio de prueba". **Default = desactivada** (tú decides cuándo encenderla).
- **Manual:** admin "Activar prueba gratuita" en la vista del propietario → mismo efecto, con fecha de inicio/fin elegibles.
- **Guard anti-abuso:** si `pro_trial_used=true`, la prueba solo puede re-otorgarse manualmente por admin (no automática).
- **Fin de prueba:** el cron, cuando `trialing` y `current_period_end < now` → `status='expired'`, `plan_type='free'`, notifica "prueba terminada". Datos del host se conservan (solo lectura).
- **Conversión:** "Convertir a Pro" → `status='active'`, `activation_type` `azul` (si hay pago) o `manual`.

## Entregable 7 — Flujo de activación manual

`adminSetHostPlan` se amplía a un set de acciones (cada una: confirmación + validación backend + audit log):
`activar_prueba` · `activar_pro` (elige duración) · `extender` · `renovar_30` · `cambiar_fin` (fecha) · `marcar_pagado` · `marcar_pendiente` · `cancelar_fin_periodo` · `cancelar_ahora` · `suspender` · `restaurar` · `volver_normal` · `nota_interna`.
Validaciones: fechas válidas (fin > inicio, no en pasado para nuevas), no dos suscripciones vivas (índice único), prueba no reactivable sin admin.

## Entregable 8 — Flujo de vencimiento

Nuevo task en el cron diario (`api/cron/payment-reminders`, ya protegido con `CRON_SECRET`):
1. **Barrido de expiración:** `trialing|active` con `current_period_end < now` → `expired` + `plan_type='free'`; `cancel_at_period_end=true` y vencido → `cancelled`. Registra audit.
2. **Recordatorios** (prueba y Pro): a 14/7/3/1 días y "vence mañana"/"vencido", enviando email/WhatsApp **solo si no se envió antes** (dedupe por `subscription_notifications`).
3. Cada envío deja fila en `subscription_notifications` (sent/failed/pending) → visible en admin.

---

## Entregable 9 — Cambios en el panel del propietario

- **Pro o Prueba activa:** `resolvePlan` trata `trialing` como Pro → desbloquea Espot Directo, reservas externas, CRM, calendario unificado, tarjeta digital, estadísticas avanzadas, compartir, contacto directo. Sidebar/inicio muestran **badge Espot Pro** + **días restantes** + próxima renovación. (Gran parte ya existe; se añade el caso `trialing` y los días.)
- **Normal:** datos previos intactos; funciones Pro en **vista previa / solo lectura** (ya implementado vía `ProUpsell` + lectura libre); explicación de Pro + **RD$499/mes** + CTA "Iniciar prueba"/"Mejorar". Sin errores ni pantallas vacías.
- **Tras vencer prueba/plan:** panel se actualiza solo (siguiente carga); funciones Pro pasan a **solo lectura**; contactos/reservas externas/clientes se conservan; no puede crear/editar datos Pro; puede volver a Pro sin perder nada. (Requiere pulir las pantallas Pro para mostrar los datos existentes en solo-lectura en vez de ocultarlos.)

## Entregable 10 — Sincronización inmediata + segmentos

**Sync inmediato:** `adminSetHostPlan` añadirá `revalidatePath` para panel host (`/dashboard/host`, `/eventos`, `/clientes`, `/calendario`, `/pro`), marketplace (`/buscar`, `/espacios`) y tarjeta (`/t`, `/h`), y mantendrá `plan_type` sincronizado. Backend/RLS son inmediatos (leen `is_pro_host` en vivo, incluyendo `trialing`). **Sin re-login** (ya es así). Pantallas ya abiertas se actualizan en la siguiente navegación; opción futura: suscripción realtime para push en vivo.

**Segmentos para marketing (entregable 7 del brief):** consultas predefinidas — prueba activa · prueba termina en 7/3/1 día · prueba vencida · Pro próximo a vencer · Pro vencido · gratuitos que nunca probaron · con espacios publicados · con reservas externas · que no han usado funciones Pro. Acciones masivas (preparadas, sin plataforma externa): exportar contactos (CSV) · copiar correos · "crear audiencia" (guarda el segmento) · "registrar comunicación enviada" · ver última comunicación. Estructura lista para futura integración email/WhatsApp (no se integra ahora).

## Entregable 11 — Resumen administrativo (KPIs)

Total propietarios · Normal · Pruebas activas · Pro activos · Pendientes de pago · Próximos a vencer · Vencidos · **Ingresos mensuales estimados** · Conversión prueba→Pro · Cancelaciones · Renovaciones.
**Ingresos:** solo `activation_type='azul'` con pago confirmado cuentan como ingreso. Activaciones manuales gratuitas, pruebas y Pro pendientes de pago **NO** se cuentan (se muestran aparte).

---

## Entregable 12 — Plan de implementación por fases (pequeñas, reversibles, verificables)

Cada fase: `tsc + build + jest` verde, commit local, sin push hasta cerrar el lote o autorización.

- **F0 — Retirar "Revisión de precios"** (UI only; DB intacta). Bajo riesgo, reversible.
- **F1 — Modelo de datos** (migración aditiva idempotente: estados `trialing`/`suspended`, columnas, tablas audit + notifications, config; actualizar `resolvePlan`/`is_pro_host`/`LIVE_STATUSES`/`subscriptionStyle`; quitar lógica duplicada). **SQL entregado para que lo apliques tú.**
- **F2 — Esqueleto del módulo admin** (nav + `/admin/pro` dashboard + KPIs + tabla + búsqueda + filtros) reutilizando componentes.
- **F3 — Vista individual + acciones + auditoría** (`adminSetHostPlan` ampliado, confirmaciones, audit log, línea de tiempo, historial).
- **F4 — Prueba gratuita** (config, activación manual, auto tras flag, guard `pro_trial_used`).
- **F5 — Cron de vencimiento + notificaciones** (barrido expiración, recordatorios, dedupe, plantillas).
- **F6 — Panel del propietario** (trialing desbloquea + días restantes + solo-lectura al vencer).
- **F7 — Sync inmediato** (revalidaciones + RLS trialing).
- **F8 — Segmentos + acciones masivas** (export/copiar/audiencia/registrar-comunicación).
- **F9 — Resumen/KPIs + contabilidad de ingresos.**
- **F10 — Seguridad + QA + verificación final.**

## Entregable 13 — Casos de prueba

- **Activación manual:** admin activa Pro 30d → host ve Pro en siguiente carga; RLS permite crear evento externo; badge en marketplace; audit log registra old→new.
- **Prueba:** activar prueba → `trialing` cuenta como Pro (crea CRM/eventos); a los 30d el cron → `expired`, host pasa a solo-lectura sin perder datos; reactivar prueba automática bloqueada (pro_trial_used).
- **Vencimiento:** sub con fin en el pasado → cron marca `expired` + `plan_type=free`; funciones Pro solo-lectura; volver a Pro restaura acceso a los datos previos.
- **Doble suscripción:** intentar crear segunda viva → bloqueado por índice único (error claro).
- **Ingresos:** activación manual gratuita NO suma a MRR; Azul pagado SÍ.
- **Fechas inválidas:** fin < inicio o en pasado → rechazado en backend.
- **Notificaciones:** correr el cron dos veces el mismo día → no duplica envíos (dedupe).
- **Seguridad:** no-admin llamando las acciones → `No autorizado`; RLS bloquea escritura Pro de host vencido.
- **Sync:** tras activar, sin cerrar sesión, el host ve Pro al navegar; el badge del marketplace aparece tras revalidación.

## Entregable 14 — Riesgos

1. **Cambio de CHECK de `status`** (añadir `trialing`/`suspended`): si alguna fila tuviera un valor fuera del nuevo set fallaría — mitigación: el set es superset del actual, migración aditiva, idempotente.
2. **`trialing` como Pro**: hay que tocar `resolvePlan` **y** `is_pro_host` (SQL) a la vez; si se desincronizan, front y RLS difieren. Mitigación: cambiarlos en la misma fase (F1) con test.
3. **Auto-trial sin control** → por eso default desactivado + guard `pro_trial_used` + solo tras flag explícito.
4. **Sync no-inmediato en pantallas abiertas**: backend/RLS sí son inmediatos; UI se refresca en la siguiente navegación. Aceptable; realtime es mejora futura.
5. **Ingresos mal contados** si se mezclan manual/trial con Azul. Mitigación: `activation_type` explícito + KPIs separados + test.
6. **Borrar `suggestHourlyFromLegacy`/columnas**: NO borrar datos (backup histórico). Solo UI.
7. **Cron duplicando envíos**: mitigado con `subscription_notifications` + índice único.
8. **RLS 029 sin aplicar en prod**: verificar antes de F7 (su estado aplicado no es confirmable desde el código).

---

## Decisiones a confirmar antes de ejecutar
1. **Prueba gratuita = nuevo estado `trialing`** en DB (recomendado) que cuenta como Pro 30 días. ¿OK?
2. **Auto-trial al registrarse = desactivado por defecto** (admin lo enciende cuando quiera). ¿OK?
3. **`fix-pricing`**: ¿lo dejo (separado) o también lo retiro junto con "Revisión de precios"?

Tras tu visto bueno (y ajustes), genero el plan detallado por tareas (`writing-plans`) y ejecuto F0→F10 en fases pequeñas y verificables.
