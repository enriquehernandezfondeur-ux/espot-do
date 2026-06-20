# QA en producción — Espot 2.0 / Pro · 2026-06-20

> Recorrer en **espot.do logueado** (las pantallas con login no se pueden verificar por build).
> Marca `[x]` lo que pase. Lo que falle: anota pantalla + qué viste.

## 🥇 P1 — Gating Pro (lo más crítico)

Probar con cuenta host **gratuita** y host **Pro** (o usar admin para activar/desactivar Pro a una cuenta de prueba).

### Host GRATUITO
- [ ] `/dashboard/host/eventos/nuevo` → banner `ProUpsell` + submit **deshabilitado**
- [ ] Sidebar → ítem "Espot Pro" con pill **"Mejora"** + icono de marca
- [ ] Eventos externos y Clientes (CRM) → **vista previa solo-lectura**, sin crear/editar; datos existentes visibles
- [ ] Analytics → KPIs **Clics/CTR gateados** (analítica básica sigue gratis)
- [ ] `/dashboard/host/pro` → comparativa + "estás en el plan gratuito" + CTA

### Host PRO
- [ ] Sidebar muestra **👑 corona** en el perfil
- [ ] Crea/edita eventos externos y clientes sin trabas
- [ ] Analytics muestra Clics/CTR con datos
- [ ] `/dashboard/host/pro` → estado activo tintado + sección "Tu tarjeta digital"

## 🥇 P2 — Color Pro dorado/ámbar (`--pro: #B8860B`)
- [ ] PlanBadge, corona + pill "Mejora" del sidebar
- [ ] `ProUpsell` banners
- [ ] Banner de Inicio
- [ ] Página `/dashboard/host/pro` completa
- [ ] Badge de la tarjeta digital
- [ ] Panel admin Pro (`/admin/pro`)
- [ ] Criterio dueño: "llamativo pero no tanto, acorde a Espot"

## 🥈 P3 — Tarjeta digital + QR
- [ ] `/t/[slug]` host **Pro** → QR + "Solicitar fecha" + compartir
- [ ] `/t/[slug]` host **gratuito** → **404**
- [ ] `/h/[slug]` microsite → mismo gating Pro
- [ ] QR escaneado abre la URL correcta

## 🥈 P4 — Admin Pro (`/admin/pro`)
- [ ] KPIs cargan (MRR solo Pro activos pagados por Azul)
- [ ] Tabla + 12 filtros + búsqueda + copiar correos + CSV
- [ ] `/admin/pro/[id]` → 1-2 acciones → quedan en **audit log** + línea de tiempo
- [ ] Acción se refleja en panel host **sin re-login**
- [ ] Toggle de prueba automática **apagado**

## 🥉 P5 — Cohesión / dinero
- [ ] Liquidaciones: comisión + neto = total; sin spinner infinito
- [ ] Estados pago/payout/eventos: mismos colores/etiquetas host↔admin
- [ ] Detalle: cancelación coincide con política (flexible/moderada/estricta)
- [ ] Categorías wellness/popup en home (verificable sin login ✅)
- [ ] Flujo precio **por hora** en crear/editar espacio + flag consumible
