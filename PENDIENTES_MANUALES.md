# Pendientes manuales — entorno Claude Code de Espot

> Acciones que **requieren tu intervención** (credenciales, paneles externos, decisiones). Creado el 13 de junio de 2026. Ordenadas por prioridad.

## 🔴 Alta — seguridad

### 1. Rotar el token de Resend expuesto
- **Dónde:** `…/Espot SaaS & Marketplace/.claude/settings.local.json` contiene una regla `allow` con un `curl … Authorization: Bearer re_…` (token de Resend **en texto plano**).
- **Riesgo:** cualquiera con acceso al archivo puede enviar correos como Espot.
- **Acción:**
  1. En el panel de Resend → revocar/rotar ese API key.
  2. Editar `settings.local.json` y **eliminar esa línea** del `allow` (o reemplazar el token por una variable de entorno).
  3. Validar que el JSON siga siendo válido.

### 2. Quitar `git push *` del `allow` del nivel superior
- El mismo `settings.local.json` permite `Bash(git push *)`, `Bash(git commit *)`, `Bash(git add *)`.
- En `host-dashboard` ya está bloqueado por las reglas `deny`, pero **si abres Claude Code en la carpeta superior** ese `allow` sigue activo.
- **Acción:** eliminar `git push *` del `allow` (mantener `git add`/`git commit` locales si quieres).

## 🟠 Media — separación de MCP

### 3. Confirmar el project-ref de Supabase de Espot
- El MCP global apunta a `vgwstcpewywkpookvktk` (probable Espot, **sin confirmar** localmente porque las env vars vienen de Vercel).
- **Acción:** Supabase Dashboard → proyecto Espot → Settings → General → "Reference ID". Confirmar que es `vgwstcpewywkpookvktk`. (PuntualPago es `hmrwqakcjunsyvktndvu` — deben ser distintos.)

### 4. Separar el MCP de Supabase/Postgres por proyecto
- Hoy el MCP es **global** y se comparte con PuntualPago (ver `MCP_ESPOT.md`).
- **Ya hecho (sin credenciales):**
  1. ✅ `.mcp.json` añadido al `.gitignore` de `host-dashboard` (confirmado ignorado por Git).
  2. ✅ `host-dashboard/.mcp.json` creado como **plantilla** (Supabase `--read-only`, servidores `espot-supabase`/`espot-postgres`) con marcadores `<ESPOT_*>`.
  3. ✅ `host-dashboard/.mcp.example.json` creado (versionable, documentado, sin secretos).
- **Te toca a ti (pegar credenciales en `.mcp.json`, NO en el .example):**
  - `<ESPOT_SUPABASE_PROJECT_REF>` → Supabase Dashboard › proyecto Espot › Settings › General › **Reference ID**.
  - `<ESPOT_SUPABASE_ACCESS_TOKEN>` → Supabase Dashboard › Account › **Access Tokens** › Generate new token (propio de Espot).
  - `<ESPOT_POSTGRES_CONNECTION_STRING>` → Supabase Dashboard › proyecto Espot › Settings › **Database › Connection string (URI)**.
  - ⚠️ **Nunca** el token/cadena de PuntualPago.
- **Después** (solo tras validar con lecturas): quitar Supabase/Postgres del `~/.claude/mcp.json` global y hacer lo simétrico en PuntualPago.

### 5. Sacar secretos del `~/.claude/mcp.json` global
- El MCP global tiene token de GitHub, token de Supabase y contraseña de Postgres **en texto plano**.
- **Acción:** moverlos a variables de entorno y **rotar el PAT de GitHub** (estaba expuesto).

## 🟡 Baja — calidad de vida

### 6. Decidir sobre gbrain / plan-tune
- Por ahora **no instalar** (acordado). Si en el futuro quieres memoria persistente, evaluar `/setup-gbrain` con un Supabase **propio** (no el de producción).

### 7. Versionado de los documentos nuevos
- Los 6 `.md` y `.claude/settings.json` **no** contienen secretos, así que pueden commitearse sin riesgo. (Recuerda: las reglas `deny` impiden que Claude haga push solo; el commit/push lo decides tú.)

---

## Lo que YA quedó hecho (no requiere acción)
- `host-dashboard/.claude/settings.json` con reglas `deny` ✅
- `CLAUDE.md` ampliado + respaldado ✅
- 6 documentos creados ✅
- Skills de alto riesgo en manual-only (global, heredado) ✅
