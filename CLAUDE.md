@AGENTS.md

# Espot — Marketplace de espacios para eventos en República Dominicana

## Qué es este proyecto
**espot.do** — plataforma para reservar salones, rooftops, restaurantes, villas y más para eventos en RD. El nombre de la marca es **Espot** (no EspotHub). El dominio es espot.do.

## Stack técnico
- **Next.js App Router** (v15+), React 19, TypeScript 5
- **Tailwind CSS v4** — usar variables CSS del tema, NO clases dark de Tailwind
- **Supabase** — Auth + PostgreSQL + Storage + Realtime
- **Azul Payments** — gateway de pagos dominicano (modelo PaymentPage, no API directa)
- **Resend** — emails transaccionales
- **Leaflet** — mapas con marcadores de espacios

## Logo

### Descripción visual
- Wordmark **"espot"** en minúsculas con la "o" reemplazada por un pin de ubicación (mapa) con punto blanco interior
- La tipografía del logo es **TypoGraphica Regular** — letras redondeadas, bold, geométricas
- La "t" tiene un corte diagonal característico en la parte superior derecha
- El pin dentro de la "o" es el símbolo de la marca — siempre respetarlo en cualquier uso

### Archivos en `public/`
| Archivo | Uso |
|---|---|
| `logo-dark.svg` | Logo en navy `#03313C` — fondos claros, headers blancos |
| `logo-green.svg` | Logo en verde `#35C493` — fondos oscuros, hero del marketplace |

### Reglas de uso
- **Fondo oscuro** → usar `logo-green.svg`
- **Fondo claro/blanco** → usar `logo-dark.svg`
- Nunca distorsionar las proporciones — el SVG tiene `viewBox="0 0 1682.16 585.47"`
- Altura mínima: 22px en navbar, 28px en headers
- No recrear el logo en HTML/CSS — siempre usar los archivos SVG

### Dónde se usa en el código
- Navbar del marketplace: `<img src="/logo-green.svg">` (fondo oscuro del footer y nav dark)
- Navbar claro: `<img src="/logo-dark.svg">`
- Páginas de pago y auth: `<img src="/logo-dark.svg">`

## Tipografía oficial (Manual de Marca)

### Sistema de dos fuentes:

**1. TypoGraphica Regular** — fuente de display/headlines
- Fuente comercial, NO es Google Font
- Uso: títulos grandes, hero headlines, logotipo, números destacados
- Peso: Regular (bold visual por diseño de la fuente)
- Estado en el proyecto: ⚠️ PENDIENTE DE INSTALAR — los archivos (.woff2/.ttf) deben agregarse a `public/fonts/`
- Variable CSS objetivo: `--font-typographica`
- Fallback temporal hasta instalar: `var(--font-poppins)` en peso 800/900

**2. Poppins** (Google Fonts) — fuente de UI y cuerpo
- Cargada vía `next/font/google` en `src/app/layout.tsx`
- Variable CSS: `--font-poppins`
- Aplicada en `body` como fuente base
- Dos pesos principales según el manual:
  - **Medium (500)** — subtítulos, labels, botones, elementos de interfaz
  - **Light (300)** — cuerpo de texto, descripciones, texto secundario
- Pesos también disponibles: 400, 600, 700, 800, 900

### Reglas de uso:
- `font-size: 16px` mínimo en todos los inputs (previene zoom en iOS Safari)
- `letter-spacing: -0.02em` a `-0.04em` en títulos grandes
- `font-smoothing: antialiased` activado globalmente
- **Nunca** usar Inter, Geist u otra fuente — solo TypoGraphica + Poppins

### Cómo instalar TypoGraphica (pendiente):
1. Poner archivos en `public/fonts/TypoGraphica-Regular.woff2` (y `.woff` de fallback)
2. Declarar `@font-face` en `globals.css`
3. Agregar `variable: '--font-typographica'` en `layout.tsx` con `next/font/local`
4. Usar en headlines: `font-family: var(--font-typographica)`

## Paleta de colores oficial
- `#35C493` — Verde marca (brand principal, iconos, bordes, UI)
- `#D4FF58` — Lima acento (NO usar en producción hasta decisión del dueño)
- `#03313C` — Navy (textos oscuros, fondos dark)
- Variables CSS: `var(--brand)`, `var(--brand-dim)`, `var(--brand-border)`, `var(--bg-base)`, etc.
- **Regla**: siempre usar variables del tema. Nunca hardcodear colores en componentes nuevos.

## Temas CSS (en globals.css)
- `.light-theme` — Marketplace público (bg #F4F6F5)
- `.dark-theme` — Dashboard cliente (bg #0B0F0E)
- `.host-theme` — Dashboard propietario (bg #F7F8FA)

## Estructura de rutas principales
```
src/app/
├── (marketplace)/          # Público: homepage, buscar, detalle espacio
├── dashboard/(client)/     # Dashboard del cliente (dark-theme)
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
`pending → accepted → confirmed → completed`
`pending → rejected`
`confirmed → cancelled_guest / cancelled_host`
`pending → quote_requested` (para cotizaciones)

## Comisión de la plataforma
**10%** sobre el total de cada reserva. El host recibe el 90% neto después del evento.

## Sistema de pagos
- Flujo: cliente paga → Azul PaymentPage → webhook confirm → liquidación al host
- Archivo clave: `src/lib/azul/client.ts` (HMAC-SHA512)
- El redirect a Azul está en `src/app/api/payments/redirect/[bookingId]/route.ts`
- **Problema conocido**: el redirect a Azul no completa (HMAC field order puede ser incorrecto). Pendiente contactar soporte Azul.

## Convenciones de código
- **Componentes**: usar variables CSS del tema (`var(--brand)`, `var(--bg-base)`)
- **Server Actions**: en `src/lib/actions/` — siempre verificar `auth.getUser()` primero
- **Fechas**: siempre parsear con `T12:00` para evitar bug de timezone UTC-4 (RD)
  - ✅ `new Date(date + 'T12:00')`
  - ❌ `new Date(date)` — da el día anterior a las 8pm en RD
- **revalidatePath**: para invalidar páginas de espacios usar `revalidatePath('/espacios', 'layout')`
- **Supabase client en componentes**: usar `useRef(createClient())`, no `createClient()` en el body

## Archivos más importantes
- `src/components/marketplace/BookingWidget.tsx` — widget multi-paso de reserva (1200+ líneas)
- `src/app/(marketplace)/buscar/BuscarClient.tsx` — página de búsqueda con mapa
- `src/app/(marketplace)/espacios/[slug]/SpaceDetailClient.tsx` — detalle del espacio
- `src/components/map/SpacesMap.tsx` — mapa Leaflet (pins: click usa window.location.href, NO setIcon en hover)
- `src/lib/actions/booking.ts` — lógica de reservas
- `src/lib/payments/schedule.ts` — cálculo de cuotas

## Integraciones activas
| Servicio | Uso | Estado |
|---|---|---|
| Supabase | Auth + DB + Storage | ✅ Funcional |
| Azul Payments | Pagos | ⚠️ Redirect pendiente de fix |
| Resend | Emails | ✅ Funcional |
| Google OAuth | Login social | ✅ Funcional |
| Leaflet | Mapas | ✅ Funcional |
| Google Calendar | Sync opcional | ✅ Implementado |

## Categorías de espacios
`salon`, `restaurante`, `bar`, `rooftop`, `terraza`, `jardin`, `estudio`, `coworking`, `hotel`, `villa`, `otro`

## Roles de usuario
- `guest` — cliente que reserva
- `host` — propietario de espacios
- `admin` — solo enriquehernandezfondeur@gmail.com (superadmin)

## Deploy
- Repositorio: `https://github.com/enriquehernandezfondeur-ux/espot-do.git`
- Branch principal: `main` → Vercel despliega automáticamente
- Dominio: `espothub.com` (dominio actual) + `espot.do` (dominio final)
