# Seguridad — pendientes (auditoría 2026-06-26)

Auditoría completa de seguridad del 26-jun-2026. La mayoría de hallazgos ya están
arreglados y desplegados (ver más abajo). Aquí quedan **solo los pendientes**, porque
requieren una acción manual, una decisión, o pruebas en un entorno real.

> Contexto completo en la memoria del proyecto: `espot-seguridad-2026-06-26.md`.

---

## 🟡 Pendiente de CÓDIGO

### M-5 — CSP: quitar `'unsafe-inline'`/`'unsafe-eval'` de `script-src` (NO trivial)
- **Dónde:** `next.config.ts` (header estático).
- **Intentado el 2026-06-26 y revertido con evidencia:** implementé CSP con nonce por
  request en el middleware y lo probé en local. Resultado:
  - Páginas **dinámicas** (`/buscar`): Next aplica el nonce a sus 28 scripts ✅.
  - Páginas **estáticas** (`/terminos`, `/privacidad`, etc.): **0 scripts reciben el nonce**
    (se prerenderan en build, sin nonce per-request) → con `'strict-dynamic'` quedarían
    **bloqueadas** = páginas rotas. Además la CSP de respuesta no se emitía en ningún caso
    (quedaba el sitio SIN CSP, peor que ahora).
- **Plan correcto (otro día):**
  1. Forzar render **dinámico** en todas las páginas (o al menos las estáticas afectadas)
     para que Next pueda estampar el nonce per-request — asumiendo el costo de perder la
     optimización estática de las páginas de marketing.
  2. Asegurar que la CSP de respuesta SÍ se emita (la integración del nonce de Next no la
     setea sola).
  3. Desplegar a un **preview de Vercel** y verificar en navegador: homepage, `/buscar`
     (mapa), detalle de espacio (mapa), `LocationPicker` (Places), widget behold. Revisar
     consola por violaciones de CSP.
  4. Solo si todo OK → merge a `main`.
- **Severidad:** Media (defensa en profundidad). Hoy NO hay vector XSS activo: React escapa,
  no hay `dangerouslySetInnerHTML`, y los sinks de email/uploads ya se taparon. Por eso es
  defendible dejarlo como riesgo aceptado hasta poder hacerlo bien con preview.

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
- **B-3:** email superadmin centralizado en `src/lib/superadmin.ts` (saca el hardcode de ~15 archivos; case-insensitive; warning en prod si falta la env var).
- **B-6:** validación `HH:MM` + allowlist `baseActivity`. **B-9:** rangos en `submitApplication`.
- **Deps:** `npm audit fix` (vuln alta `ws` + moderada `uuid` resueltas).
