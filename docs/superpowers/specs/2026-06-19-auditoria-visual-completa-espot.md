# Auditoría visual + funcional completa — Espot (2026-06-19)

> **ESTADO DE REMEDIACIÓN (2026-06-19):** F0–F7 ejecutadas. Commits locales `c417b39`(F0 dinero) · `30d5aea`(F1 estados) · `be739b4`(F2 datos) · `a49e256`(F3 carga) · `9fca263`(F4 admin tokens) · `9da1fb9`(F5 componentes) · `e1171b3`(F6 Pro) + F7 pulido. Todos los Críticos resueltos. tsc+build+83 tests verde. Deuda incremental restante: barrido hex→token en los 21 archivos del admin; adopción de componentes en el resto de pantallas; decisiones de producto (is_featured, badge Pro público, cleaning/overtime).


> Solo lectura. **Ningún cambio aplicado.** Este documento es el informe + plan de corrección por fases para aprobación del dueño. Evidencia = `archivo:línea` (el QA con login headless no es posible — Supabase local vacío, gate `SITE_PASSWORD`, OAuth no headless; ver memoria `local_run_qa_constraints`). Capturas públicas de prod posibles a pedido; paneles autenticados se evidencian por código.

Método: 6 auditorías paralelas de solo lectura sobre todo `src/` — (A) fuente única de datos del espacio, (B) lenguaje de estados, (C) sistema visual, (D) precios, (E) gating Pro, (F) inventario + CRM + estados.

---

## Resumen ejecutivo — conteo por severidad

| Sev | # | Titular |
|---|---|---|
| **Crítico** | 6 | Liquidaciones paga `total*0.90` (no `computeHostNet`); política de cancelación hardcodeada; neto host fee+neto≠total en 4 pantallas; cotizaciones `*0.90`; estados del cliente con colores divergentes; spinner infinito en liquidaciones |
| **Alto** | 11 | Sin estado de error real (carga fallida = "no hay datos"); fallos silenciosos en pagos de eventos; `instant_booking` leído de tabla equivocada; permisos editables no mostrados (5/10); `/h/[slug]` Pro sin gating; payout con 4 etiquetas; badges fin-de-semana/instantánea en card pero no en detalle; admin/pagos ignora `platform_fee` real; admin off-system (cohesión) |
| **Medio** | ~14 | 2.428 hex hardcoded; `StatusBadge` usado en 1 sitio; sin Card/StatCard/Button/EmptyState/Skeleton; `is_featured` sin efecto; badge Pro sin superficie pública; CRM sin leads/seguimientos; form nuevo-evento dead-end; doble `formatCurrency`; género de estados |
| **Bajo** | ~8 | `--dark-theme`/`--brand-lime` muertos; `address` no mostrado; CTA verde en superficie Pro `/t`; deuda de migración (columnas no versionadas); campos huérfanos (cleaning/overtime) |

**El núcleo de la queja ("parece sistemas separados") es real y se localiza en 3 causas:** (1) el panel **admin no usa el sistema de temas/tokens** y tiene su propia paleta; (2) **no existen componentes compartidos** (Card, Button, EmptyState, badges) → cada pantalla reinventa; (3) **los estados y los precios se recalculan/renombran por pantalla** en vez de una fuente única.

---

## Entregable 1 — Inventario de pantallas

**Público `(marketplace)`** (`light/white-theme`): `/` home · `/buscar` · `/espacios/[slug]` detalle+BookingWidget · `/aplicar` · `/para-clientes` · `/para-propietarios` · `/contacto` · legales (`terminos/privacidad/cookies/reembolso/seguridad`).

**Acceso/auth**: `/acceso` (gate SITE_PASSWORD) · `/auth` · `/auth/reset` · `/auth/invitacion`.

**Cliente `dashboard/(client)`** (`white-theme`): `/dashboard` dispatcher · `/overview` · `/reservas` · `/reservas/[id]` · `/pagos` · `/favoritos` · `/mensajes` · `/perfil` · `/ayuda`.

**Propietario `dashboard/host`** (`host-theme`): `/host` inicio · `/espacio` · `/agenda` (Reservas) · `/calendario` · `/clientes` (CRM) · `/cotizaciones` · `/mensajes` · `/resenas` · `/finanzas` · `/analytics` · `/eventos` + `/eventos/nuevo` · `/pro` · `/equipo` · `/ajustes` · `/solicitud` · `/reservas/[id]`.

**Admin `admin`** (sidebar oscuro propio): `/admin` · `/reservas` · `/aplicaciones`+`[id]` · `/espacios`+`[id]` · `/usuarios`+`[id]` · `/disputas` · `/mensajes` · `/pagos` (comisiones) · `/liquidaciones` · `/reportes` · `/revision-precios` · `/configuracion` · ⚠️`/migracion` · `/cleanup` · `/fix-pricing`.

**Pago**: `/pago/[bookingId]` · `/pago/evento/[eventId]` · `/pago/{exitoso,fallido,cancelado}`.

**Enlaces públicos**: `/t/[slug]` tarjeta digital (Pro) · `/h/[slug]` microsite host · `/contrato/[bookingId]`.

---

## Entregable 2 — Mapa de navegación (real, desde los sidebars)

```
MARKETPLACE (top-nav): Buscar · Para clientes · Para propietarios(CTA) · [footer legales/contacto]

CLIENTE (ClientSidebar): Inicio · Mis reservas[badge] · Favoritos · Pagos · Mensajes[badge] · Mi perfil · Ayuda
  [footer] Explorar · → Panel de Negocio · [Admin si admin]

HOST (Sidebar, agrupado): Inicio · Mi espacio
  —Operaciones— Reservas[badge] · Calendario · Clientes(CRM)
  —Ventas—      Cotizaciones[badge] · Mensajes[badge] · Reseñas
  —Dinero—      Finanzas · Analytics
  —Config—      Espot Pro[pill Mejora] · Equipo(owner) · Ajustes
  [footer] Explorar · → Panel de Cliente · [Admin]
  Huérfanas (sin nav): eventos, eventos/nuevo, solicitud, reservas/[id]

ADMIN (AdminSidebar, tema oscuro separado): Dashboard | Operación(Reservas/Aplicaciones/Espacios/Usuarios/Disputas/Mensajes) | Finanzas(Comisiones/Pagos a propietarios) | Plataforma(Reportes/Revisión precios/Config) | ⚠Avanzado(Migración/Limpieza/Corregir precios)
```
Cliente y Host comparten `AppSidebar`; Admin usa sidebar y tema propios (separación intencional por gobernanza, pero es la raíz de la divergencia visual).

---

## Entregable 8 — Matriz panel → DB → marketplace → reserva (datos del espacio)

Fuentes: form host `dashboard/host/espacio/page.tsx`+`lib/actions/space.ts`; DB `espot-saas/supabase/migrations/`; card `(marketplace)/buscar/SpaceCard.tsx`; detalle `espacios/[slug]/SpaceDetailClient.tsx`; reserva `BookingWidget.tsx`+`booking.ts`+`pricing.ts`.

| Campo | Editable | Columna DB | Card / Detalle | Reserva | Estado |
|---|---|---|---|---|---|
| nombre | page:982 | `spaces.name` | card:248 / det:309 | ✓ | OK |
| categoría | page:993 | `spaces.category` | card:265 / det:332 | — | OK |
| fotos | PhotoUploader / space:427 | `space_images.url/is_cover/position` | card:34 / det:190 | — | OK |
| descripción | page:1017 | `spaces.description` | **card NO** / det:772 | — | menor (no en card) |
| capacidad | space:168 | `capacity_min/max` | card:337 / det:318 | valida | OK |
| ubicación | space:170 | `address/sector/city/lat/lng` | sector+city (card:263/det:314)+mapa | — | `address` editable **nunca mostrado** (privacidad?) |
| precio/hora | page:1137 | `space_pricing.hourly_price` | card:56 / det:206 | `computeBasePrice` | OK (fuente única) |
| mín/máx horas | space:130 | `min_hours/max_hours` | **card NO** / det:795 | widget/booking | OK |
| precio fin de semana | page:151 | `weekend_multiplier` | **card badge:315 / det NO** | widget:305 | **divergente: card sí, detalle no** |
| es consumible | space:129 | `is_consumable` | **card NO** / det:797 | `consumptionLabel` | OK |
| amenidades (16 `has_*`) | space:228 | `space_conditions.has_*` | **card NO** / det:860 | — | OK en detalle |
| permisos (10 `allows_*`) | space:245 | `space_conditions.allows_*` | **card NO** / det **solo 5/10** | — | **5 permisos editables nunca mostrados** |
| reglas | space:265 | `custom_rules` | det:1303 | — | OK |
| servicios (addons) | space:214 | `space_addons.*` | **card NO** / det:1071 | widget:1016 | OK |
| disponibilidad | space:202 | `space_time_blocks.*` | card computa, no pinta / det:877 | valida | menor |
| contacto host | perfil | `profiles.whatsapp/phone/email` | det solo nombre/avatar; `whatsapp` cargado no pintado | — | datos cargados sin uso |
| is_published | admin:279 | `spaces.is_published` | filtro query | — | OK |
| is_featured | **admin**:272 | `spaces.is_featured` | **NO se lee en marketplace** | — | **toggle admin SIN efecto** |
| badge Pro | host_subscriptions | `plan_type`/`host_subscriptions` | **NO hay badge en card/detalle** | — | **plan vendido, sin superficie pública** |
| reserva instantánea | space:163 | `spaces.instant_booking` | **card badge:233 / det NO** | widget:563 / booking:234 **tabla equivocada** | **divergente + bug (ver Crítico)** |
| políticas/cancelación | modal:824 | `cancellation_policy/hours_before/refund_pct` | det:1274 | booking:799 aplica refund | **wizard hardcodea 72h/50% (ver Crítico)** |
| primary/secondary_activity | space:175 | `spaces.primary_activity/...` | **NO mostrado** | — | editable+almacenado, sin display |
| cleaning/overtime | space:256 | `space_conditions.cleaning_*/overtime_*` | **NO mostrado** | **NO cobrado** (widget usa `extra_hour_price`) | huérfano/duplicado |
| package_includes / min_advance | space:146/124 | `space_pricing.*` | **NO mostrado** | min_advance solo en scheduling | sin display |

**Nota de deuda:** no existen tablas `venues`/`space_amenities`; "amenidades" = columnas `has_*` en `space_conditions`. Muchas columnas en uso (`has_*`, `allows_live_music/dj/children/parties/corporate`, `cleaning_*`, `overtime_*`, `primary_activity`, `secondary_activities`, `package_includes`, `extra_hour_price`, `is_featured`) **no están en ninguna migración versionada** — aplicadas a mano en Supabase.

---

## Entregable 3 — Inconsistencias de datos (severidad)

- **[Crítico] Política de cancelación falsa.** El wizard del host guarda `hours_before=72`, `refund_pct=50` hardcodeados (`space.ts:263-264` crear, `:556-557` editar), ignorando lo configurado; solo el modal `updateCancellationPolicy` los cambia. `booking.ts:802-803` reembolsa según esos valores → **el cliente recibe menos reembolso del prometido**.
- **[Alto] `instant_booking` leído de tabla equivocada.** `booking.ts:234` hace `select('pricing_type, instant_booking')` sobre `space_pricing`, pero la columna vive en `spaces`. Hoy "funciona por accidente" (se re-lee bien en :238); cualquier endurecimiento rompe las reservas instantáneas.
- **[Alto] 5 de 10 permisos nunca se muestran.** `allows_live_music/dj/children/parties/corporate` editables (`space.ts:250-254`) y nunca renderizados → cliente reserva con expectativa equivocada (p.ej. "no niños").
- **[Alto] Badges fin-de-semana e instantánea: card sí, detalle no.** Cliente ve "⚡/+30%" en resultados y desaparece en el detalle.
- **[Medio] `is_featured`: toggle admin sin consumidor.** Destacar un espacio no hace nada en el sitio.
- **[Medio] Badge Pro sin superficie en marketplace.** Plan vendido a hosts sin diferenciación visible al cliente.
- **[Medio] `cleaning_fee`/`overtime_price` editables, ni mostrados ni cobrados;** `overtime_price` y `extra_hour_price` son **dos columnas para el mismo concepto** (duplicación).
- **[Bajo] `address`, `whatsapp/phone/email`, `primary_activity`, `package_includes`, `min_advance` editables/cargados sin superficie de display.**

---

## Entregable 7 — Estados y lenguaje (mapper central existe solo para booking)

`src/lib/bookingConfig.ts` + `StatusBadge.tsx` cubren **solo** el estado de booking — y `StatusBadge` **solo se importa en `host/page.tsx`**. `payment_status`, `payout_status`, `external_events`, disputas y aplicaciones se reimplementan inline por pantalla.

- **[Crítico] El panel del cliente reimplementa los estados con colores divergentes.** `(client)/overview/page.tsx:9-18` define su propio `statusConfig`: `completed`=`#35C493` (canónico `#16A34A`), `quote_requested`=`#7C3AED` (canónico `#0891B2`), cancelaciones=gris (canónico rojo/naranja). El mismo estado se ve distinto en `/overview` vs `/reservas`.
- **[Crítico/Alto] `payout_status`: 4 etiquetas para `pending`, 3 para `paid`,** repartidas entre host y admin (`finanzas:25-29`, `liquidaciones:14-20`, `usuarios/[id]:42-45`, `host/reservas/[id]:350`); además el valor raw difiere (`en_curso` host vs `in_review` admin) → riesgo de bug, no solo copy.
- **[Alto] `accepted` = "Por pagar"** en cliente (`overview:11`, `clientes:43`) vs "Pendiente de pago" canónico.
- **[Alto] `external_events` cambia de color entre host y admin:** `confirmado` verde→azul, `en_curso` azul→morado (`usuarios/[id]:48-49`); `cancelado` rojo en host home vs gris en agenda/eventos.
- **[Medio] Género inconsistente** (host/clientes "Confirmado" vs canónico "Confirmada"); `payment_status` sin mapper (ternario `usuarios/[id]:414`); cuotas con vocabulario propio inline.

**Recomendación:** crear `paymentConfig.ts`, `payoutConfig.ts` (unificar primero `en_curso` vs `in_review`), `externalEventConfig.ts`; adoptar `StatusBadge` en cliente/host/admin; test que verifique cobertura exhaustiva del union type.

---

## Entregable 4 — Inconsistencias visuales · Entregable 5 — Componentes duplicados · Entregable 6 — A centralizar

**Tokens (`globals.css:17-98`):** marca, Pro (dorado), semánticos por tema (`.light/.white/.host-theme`; `.dark-theme` muerto). **Sin tokens de radio/spacing** (se usa Tailwind, consistente).

**Violación sistémica de "nunca hardcodear color":** **2.428 hex en 121 archivos.** Peores: `email/templates.ts` (114, aceptable), `HomepageSections` (78), `HomepageSearch` (75), `aplicaciones/[id]` (65), `usuarios/[id]` (51), `SpaceDetailClient` (51), `liquidaciones` (48). ~270 hex duplican exactamente `--brand`/`--brand-navy`/tokens de texto.

**Admin = paleta paralela:** `admin/layout.tsx:18` no aplica clase de tema y hardcodea `#F4F6F8`; usa una escala gris-azulada propia (`#0F1623`×82, `#94A3B8`, `#E8ECF0`×72, `#F8FAFC`) ausente de `globals.css`, ya filtrándose a host. **Esta es la mayor causa de "parece otro sistema".**

| Patrón | Compartido existe | Reimplementación inline | Recomendación |
|---|---|---|---|
| Status badge | ✅ `StatusBadge` (1 solo uso) | ~77 `<span rounded-full>` + `STATUS_CONFIG` propio en admin | Adoptar en los 4 paneles |
| KPI/stat card | ❌ | `admin:113`, `host:317`, `client/overview` | `<StatCard>` |
| Empty state | ❌ (~20 ad-hoc) | host/client/admin | `<EmptyState>` |
| Skeleton/Spinner | ❌ (0 `loading.tsx`) | ~30 archivos inline | `<Skeleton>`+`<Spinner>` |
| Alert/banner | ❌ | `admin:80`, `host:171` | `<AlertBanner>` |
| Modal/drawer | ❌ (14 `fixed inset-0`) | varios | `<Modal>`/`<Drawer>` |
| Button | parcial (`.btn-brand` CSS) | **363 `<button>` crudos** | `<Button variant>` |
| Card | ❌ | cientos `rounded-2xl` ad-hoc | `<Card>` token-based |
| Page header | ❌ | admin/host/client variantes | `<PageHeader>` |

**Existen:** `StatusBadge`, `PlanBadge`, `ShareButton/FavoriteButton/ConfirmSubmitButton`, `ui/{DatePicker,TimePicker,Pagination}`, clases `.btn-brand/.btn-outline/.input-base`. **Faltan:** Button, Card, Input, Modal, EmptyState, Skeleton, Spinner, StatCard, AlertBanner, PageHeader.

---

## Entregable — Precios (todas las pantallas)

Fuente única `lib/pricing.ts`: `computeBasePrice`, `computePlatformFee = round(subtotal*0.10)`, `computeHostNet = total − computePlatformFee(total)` (garantiza `fee+neto=total`). El camino transaccional **BookingWidget → booking.ts SÍ** la usa. El problema está en **visualización y liquidación**:

- **[Crítico] `admin/liquidaciones` paga `total*0.90`** (`:120,135,136,239`) en vez de `total − platform_fee` real → lo que se transfiere al host descuadra (medio peso por reserva, acumula). **Es dinero que se mueve.**
- **[Crítico] `host/reservas/[id]:132-133`** muestra `fee=round(total*0.10)` y `neto=round(total*0.90)` → **fee+neto ≠ total** (p.ej. total 1005 → 101+905=1006).
- **[Crítico] `cotizaciones:317`** `price*0.10`/`*0.90` sin redondeo → lo prometido en la cotización difiere de lo liquidado.
- **[Crítico] `admin/usuarios/[id]`** mezcla fórmulas en el mismo archivo (`hostNet` correcto `:159` vs `pendingPayout=round(total*0.90)` `:165`) + `fmtCurrency` propio.
- **[Alto] `admin/pagos` y `admin/page`** usan `total*0.10`/`*0.90` ignorando `platform_fee` almacenado.
- **[Medio] Lógica de neto duplicada** en `host-finance.ts:39-44` (hoy coincide; copia frágil). **Doble formatter** (`formatCurrency` utils vs `fmtCurrency` inline vs `RD$…toLocaleString`).

**Recomendación:** reemplazar todo `*0.90`/`*0.10` por `computeHostNet`/`computePlatformFee` con fallback a `platform_fee` real; un solo `formatCurrency`; exportar helper `feeOf/netOf`; helper `priceLabel(pricing)` compartido card↔detalle.

---

## Entregable — Pro (gating front+back)

Fuente de verdad correcta: `getMyPlan/requirePro/isHostProById` desde `host_subscriptions` (no caché stale). Identidad dorada `--pro` **consistente** (PlanBadge, ProUpsell, /pro, sidebar, banner inicio = 0 `--brand`). Patrón upsell **inline no agresivo** (sin pop-ups). Escrituras Pro **gateadas** (`createExternalEvent`, CRM CRUD).

- **[Alto] `/h/[slug]` (Espot Directo público) SIN gating Pro.** `getHostPublicProfile`/`createFromPublicForm` (`external-events.ts:412,447`) no verifican Pro → un host free tiene microsite de captación de leads funcional (incoherente con `/t/[slug]` que hace `notFound()`).
- **[Medio] `eventos/nuevo` dead-end para free:** form completo + error genérico al enviar, sin preview+upsell.
- **[Medio] CRM lecturas/export sin guard:** free puede listar clientes, exportar CSV y copiar teléfonos (`clientes:176,195`) — decisión de producto.
- **[Bajo] CTA "Solicitar fecha" y categoría en `var(--brand)` verde dentro de `/t/[slug]` (superficie Pro).**

**Recomendación:** patrón único = preview + `<ProUpsell>` + acción de escritura deshabilitada/redirigida; `notFound()` solo en superficies públicas Pro. Gatear `/h/[slug]`.

---

## Entregable — Estados vacío/carga/error/permiso (cobertura)

| Pantalla | Vacío | Carga | Error | Bloqueo |
|---|:--:|:--:|:--:|:--:|
| Host Mi espacio | ✅ | ✅ | ⚠️ load `.catch` traga | ✅ layout |
| Host Reservas | ✅ | ✅ | ⚠️ load→[] | ✅ |
| Host Eventos | ✅ | ✅ | ❌ **mutaciones de pago silenciosas** | ✅ |
| Host CRM | ✅ | ✅ | ⚠️ load sin catch | ✅ |
| Host Reserva detalle | ✅ | ✅ | ⚠️ error=not-found=no-autz | ✅ |
| Cliente Reservas | ✅ | ✅ | ⚠️ load `.catch` | ✅ |
| Cliente Pagos | ✅ | ✅ | ❌ falla→"Sin pagos" (engaña) | ✅ |
| Admin Reservas | ✅ | ✅ | ⚠️ load→[] | ✅ |
| **Admin Liquidaciones** | ✅ | ✅ | ❌ **sin try/catch → spinner infinito** | ✅ |
| Marketplace Buscar | ✅ | ⚠️ SSR | ❌ loadMore sin catch | n/a |

- **[Crítico] `admin/liquidaciones:102-114`** sin try/catch → si falla la carga, el spinner se cuelga para siempre en una pantalla de dinero.
- **[Alto] `host/eventos:285,298,311`** add/delete pago y delete evento solo manejan éxito → fallo silencioso (riesgo de integridad de datos).
- **[Alto, sistémico] No hay estado de error real:** toda carga inicial traga el error en el estado vacío o no tiene catch → una caída de backend/RLS es indistinguible de "no tienes datos". Sin reintentar en ninguna pantalla.

**Sólido:** vacíos presentes 10/10; spinners presentes; gating de permisos **centralizado** en layouts (`host/layout:11`, `(client)/layout:10`, `admin/layout:9`); errores de acción (cancelar/aceptar) bien con toasts. La debilidad única recurrente es la **capa de error de carga inicial**.

---

## Entregable — CRM (integración)

**Veredicto: bien integrado, NO parece app aparte.** Vive en el layout host, hereda `host-theme`, tokens, `Sidebar`, `ProUpsell`, `Pagination`. `getUnifiedClients()` (`clients.ts:82-128`) **fusiona** `host_clients` + invitados de reservas Espot en una sola lista deduplicada por email, con **badge de origen** (`SOURCE_LABELS/COLORS clientes:19-33`: Espot/Directo/referido/redes/otro). Historial combina eventos externos + bookings Espot.

Brechas: **[Alto] sin estado de error** (fallo→"Aún no tienes clientes"); **[Medio]** sin leads/etapas/seguimientos/calendario (solo contactos+notas+tags); **[Medio]** los pagos por cliente viven en `/eventos`, no en el detalle CRM; **[Bajo]** invitados Espot son filas read-only sin enriquecer; taxonomía `manual`="Directo" no distingue "Espot Directo" vs "externo".

---

## Entregable 9 — Priorización por impacto (consolidada)

1. **Dinero correcto** (Crítico): liquidaciones/host-detalle/cotizaciones/admin-usuarios/admin-pagos → `computeHostNet`/`computePlatformFee` + `formatCurrency` único.
2. **Datos correctos** (Crítico/Alto): cancelación hardcodeada; `instant_booking` tabla; permisos 5/10; badges card↔detalle.
3. **Estados unificados** (Crítico/Alto): mappers centrales + adoptar `StatusBadge`; unificar payout raw.
4. **Errores de carga** (Crítico/Alto): try/catch + estado error con reintento; liquidaciones; mutaciones de pago en eventos.
5. **Cohesión visual** (Alto/Medio): tema/tokens del admin; barrido hex→token; componentes compartidos.
6. **Pro** (Alto/Medio): gatear `/h/[slug]`; preview+upsell en eventos/nuevo; superficie de badge Pro pública.
7. **Pulido** (Bajo): muertos (`--dark-theme`, `--brand-lime`); CTA dorado en `/t`; deuda de migración documentada.

---

## Entregable 10 — Plan de corrección por fases

> Regla: una pantalla/área por commit, `tsc+build+jest` por commit, sin push hasta lote completo. No rediseñar — **adoptar** lo que ya existe (StatusBadge, pricing.ts, tokens) y crear solo los componentes faltantes.

- **F0 — Fuente única de dinero (Crítico).** Reemplazar todo `*0.90`/`*0.10` por `computeHostNet`/`computePlatformFee` (fallback a `platform_fee` real) en liquidaciones, host/reservas/[id], cotizaciones, admin/usuarios, admin/pagos, admin/page; un solo `formatCurrency`; helper `feeOf/netOf` compartido. + tests de identidad `fee+neto=total`.
- **F1 — Estados unificados (Crítico/Alto).** Crear `paymentConfig`/`payoutConfig`/`externalEventConfig`; unificar `en_curso`/`in_review`; adoptar `StatusBadge` en cliente/host/admin; borrar `statusConfig` locales. + test de cobertura de union.
- **F2 — Datos del espacio (Crítico/Alto).** Arreglar cancelación hardcodeada; `instant_booking` desde `spaces`; mostrar los 10 permisos; badges fin-de-semana/instantánea en detalle; decidir `is_featured` y badge Pro en marketplace; ocultar o cablear cleaning/overtime. Documentar deuda de migración.
- **F3 — Carga/error/permiso (Crítico/Alto).** try/catch + `<ErrorState onRetry>` en todas las cargas iniciales; arreglar spinner infinito de liquidaciones y mutaciones de pago silenciosas en eventos.
- **F4 — Tema + tokens del admin (Alto/Medio).** Promover la paleta gris del admin a tokens (o aplicar tema) en `admin/layout.tsx`; quitar `#F4F6F8`; barrido hex→token en los peores archivos (no-admin primero).
- **F5 — Componentes compartidos (Medio).** Introducir `Card`, `StatCard`, `Button`, `EmptyState`, `Skeleton`/`Spinner`, `AlertBanner`, `PageHeader`; adoptar **incrementalmente**, una pantalla a la vez con verificación.
- **F6 — Pro (Alto/Medio).** Gatear `/h/[slug]` + `createFromPublicForm`; preview+upsell en `eventos/nuevo`; decidir gating de export CRM; superficie de badge Pro pública; CTA dorado en `/t`.
- **F7 — Pulido + responsive + a11y (Bajo).** Capturas públicas de prod, responsive (móvil/tablet), contraste, foco, labels; limpiar `--dark-theme`/`--brand-lime`.

---

## Entregable 11 — Evidencia

Cada hallazgo está anclado a `archivo:línea` arriba (evidencia primaria, dado que los paneles autenticados no son capturables headless). Capturas del marketplace público de prod (espothub.com) disponibles a pedido para F7.

---

## Entregable 12 — Casos de prueba (visual + funcional)

**Dinero:** reserva con `total` no múltiplo de 10 (p.ej. weekend ×1.3) → verificar que `fee+neto=total` y que liquidaciones, host-detalle, finanzas y admin-usuarios muestran el **mismo neto**.
**Estados:** una reserva en cada estado → mismo nombre/color/icono en marketplace, cliente, host y admin; un `external_event` confirmado → mismo color en host y admin.
**Datos:** host marca "no niños"/"+30% finde"/"instantánea" → el cliente lo ve en card **y** detalle; editar cancelación a 24h/100% → persiste (no se resetea a 72h/50%) y el reembolso lo respeta.
**Pro:** host free entra a `/h/[slug]` → `notFound()`; entra a `eventos/nuevo` → preview+upsell, no dead-end; host Pro → badge dorado coherente en sidebar/inicio/pro.
**Estados de carga:** simular fallo de carga en liquidaciones/pagos cliente/CRM → estado de error con reintento (no spinner infinito ni "no hay datos" falso).
**Responsive/a11y:** móvil/tablet/escritorio; textos largos; espacio sin/又 con muchas fotos; contraste AA; navegación por teclado y foco visible.

---

## Confirmación final de la auditoría (estado actual)

- ❌ Lo configurado por el propietario **NO** siempre coincide con el marketplace (permisos 5/10, badges card↔detalle, cancelación hardcodeada, campos huérfanos).
- ⚠️ Lo reservado por el cliente coincide con lo que ve el propietario en el **camino transaccional** (booking.ts), pero **las pantallas de visualización divergen** en neto/estado.
- ❌ Los precios **NO** coinciden en todas las pantallas (liquidaciones/host-detalle/cotizaciones recalculan distinto).
- ❌ Los estados **NO** coinciden en todos los roles (cliente reimplementa colores; payout 4 etiquetas).
- ❌ Los componentes **NO** parecen el mismo producto (admin off-system; sin componentes compartidos).
- ⚠️ Funciones antiguas: hay toggles/campos sin efecto (`is_featured`, cleaning/overtime) — no "rotas" pero muertas.
- ❌ Hay información oculta (campos editables no mostrados) y pantallas que confunden (error=vacío).

**Siguiente paso:** aprobar el plan por fases (o reordenarlo). No aplicaré ningún cambio hasta tu visto bueno.
