# Política de seguridad de Claude Code — Espot

> Creado el 13 de junio de 2026. Barreras equivalentes a las de PuntualPago, **adaptadas e independientes** para Espot. No se modificó código ni UI de Espot.

## Objetivo
Que las acciones **irreversibles** (push, merge, deploy, migraciones, borrado) **no ocurran automáticamente** al trabajar en Espot. Tres capas.

---

## Capa 1 — Reglas `deny` de permisos  ✅ APLICADA
**Archivo:** `host-dashboard/.claude/settings.json` (nuevo; no existía).

27 reglas `deny` (mismo patrón que PuntualPago, pero archivo **propio de Espot**):

| Categoría | Reglas |
|---|---|
| Git destructivo | `git push`, `git merge`, `git rebase`, `git reset --hard`, `git reset --keep`, `git clean -fd/-fdx` |
| Despliegue | `vercel deploy`, `vercel --prod` (+ variantes `npx`) |
| Base de datos | `supabase db push`, `supabase db reset`, `supabase migration up` (+ `npx`), `dropdb`, `dropuser` |
| Borrado masivo | `rm -rf`, `rm -fr`, `rm -r`, `find . -delete` |

**`allow` mínimo (lectura/dev):** `npx tsc --noEmit`, `npm run test`, `vercel ls/inspect/project`.
**NO bloqueado:** `git status/diff/log`, commits locales, `next dev/build`, pruebas, navegación/QA, lecturas a Supabase/Postgres.

**Validación:** `JSON.parse` → ✅ válido (27 `deny`, 5 `allow`).

> Nota: las reglas `deny` toman efecto al iniciar una **sesión de Claude Code en `host-dashboard`**.

---

## Capa 2 — Skills de alto riesgo en modo manual  ✅ HEREDADA (global)
Las 12 skills de alto riesgo ya tienen `disable-model-invocation: true` a nivel **global** (`~/.claude/skills/`), aplicado en la configuración de PuntualPago. Como las skills son globales, **Espot las hereda automáticamente**:

`ship`, `land-and-deploy`, `setup-deploy`, `canary`, `finishing-a-development-branch`, `setup-gbrain`, `sync-gbrain`, `gstack-upgrade`, `codex`, `pair-agent`, `setup-browser-cookies`, `connect-chrome`.

> No se re-aplicó nada por Espot (sería redundante). Solo se activan con `/comando` explícito.

---

## Capa 3 — Instrucciones en `CLAUDE.md`  ✅ APLICADA
`host-dashboard/CLAUDE.md` incluye las secciones de **Seguridad** y **Gobernanza**: no push/merge/deploy automáticos, no tocar pagos/reservas/disponibilidad en producción sin autorización, migraciones controladas.

---

## Reglas operativas vigentes (Espot)
- No commit / push / merge / deploy sin autorización explícita.
- No alterar pagos, reservas ni disponibilidad en producción.
- No ejecutar migraciones destructivas.
- No instalar `gbrain` ni hooks de `plan-tune`.
- No conectar cookies/sesiones personales del navegador.
- No actualizar gstack automáticamente.
- **Mantener Espot y PuntualPago separados** (Supabase, tokens, repos, env).

---

## Cómo revertir
**Capa 1:** borrar o vaciar `host-dashboard/.claude/settings.json` (era nuevo; no había versión previa).
**CLAUDE.md:** restaurar desde `host-dashboard/.claude/backups/CLAUDE.md.20260613-214018.bak`.

---

## Pendiente de seguridad ALTA (manual)
- 🔴 **Token de Resend expuesto** en `…/Espot SaaS & Marketplace/.claude/settings.local.json` (regla `allow` con un `curl … Authorization: Bearer re_…`). **Rotar el token en Resend y eliminar esa línea.** Ver `PENDIENTES_MANUALES.md`.
- 🔴 Ese mismo archivo permite `git push *` — conviene quitarlo (las reglas `deny` de Espot lo bloquean en `host-dashboard`, pero no si se abre Claude en la carpeta superior).
- 🟠 Separar el MCP de Supabase/Postgres a nivel de proyecto con token propio de Espot (ver `MCP_ESPOT.md`).
