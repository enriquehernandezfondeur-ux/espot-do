# Organiza con Espot — Diseño (Spec)

> Feature **gratuita** de Espot 2.0. Convierte Espot de "encuentra y reserva un espacio"
> en "encuentra el espacio **y** organiza lo que pasa dentro".
> Lema: *"Encuentra el espacio y organiza todo desde Espot."*
>
> Estado: **diseño aprobado** (2026-06-20). No implementar hasta completar
> `/design-consultation` → `/spec` → `/plan-ceo-review` → `/plan-design-review` → `/writing-plans`.

---

## 1. Objetivo y alcance

El cliente (`guest`) crea una **actividad** de cualquier tipo (podcast, sesión de fotos,
taller, reunión, casting/entrevista, cena privada, cumpleaños, networking, producción de
equipo, otros), la conecta a una **reserva/espacio de Espot** o a una **ubicación externa**,
genera una **página pública compartible**, invita por **link/WhatsApp**, recibe
**confirmaciones sin que los invitados creen cuenta**, gestiona **participantes y
acompañantes**, envía **recordatorios** y hace **check-in con QR** cuando aplica.

**Principio rector:** UNA estructura común con **campos y plantillas configurables por
tipo** — no un formulario distinto por caso. Móvil-first, pocos pasos, sin formularios
infinitos, nativa de Espot (mismos colores, tipografía, componentes).

**Nombre:** feature = "Organiza con Espot"; etiqueta de menú = **"Actividades"**.

### En el MVP
Crear/editar actividades · plantillas por tipo · página pública compartible · confirmar sin
cuenta · lista de participantes · acompañantes · preguntas personalizadas · compartir por
WhatsApp/link · recordatorios · QR · check-in móvil · vincular a reservas/espacios ·
duplicar/cancelar.

### Fuera del MVP (no construir)
Venta de entradas · pagos entre invitados · aportes grupales · proveedores/suministros ·
liquidaciones · eventos públicos masivos.

---

## 2. Flujo de usuario

### Organizador (cliente con cuenta)
```
Mis actividades → + Crear actividad
  1. Tipo (grid con iconos)
  2. Detalles (nombre · fecha · horario · # personas)
  3. Ubicación:
       ├─ Vincular una reserva existente (Espot)
       ├─ Buscar un espacio en Espot (recomendados por fecha/aforo/ciudad/presupuesto/tipo)
       └─ Ubicación externa (dirección manual)
  4. Detalle de la actividad → tabs:
       Resumen · Preguntas · Participantes · Compartir · Check-in
```

### Invitado (sin cuenta)
```
Abre el link → /a/[code]
  Ve: portada, nombre, fecha/hora, ubicación (mapa), organizador
  Llena: nombre · # acompañantes · preguntas del tipo (alergias, empresa, rol…)
  Confirma → "¡Confirmado!" (queda en la lista del organizador)
```

---

## 3. Mapa de pantallas

**Privadas (cliente, `white-theme`, dentro del dashboard):**

| # | Pantalla | Ruta |
|---|----------|------|
| 1 | Mis actividades (lista) | `dashboard/(client)/actividades` |
| 2 | Crear actividad (wizard 3 pasos) | `…/actividades/nueva` |
| 3 | Detalle / gestión (tabs) | `…/actividades/[id]` |
| 4 | Tab Participantes | (en el detalle) |
| 5 | Tab Preguntas | (en el detalle) |
| 6 | Tab Compartir (link/QR/WhatsApp) | (en el detalle) |
| 7 | Check-in (vista móvil) | `…/actividades/[id]/checkin` |

**Pública (sin auth, tema público limpio tipo `t/[slug]`):**

| # | Pantalla | Ruta |
|---|----------|------|
| 8 | Página pública de la actividad + RSVP | `/a/[code]` |

**Puntos de entrada (sin pantallas nuevas):**
- Detalle de reserva del cliente → botón **"Organizar actividad"** (precarga reserva + espacio).
- Marketplace / detalle de espacio → **"Crear actividad"**.
- Sidebar del cliente → **"Actividades"**.

---

## 4. Arquitectura técnica

- **Plantillas en código** (no en BD): `src/lib/activities/templates.ts` — mapa
  `tipo → { label, icon, preguntas[] }`. YAGNI: sin tabla de plantillas en el MVP.
- **Server actions**:
  - `src/lib/actions/activities.ts` — CRUD del organizador, verifica `auth.getUser()`.
  - `src/lib/actions/activity-public.ts` — lectura pública por `code` + alta de participante,
    vía **service-role** (mismo patrón que `t/[slug]`).
  - `src/lib/actions/activity-host.ts` — panel de preparación read-only para el host
    (solo campos no-PII, gateado por propiedad del espacio/reserva enlazada).
- **Página pública** `/a/[code]`: `export const dynamic = 'force-dynamic'` + `notFound()`
  si no existe o `public_enabled = false`.
- **Recomendación de espacios:** reutiliza la búsqueda existente (fecha/aforo/ciudad/
  categoría) y `SpaceCard`.
- **QR:** librería ligera para el QR del link público (cliente).
- **Compartir:** `wa.me` + Web Share API (gratis). **Recordatorios:** reutilizan
  `src/lib/whatsapp/send.ts` y el cron existente (Twilio tiene costo — usar con criterio).
- **Componentes nuevos mínimos:** `ActivityCard`, `ActivityTypePicker`, `ParticipantList`,
  `ActivityPublicView`, `ShareSheet`, `CheckinList`. Todo lo demás se reutiliza
  (`AppSidebar`, `SpaceCard`, `StatusBadge`, `EmptyState`, `Skeleton`, `LoadError`,
  `Pagination`, `FilterDropdown`, `ConfirmDialog`/`useConfirm`).
- **Parseo de fechas:** `new Date(date + 'T12:00')` (bug timezone RD UTC-4).

---

## 5. Datos y relaciones

```
profiles(id) ──organizer_id──┐
                             ▼
                       ┌───────────┐
        bookings(id)◄──│ activities│──►spaces(id)   (vínculos opcionales)
                       └─────┬─────┘
              ┌──────────────┼───────────────┐
              ▼              ▼                ▼
   activity_questions  activity_participants  (public_code → /a/[code])
```

Migración nueva (convención del dir activo `supabase/migrations/`): `YYYYMMDD_activities.sql`.

### `activities`
`id uuid pk` · `organizer_id → profiles(id)` · `type text` · `title text` ·
`description text` · `status text` ('borrador'|'publicada'|'en_curso'|'finalizada'|'cancelada') ·
`event_date date` · `start_time time` · `end_time time` · `expected_people int` ·
`location_mode text` ('booking'|'space'|'external') · `booking_id → bookings(id)` (null) ·
`space_id → spaces(id)` (null) · `external_location text` (null) · `cover_image text` (null) ·
`public_code text único` · `public_enabled bool` · `allow_companions bool` ·
`require_checkin bool` · `created_at` · `updated_at`.

### `activity_questions` (precargadas desde la plantilla del tipo, editables)
`id` · `activity_id → activities(id) ON DELETE CASCADE` · `label text` ·
`field_type text` ('text'|'choice'|'boolean'|'number') · `options jsonb` (null) ·
`required bool` · `sort_order int`.

### `activity_participants` (RSVP sin cuenta)
`id` · `activity_id → activities(id) ON DELETE CASCADE` · `name text` · `contact text` (opcional) ·
`status text` ('invitado'|'confirmado'|'rechazado'|'registrado') · `companions int default 0` ·
`answers jsonb` · `rsvp_token text único` · `checked_in_at timestamptz` (null) · `created_at`.

### RLS
- `activities` / `activity_questions` / `activity_participants`: CRUD solo del
  `organizer_id = auth.uid()`.
- Lectura/alta pública: **solo** vía service-role en `activity-public.ts`, gateada por
  `public_enabled = true`.
- Plantillas = código, sin tabla.
- `public_code`: generador corto anti-colisión (base62, ~8 chars).

---

## 6. Permisos

| Acción | Cliente (organizador) | Propietario (host) | Admin |
|---|---|---|---|
| Crear/editar/cancelar actividad | ✅ las suyas | ❌ | — |
| Ver participantes y datos privados | ✅ | ❌ **nunca** | soporte |
| Ver info de **preparación** (fecha, hora, # personas, tipo, notas "para el espacio") | ✅ | ✅ **solo si la actividad enlaza su reserva/espacio**, lectura | ✅ |
| Confirmar asistencia (sin cuenta) | — | — | invitado vía link |
| Moderar / soporte | — | — | ✅ |

El host ve un **panel de preparación de solo lectura** con lo justo para alistar el espacio —
**sin PII de invitados**. Se implementa con un server action específico (`activity-host.ts`),
no con RLS amplia.

---

## 7. Integración marketplace + CRM

- **Marketplace:** "Crear actividad" desde el detalle de espacio; el wizard recomienda
  espacios reales (búsqueda existente + `SpaceCard`); al vincular un espacio se autorrellenan
  dirección, fotos, aforo y reglas.
- **Reservas del cliente:** botón "Organizar actividad" en el detalle de reserva → actividad
  precargada con `booking_id`.
- **CRM del host:** la actividad enlazada aparece como panel de preparación read-only sobre
  la reserva. **No** se mezcla con `external_events` (eventos manuales del host); solo se
  relacionan por `booking_id`/`space_id`.

---

## 8. Plan por fases

- **F0 — Cimientos:** migración `YYYYMMDD_activities.sql` (3 tablas + RLS + índices), tipos TS,
  `templates.ts`, esqueleto de server actions.
- **F1 — Crear y listar:** "Mis actividades" (lista + EmptyState) + wizard (tipo → detalles →
  ubicación: externa / vincular reserva / elegir espacio) + Detalle/Resumen. Entrada en sidebar.
- **F2 — Participantes y preguntas:** plantillas por tipo, alta manual, tab Participantes con
  estados y acompañantes.
- **F3 — Página pública + RSVP:** `/a/[code]`, confirmar sin cuenta, acompañantes,
  confirmaciones reflejadas en la lista. Anti-abuso (rate limit, tope acompañantes).
- **F4 — Compartir + recordatorios:** link, QR, `wa.me`/Web Share; recordatorios reutilizando
  cron + Twilio.
- **F5 — Check-in:** vista móvil de registro de entrada (+ QR por participante opcional),
  duplicar/cancelar.
- **F6 — Integración host + recomendación:** panel de preparación read-only para el host;
  afinar recomendación de espacios y los puntos de entrada (reserva, marketplace).

---

## 9. Riesgos y mitigaciones

- **Abuso del RSVP público (sin auth):** límite de tasa, tope de acompañantes, captcha
  opcional desde F3.
- **Privacidad:** por diseño el host nunca ve PII de invitados (server action de
  solo-preparación, no RLS abierta).
- **No duplicar `external_events`:** la actividad es entidad del cliente; relación por
  `booking_id`/`space_id`, no fusión.
- **Scope creep:** mantener fuera entradas, pagos entre invitados, aportes, proveedores,
  liquidaciones, eventos masivos.
- **WhatsApp:** `wa.me`/Web Share (gratis) para compartir; Twilio solo para recordatorios
  (costo) — reutilizar lo existente.
- **Tema público:** `/a/[code]` con tema público limpio (patrón `t/[slug]`), no el
  `white-theme` del dashboard.

---

## 10. Componentes reutilizables (inventario de auditoría)

| Pieza | Ubicación | Uso en la feature |
|---|---|---|
| `AppSidebar` | base de sidebars cliente/host | añadir item "Actividades" |
| `SpaceCard` | marketplace | recomendación de espacios en el wizard |
| `FilterDropdown` | `src/components/ui/FilterDropdown.tsx` | filtros de lista |
| `ConfirmDialog`/`useConfirm` | `src/components/ui/ConfirmDialog.tsx` | cancelar/eliminar |
| `EmptyState`, `Skeleton`, `LoadError`, `Pagination`, `StatusBadge` | `src/components/ui` | listas/estados |
| Búsqueda de `BookingWidget` | marketplace | motor de recomendación |
| Patrón `t/[slug]` | `src/app/t/[slug]/page.tsx` | base de la página pública `/a/[code]` |
| `whatsapp/send.ts` + cron | `src/lib/whatsapp` | recordatorios |
| `pricing.ts` | `src/lib/pricing.ts` | precio del espacio recomendado |
