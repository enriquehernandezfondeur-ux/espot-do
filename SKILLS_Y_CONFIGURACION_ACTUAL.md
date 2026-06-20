# Skills y configuración de Claude Code — Espot

> Creado el 13 de junio de 2026. Inventario **desde la perspectiva de Espot**. Las skills son globales (compartidas con PuntualPago); lo específico de Espot es su `.claude/settings.json`, su `CLAUDE.md` y estos documentos.

## 1. Qué es global vs qué es de Espot

| Elemento | Ámbito | Notas |
|---|---|---|
| 89 skills (incl. gstack) | **Global** (`~/.claude/skills/`) | Espot las usa todas, igual que PuntualPago |
| Flags `disable-model-invocation` (12 skills manual-only) | **Global** | Espot **hereda** estos bloqueos automáticamente |
| Plugin `superpowers` + bun | **Global** | Compartido |
| MCP (`~/.claude/mcp.json`) | **Global** | Ver `MCP_ESPOT.md` (a separar) |
| `CLAUDE.md` | **Espot** | En `host-dashboard/CLAUDE.md` |
| `.claude/settings.json` (reglas deny) | **Espot** | En `host-dashboard/.claude/` |
| Estos 6 documentos | **Espot** | En la raíz de `host-dashboard` |

## 2. Skills globales que Espot puede usar

Espot es un **marketplace + SaaS** (Next.js 16, React 19, Tailwind v4, Supabase, Azul, Twilio). Las skills útiles:

### Recomendadas para Espot
| Skill | Uso en Espot |
|---|---|
| `/autoplan`, `/spec`, `/office-hours` | Planificar features (reservas, disponibilidad, pagos) |
| `/plan-ceo-review`, `/plan-eng-review` | Revisar planes antes de construir |
| `/review` | Revisión de código del diff |
| `/investigate` | Depurar bugs (ej. redirect Azul) |
| `/qa-only`, `/browse` | QA del marketplace, panel host y admin; validar responsive |
| `/design-review` | Auditoría visual de pantallas |
| `/document-generate`, `/document-release` | Documentar cambios |
| `/make-pdf`, `/diagram` | PDFs (contratos/recibos) y diagramas de flujo |
| `webapp-testing` | Pruebas con navegador (alternativa pre-gstack) |
| Diseño: `impeccable`, `ui-styling`, `ui-ux-pro-max`, `frontend-design` | UI del marketplace |
| Dev: `brainstorming`, `writing-plans`, `systematic-debugging`, `test-driven-development` | Flujo de trabajo |

### Manual-only (alto riesgo, NO se auto-activan) — heredadas del bloqueo global
`ship`, `land-and-deploy`, `setup-deploy`, `canary`, `finishing-a-development-branch`, `setup-gbrain`, `sync-gbrain`, `gstack-upgrade`, `codex`, `pair-agent`, `setup-browser-cookies`, `connect-chrome`.

### Poco/irrelevantes para Espot
`ios-*` (Espot es web, no iOS), `algorithmic-art`, `brand-guidelines` (identidad Anthropic), `benchmark*`.

## 3. Configuración de seguridad de Espot

- **Capa 1 (deny):** `host-dashboard/.claude/settings.json` — 27 reglas `deny` (push, merge, rebase, reset --hard, vercel deploy, supabase db push/reset, rm -rf, etc.). Ver `POLITICA_DE_SEGURIDAD_CLAUDE.md`.
- **Capa 2 (skills manual-only):** heredada del bloqueo global (12 skills).
- **Capa 3 (CLAUDE.md):** instrucciones de gobernanza/seguridad en `host-dashboard/CLAUDE.md`.

## 4. Configuración previa detectada en Espot

| Archivo | Estado | Acción |
|---|---|---|
| `host-dashboard/CLAUDE.md` | Existía (rico, Espot-específico) | **Respaldado** y **ampliado** con gobernanza/seguridad/gstack |
| `host-dashboard/.claude/` | Solo `worktrees/` | + `settings.json` (deny) y `backups/` |
| `…/.claude/settings.local.json` (nivel superior) | ⚠️ Tiene **token Resend expuesto** + `git push *` permitido | **Pendiente manual** (rotar/limpiar) — ver `PENDIENTES_MANUALES.md` |
| `AGENTS.md`, `agents/`, `docs/` | Existentes | Sin cambios |

## 5. Diferencias clave con PuntualPago (no mezclar)

| | PuntualPago | Espot |
|---|---|---|
| Negocio | CRM administración de alquileres | Marketplace + SaaS de reserva de espacios |
| Pagos | SendGrid + liquidaciones | Azul PaymentPage + comisión 10% |
| WhatsApp | wa.me manual (**sin Twilio**) | **Twilio** (sí usa) |
| Stack | Next 14, React 18 | Next 16, React 19, Tailwind v4 |
| Supabase | `hmrwqakcjunsyvktndvu` | `vgwstcpewywkpookvktk` (por confirmar) |
| Repo | `puntualpago-do` | `espot-do` |

> ⚠️ La regla "no Twilio" es **solo de PuntualPago**. En Espot, Twilio es una integración activa y NO debe eliminarse.
