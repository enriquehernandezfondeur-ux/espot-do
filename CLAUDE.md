@AGENTS.md

# Espot — Marketplace de espacios para eventos en República Dominicana

> **espot.do** — plataforma para reservar salones, rooftops, restaurantes, villas y más para eventos en RD. Marca: **Espot**. Dominio: espot.do.
>
> Este `CLAUDE.md` tiene dos partes: (1) **reglas de gobernanza, diseño, datos, seguridad y gstack** (de cumplimiento obligatorio) y (2) la **referencia técnica** del proyecto (stack, marca, rutas, pagos, etc.).

---

## Espot — reglas de gobernanza (negocio)

* Espot es un **marketplace y SaaS** para la **gestión y reserva de espacios** para eventos.
* El modelo de datos conecta: **propietarios (hosts), espacios, sedes, usuarios (guests), reservas (bookings), calendarios, pagos, disponibilidad y recursos**. Toda información debe tener **trazabilidad y relaciones claras**.
* Debe manejar **reservas por hora, por día, por persona o por consumo mínimo** según el tipo de pricing del espacio (`hourly`, `minimum_consumption`, `fixed_package`, `custom_quote`).
* Debe **respetar calendarios, bloqueos, capacidades, precios y disponibilidad** — nunca sobre-reservar ni ignorar un bloqueo.
* Deben mantenerse **separados** el **marketplace público**, el **panel del propietario (host)** y la **administración interna (admin)**.
* **No alterar pagos, reservas ni disponibilidad en producción sin autorización.**
* **No duplicar** espacios, reservas, propietarios ni usuarios.
* Todo cambio de base de datos debe hacerse mediante **migraciones controladas** (`supabase/migrations/`).
* **No hacer push, merge, deploy ni cambios en producción automáticamente.**
* **Espot y PuntualPago son proyectos completamente separados** (Supabase, repos, tokens y variables de entorno distintos). Nunca mezclar configuraciones, credenciales ni datos entre ellos.

## Diseño y experiencia de usuario

* Mantener el **branding actual de Espot** (logo, colores `#35C493` / `#03313C`, tipografías TypoGraphica + Poppins — ver referencia técnica).
* No cambiar colores, tipografías ni identidad sin autorización.
* Usar **siempre variables CSS del tema** (`var(--brand)`, `var(--bg-base)`, etc.); nunca hardcodear colores.
* Priorizar legibilidad, jerarquía visual, buen contraste y facilidad de uso.
* Evitar espacios vacíos excesivos, letras pequeñas (inputs `font-size: 16px` mínimo) y pantallas incompletas.
* Validar siempre en **laptop, tablet y móvil**, y en los tres temas (`.light-theme`, `.white-theme`, `.host-theme`).
* No rediseñar todo el sistema por iniciativa propia: aplicar mejoras en **una sola pantalla** y comprobar resultados antes de extender.

## Formularios y datos

* Validar los formularios en **frontend y backend** (Server Actions verifican `auth.getUser()` primero).
* Evitar formularios innecesariamente largos; usar pasos, secciones, desplegables y valores por defecto cuando ayuden (ej. el `BookingWidget` multi-paso).
* Mostrar mensajes claros de error y confirmación.
* No guardar registros incompletos sin indicar su estado (respetar la máquina de estados de reserva).
* Revisar las **relaciones entre host, espacio, reserva, usuario, pago y disponibilidad** antes de cualquier cambio.

## Seguridad

* Nunca mostrar secretos, tokens o contraseñas completos.
* **No incluir credenciales en archivos versionados** (ni en `.claude/settings*.json`, ni en `.mcp.json`). *(Ver `PENDIENTES_MANUALES.md`: hay un token de Resend expuesto por rotar.)*
* No hacer cambios en producción sin autorización.
* No ejecutar migraciones destructivas (`supabase db reset/push`, `dropdb`).
* No realizar commits, push, merge o despliegues automáticamente.
* Solicitar aprobación antes de cualquier acción irreversible.
* Estas reglas están reforzadas por las reglas `deny` en `.claude/settings.json` (ver `POLITICA_DE_SEGURIDAD_CLAUDE.md`).

## Uso de gstack

gstack (global) se usa principalmente para: **planificación, revisión de producto, revisión técnica, investigación de errores, revisión de código, QA en navegador y documentación de cambios.**

Usa `/browse` para: recorrer visualmente el marketplace, el panel del host y el admin; comprobar flujos de reserva; validar responsive; revisar formularios; reproducir errores; pruebas de UX.

**No** uses `/browse` como reemplazo de: consultas a Supabase/Postgres, revisión del código fuente, análisis de migraciones, ni herramientas más precisas.

Prioriza: `/autoplan`, `/plan-ceo-review`, `/plan-eng-review`, `/review`, `/investigate`, `/qa-only`, `/document-generate`, `/document-release`.

**No** utilices `/ship`, despliegues automáticos ni acciones que hagan push hasta autorización explícita. (Las 12 skills de alto riesgo ya están en modo manual-only a nivel global.)

## Estado de las herramientas opcionales

* No instalar `gbrain` por ahora.
* No instalar los hooks de `plan-tune` por ahora.
* No instalar Homebrew/`coreutils` solo por gstack, salvo problema real.
* Documentar estas opciones como pendientes, no como errores críticos.

---

# Referencia técnica del proyecto

## Stack técnico
- **Next.js App Router** (16.2.6), React 19, TypeScript 5
- **Tailwind CSS v4** — usar variables CSS del tema, NO clases dark de Tailwind
- **Supabase** — Auth + PostgreSQL + Storage + Realtime *(proyecto Supabase de Espot; ver `MCP_ESPOT.md`)*
- **Azul Payments** — gateway de pagos dominicano (modelo PaymentPage, no API directa)
- **Resend** — emails transaccionales
- **Twilio** — WhatsApp transaccional (sí se usa en Espot)
- **Sentry** — monitoreo de errores
- **next-intl** — internacionalización
- **Google Maps** — mapas con marcadores de espacios

## Logo
- Wordmark **"espot"** en minúsculas con la "o" como pin de ubicación. Tipografía del logo: **TypoGraphica Regular**.
- `public/logo-dark.svg` (navy `#03313C`, fondos claros) · `public/logo-green.svg` (verde `#35C493`, fondos oscuros).
- Fondo oscuro → `logo-green.svg`; fondo claro → `logo-dark.svg`. Nunca distorsionar (`viewBox="0 0 1682.16 585.47"`). Altura mínima 22px navbar / 28px headers. No recrear en HTML/CSS.

## Tipografía oficial
- **TypoGraphica Regular** — display/headlines (comercial, NO Google Font). ✅ INSTALADA: `public/fonts/typographica.woff2` + `.woff`, cargada vía `@font-face` en `globals.css` y expuesta como `--font-display`/`.font-display`. Fallback `var(--font-poppins)` 800/900.
- **Poppins** (Google Fonts) — UI y cuerpo, vía `next/font/google` en `src/app/layout.tsx` (`--font-poppins`). Medium (500) para UI; Light (300) para cuerpo.
- `font-size: 16px` mínimo en inputs (anti-zoom iOS). `letter-spacing: -0.02em..-0.04em` en títulos. Nunca usar Inter/Geist.

## Paleta de colores oficial
- `#35C493` Verde marca · `#D4FF58` Lima acento (NO usar en prod hasta decisión del dueño) · `#03313C` Navy.
- Variables: `var(--brand)`, `var(--brand-dim)`, `var(--brand-border)`, `var(--bg-base)`, etc. Siempre usar variables del tema.

## Temas CSS (globals.css)
- `.light-theme` — solo homepage `/` (NO tocar) · `.white-theme` — buscar, detalle, dashboard cliente, pagos · `.host-theme` — dashboard propietario · `.dark-theme` — definida pero no usada.

## Estructura de rutas principales
```
src/app/
├── (marketplace)/          # Público: homepage, buscar, detalle espacio
├── dashboard/(client)/     # Dashboard del cliente (white-theme)
├── dashboard/host/         # Dashboard del propietario (host-theme)
├── admin/                  # Consola de administrador
├── pago/                   # Flujo de pagos (exitoso, fallido, cancelado)
├── auth/                   # Login, registro, reset
└── api/                    # Rutas API (payments, availability, cron)
```

## Tipos de pricing de espacios
1. `hourly` — precio por hora (min/max horas)
2. `minimum_consumption` — consumo mínimo garantizado
3. `fixed_package` — paquete fijo con horas incluidas
4. `custom_quote` — cotización personalizada

## Estados de reserva (booking)
`pending → accepted → confirmed → completed` · `pending → rejected` · `confirmed → cancelled_guest / cancelled_host` · `pending → quote_requested`.

## Comisión de la plataforma
**10%** sobre el total de cada reserva. El host recibe el 90% neto después del evento.

## Sistema de pagos
- Flujo: cliente paga → Azul PaymentPage → webhook confirm → liquidación al host.
- Archivo clave: `src/lib/azul/client.ts` (HMAC-SHA512). Redirect en `src/app/api/payments/redirect/[bookingId]/route.ts`.
- **Problema conocido**: el redirect a Azul no completa (orden de campos del HMAC). Pendiente soporte Azul.

## Convenciones de código
- Componentes: variables CSS del tema. Server Actions en `src/lib/actions/` (verificar `auth.getUser()`).
- Fechas: parsear con `T12:00` (bug timezone UTC-4 RD). ✅ `new Date(date + 'T12:00')` ❌ `new Date(date)`.
- `revalidatePath('/espacios', 'layout')` para invalidar espacios. Supabase en componentes: `useRef(createClient())`.

## Archivos más importantes
- `src/components/marketplace/BookingWidget.tsx` (1200+ líneas) · `src/app/(marketplace)/buscar/BuscarClient.tsx` · `src/app/(marketplace)/espacios/[slug]/SpaceDetailClient.tsx` · `src/components/map/SpacesMap.tsx` · `src/lib/actions/booking.ts` · `src/lib/payments/schedule.ts`.

## Integraciones activas
| Servicio | Uso | Estado |
|---|---|---|
| Supabase | Auth + DB + Storage | ✅ |
| Azul Payments | Pagos | ⚠️ Redirect pendiente |
| Resend | Emails | ✅ |
| Twilio | WhatsApp | ✅ |
| Google OAuth | Login social | ✅ |
| Google Maps | Mapas | ✅ |
| Google Calendar | Sync opcional | ✅ |

## Categorías de espacios
`salon`, `restaurante`, `bar`, `rooftop`, `terraza`, `jardin`, `estudio`, `coworking`, `hotel`, `villa`, `otro`.

## Roles de usuario
- `guest` — cliente que reserva · `host` — propietario de espacios · `admin` — superadmin.

## WhatsApp (Twilio)
- Módulo: `src/lib/whatsapp/send.ts`. ENV en Vercel: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.
- Notificaciones: nueva solicitud (host), reserva aceptada con link de pago (guest), primer pago confirmado (guest+host), cuota vence mañana (cron), recordatorio 24h pre-evento (cron). Sin `TWILIO_ACCOUNT_SID` → se simulan en consola.

## Cron Jobs
- `src/app/api/cron/payment-reminders/route.ts`, configurado en `vercel.json` (9am RD / 13:00 UTC), protegido con `CRON_SECRET`.
- Tareas: marcar cuotas `overdue`; auto-cancelar `accepted+unpaid` >72h; recordatorios 7d/1d; pre-evento 24h; reseña 24-48h post; SLA host 48h.

## Deploy
- Repo: `https://github.com/enriquehernandezfondeur-ux/espot-do.git`. Branch `main` → Vercel auto-deploy. Dominio: `espot.do`.
- ⚠️ El deploy/push **no debe ejecutarse automáticamente** por Claude (ver gobernanza y `POLITICA_DE_SEGURIDAD_CLAUDE.md`).
