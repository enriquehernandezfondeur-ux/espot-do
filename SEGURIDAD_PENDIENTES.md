# Seguridad — pendientes (auditoría 2026-06-26)

Auditoría completa de seguridad del 26-jun-2026. La mayoría de hallazgos ya están
arreglados y desplegados (ver más abajo). Aquí quedan **solo los pendientes**, porque
requieren una acción manual, una decisión, o pruebas en un entorno real.

> Contexto completo en la memoria del proyecto: `espot-seguridad-2026-06-26.md`.

---

## 🟡 Pendientes de CÓDIGO (requieren tu validación antes de mergear)

### M-5 — CSP: quitar `'unsafe-inline'` y `'unsafe-eval'` de `script-src`
- **Dónde:** `next.config.ts:53` (header estático).
- **Por qué falta:** hacerlo bien exige migrar la CSP a **nonce vía middleware** (`proxy.ts`),
  y deben seguir funcionando: scripts de hidratación de Next, el loader de Google Maps
  (inyecta `<script>` dinámicamente), Places y el widget de behold.so.
- **Riesgo:** un CSP mal puesto **tumba espot.do** (pantalla en blanco / mapas rotos),
  de forma silenciosa. La API key de Maps suele estar restringida por dominio, así que
  un test en localhost NO es concluyente.
- **Plan correcto (otro día):**
  1. Implementar CSP con nonce por request en `proxy.ts`:
     `script-src 'self' 'nonce-<nonce>' 'strict-dynamic' https:` (sin unsafe-inline/eval).
  2. Desplegar a un **preview de Vercel** (no a `main`).
  3. Verificar en el navegador, en el preview: homepage, `/buscar` (mapa), detalle de
     espacio (mapa), y `LocationPicker` del host (Places autocomplete). Revisar la consola
     por violaciones de CSP y que los mapas carguen.
  4. Solo si todo OK → merge a `main`.
- **Severidad:** Media (defensa en profundidad). Hoy NO hay vector XSS activo: React escapa
  por defecto, no hay `dangerouslySetInnerHTML`, y los sinks de email/uploads ya se taparon.

### B-3 — Email superadmin: fail-closed en vez de fallback hardcodeado
- **Dónde:** múltiples archivos con `process.env.SUPERADMIN_EMAIL ?? 'enriquehernandezfondeur@gmail.com'`
  (p.ej. `admin/migrate`, `fix-pricing`, `cleanup-spaces`, `payments/confirm`, `host-application.ts`).
- **Qué falta:** que el control de superadmin **falle cerrado** si la env var no está,
  en vez de caer a un email hardcodeado.
- **Por qué no se hizo:** si `SUPERADMIN_EMAIL` NO está en Vercel, activar el fail-closed
  **te deja sin acceso admin**.
- **Acción (otro día):** confirmar que `SUPERADMIN_EMAIL` está seteada en Vercel → avisar
  y se activa el fail-closed (cambio de 1 minuto). **Severidad: Baja.**

---

## 🔧 Pendientes de CONFIGURACIÓN (paneles externos — solo tú)

1. **Vercel env (cierra M-6 del todo):**
   - `PREVIEW_HMAC_SECRET` → poner un secreto de alta entropía (el código ya lo lee).
   - `SITE_PASSWORD` → reemplazar `279805` por una passphrase fuerte (gate de preview privado).
2. **Rotar token de Resend** — `re_…HYP` estuvo expuesto; revocar en resend.com y poner el
   nuevo en `RESEND_API_KEY` (Vercel + `.env.local`).
3. **Secretos del MCP global + PAT de GitHub** — sacar de texto plano de `~/.claude/mcp.json`
   y **regenerar el PAT de GitHub** (estuvo expuesto).

---

## ✅ Ya arreglado y desplegado (referencia)

- **A-1 (Alta):** enlace de pago de evento usa `payment_token` no adivinable (migración aplicada).
- **M-1:** `getApplication/getApplications` exigen `assertAdmin()`.
- **M-2:** validación UUID en `messages.ts` (evita PostgREST filter injection).
- **M-3:** validación de uploads (allowlist MIME + tamaño + ext del MIME).
- **M-4:** check de Origin (CSRF) en rutas mutantes (`src/lib/csrf.ts`).
- **M-6:** `proxy.ts` lee `PREVIEW_HMAC_SECRET` (arregla bug latente del gate).
- **B-1:** escapeHtml en `notifyPaymentMade`. **B-2:** no se loguea `azulParams` completo.
- **B-6:** validación `HH:MM` + allowlist `baseActivity`. **B-9:** rangos en `submitApplication`.
- **Deps:** `npm audit fix` (vuln alta `ws` + moderada `uuid` resueltas).
