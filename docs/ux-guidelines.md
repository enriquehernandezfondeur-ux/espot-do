# UX Guidelines — Espot

## Principios de Diseño
1. **Minimalista sobre decorativo** — cada elemento debe tener una razón de estar
2. **Datos sobre ornamento** — mostrar información útil, no llenar espacio con iconos
3. **Mobile-first** — diseñar para 375px primero, luego escalar
4. **Confianza visual** — el diseño debe transmitir seriedad y profesionalismo
5. **Velocidad percibida** — skeletons, optimistic updates, feedback inmediato

---

## Sistema de Colores

### Paleta principal
| Variable | Valor | Uso |
|----------|-------|-----|
| `--brand` | `#35C493` | CTAs, iconos activos, bordes de foco |
| `--brand-dark` | `#28A87C` | Hover sobre brand |
| `--brand-dim` | `rgba(53,196,147,0.10)` | Fondos sutiles de elementos activos |
| `--brand-border` | `rgba(53,196,147,0.25)` | Bordes de contenedores brand |
| `--brand-navy` | `#03313C` | Textos oscuros, headers, fondos dark |
| `--brand-lime` | `#D4FF58` | Acento (reservado — NO usar en producción sin aprobación) |

### Temas
| Tema | Clase | Bg base | Uso |
|------|-------|---------|-----|
| Light | `.light-theme` | `#F4F6F5` | Marketplace público |
| Dark | `.dark-theme` | `#0B0F0E` | Dashboard cliente |
| Host | `.host-theme` | `#F7F8FA` | Dashboard propietario |

### Regla absoluta
**Siempre usar variables CSS del tema.** Nunca hardcodear colores en componentes.
```tsx
// CORRECTO
style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)' }}

// INCORRECTO
style={{ color: '#03313C', background: '#ffffff' }}
```

---

## Tipografía

### Fuentes
| Fuente | Variable | Uso |
|--------|----------|-----|
| **Poppins** | `--font-poppins` | UI base — todo el texto |
| **TypoGraphica** | `--font-typographica` | Headlines grandes (pendiente instalación) |

### Escala tipográfica
| Clase Tailwind | Tamaño | Uso |
|----------------|--------|-----|
| `text-xs` | 12px | Labels, badges, metadata |
| `text-sm` | 14px | Body text, descripciones |
| `text-base` | 16px | Body text principal |
| `text-lg` | 18px | Subtítulos |
| `text-xl` | 20px | Títulos de sección |
| `text-2xl`+ | 24px+ | Hero headlines, títulos de página |

### Regla crítica de mobile
**Todos los inputs y textareas deben tener `fontSize: 16`** (16px mínimo).
Menos de 16px causa zoom automático en iOS Safari al enfocar el campo.

```tsx
// CORRECTO
<input style={{ fontSize: 16 }} className="input-base" />

// INCORRECTO — causa zoom en iPhone
<input className="input-base text-sm" />  // text-sm = 14px
```

---

## Componentes de Layout

### Cards estándar
```tsx
<div className="rounded-2xl p-5"
  style={{ background: '#fff', border: '1px solid var(--border-subtle)' }}>
```

### Cards con header
```tsx
<div className="rounded-2xl overflow-hidden"
  style={{ border: '1px solid var(--border-subtle)' }}>
  <div className="px-5 py-3.5"
    style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
      Título de sección
    </p>
  </div>
  <div className="p-5">contenido</div>
</div>
```

### Filas de datos (tabla limpia)
Para mostrar info estructurada (detalles de reserva, finanzas, etc.):
```tsx
<div className="flex items-baseline gap-4 px-5 py-3"
  style={{ borderTop: '1px solid var(--border-subtle)' }}>
  <span className="text-xs font-medium shrink-0 w-20" style={{ color: 'var(--text-muted)' }}>
    Label
  </span>
  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
    Valor
  </span>
</div>
```

### Botón primario (CTA)
```tsx
<button className="btn-brand px-6 py-3 rounded-2xl font-bold text-sm">
  Acción
</button>
```

### Botón secundario
```tsx
<button className="btn-outline px-5 py-2.5 rounded-xl text-sm font-semibold">
  Secundario
</button>
```

---

## Iconos
- **Librería:** Lucide React — exclusiva
- **Tamaños estándar:** 13px (inline), 15px (buttons), 18px (features), 24px (hero)
- **Nunca** usar emojis en la UI — reemplazar siempre con iconos Lucide equivalentes
- **Nunca** usar emojis en mensajes del sistema o notificaciones

---

## Patrones de UX

### Feedback de estado
| Estado | Visual |
|--------|--------|
| Cargando | `animate-pulse` skeleton o `Loader2 animate-spin` |
| Éxito | CheckCircle verde + texto de confirmación |
| Error | Texto rojo + descripción del error |
| Guardado | Badge "Guardado" verde que desaparece en 2.5s |
| Warning | Texto `#D97706` ámbar |

### Tap targets (mobile)
Todos los elementos interactivos deben ser al menos **44×44px** en mobile.
```tsx
// CORRECTO
<button className="w-10 h-10 flex items-center justify-center">

// INCORRECTO — muy pequeño para el dedo
<button className="w-6 h-6">
```

### Modales y bottom sheets
- Siempre usar `100dvh` (no `100vh`) para height en mobile
- Siempre `pb-safe` o `padding-bottom: max(Xpx, env(safe-area-inset-bottom))`
- El overlay siempre `z-50`, el contenido `z-[51]+`

### Scroll en iOS
Para contenedores scrolleables en iOS:
```tsx
style={{ WebkitOverflowScrolling: 'touch', overflowY: 'auto' }}
```

---

## Anti-patrones (lo que NO hacer)

### Visual
- ❌ Icon-boxes verdes repetitivos para cada dato (usa tabla label:valor)
- ❌ Múltiples colores de fondo en la misma sección (morado + ámbar + azul = ruido)
- ❌ Badges/pills para cada pieza de información
- ❌ Secciones de "tips obvios" (ej: "Llega 15 min antes") que no aportan valor
- ❌ Fondos `brand-dim` en elementos que no son CTAs o estados activos

### Técnico
- ❌ `overflow-x: hidden` en el layout root (rompe `position: sticky`)
- ❌ `100vh` en mobile (usar `100dvh`)
- ❌ recrear marcadores de Google Maps en hover (rompe el click) — reusar refs y solo `setIcon()`
- ❌ `createClient()` en el body del componente (usar `useRef`)
- ❌ `new Date(dateString)` sin `T12:00` (timezone bug en RD)

---

## Responsive Breakpoints (Tailwind)
| Prefijo | Ancho mínimo | Dispositivo |
|---------|-------------|-------------|
| (none) | 0px | Mobile (375px base) |
| `sm:` | 640px | Tablet portrait |
| `md:` | 768px | Tablet landscape |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Desktop grande |

---

## Bottom Navigation (Marketplace Mobile)
El marketplace tiene una barra de navegación inferior fija para usuarios logueados:
- **Contenido:** Inicio / Buscar / Panel / Mensajes / Cuenta
- **Z-index:** `z-40`
- **Safe area:** `pb-safe` (respeta home indicator de iPhone)
- **Espacio de contenido:** `pb-[calc(5rem+env(safe-area-inset-bottom))]`

---

## Carga de Imágenes
- **Fotos de espacios:** `<img loading="lazy">` con aspect-ratio fijo
- **Hero / cover:** `loading="eager"` para LCP
- **Fallback:** Si no hay foto → gradiente `#03313C → #0D4A3A` con icono de categoría
- **Alt obligatorio:** Siempre descriptivo (`alt={space.name}`)

---

## Loading States
**Ninguna página debe mostrar pantalla en blanco con spinner.**
Usar skeletons que imiten la forma de la página real:
```tsx
if (loading) return (
  <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 animate-pulse">
    <div className="h-7 w-48 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 rounded-2xl" style={{ background: 'var(--bg-elevated)' }} />
      ))}
    </div>
  </div>
)
```
