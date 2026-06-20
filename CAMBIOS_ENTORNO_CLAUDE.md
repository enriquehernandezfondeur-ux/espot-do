# Cambios de entorno de Claude Code — Espot

> Registro de lo que se modificó el **13 de junio de 2026** al montar la estructura de Claude Code para Espot. Solo configuración y documentación; **ningún cambio funcional ni visual del producto**.

## Archivos creados

| Archivo | Propósito |
|---|---|
| `host-dashboard/.claude/settings.json` | Capa 1 de seguridad: 27 reglas `deny` (push, merge, deploy, migraciones, borrado) + `allow` mínimo |
| `host-dashboard/SKILLS_Y_CONFIGURACION_ACTUAL.md` | Inventario de skills/config desde la óptica de Espot |
| `host-dashboard/MCP_ESPOT.md` | Auditoría de MCP y plan de separación de PuntualPago |
| `host-dashboard/POLITICA_DE_SEGURIDAD_CLAUDE.md` | Política de seguridad (3 capas) de Espot |
| `host-dashboard/CAMBIOS_ENTORNO_CLAUDE.md` | Este registro |
| `host-dashboard/PENDIENTES_MANUALES.md` | Acciones manuales que requieren tu intervención |

## Archivos modificados

| Archivo | Cambio | Backup |
|---|---|---|
| `host-dashboard/CLAUDE.md` | Se **amplió** (no se reemplazó el contenido útil): + secciones de gobernanza, diseño, datos, seguridad, gstack y herramientas opcionales, encima de la referencia técnica existente | `host-dashboard/.claude/backups/CLAUDE.md.20260613-214018.bak` |

## Copias de seguridad creadas
- `host-dashboard/.claude/backups/CLAUDE.md.20260613-214018.bak`

## Validaciones realizadas
- `host-dashboard/.claude/settings.json` → `JSON.parse` ✅ válido (27 `deny`, 5 `allow`).
- Confirmado que `host-dashboard` es el proyecto Espot (git remote + Vercel `espot-do`).

## NO se tocó
- Código fuente, componentes, estilos ni rutas de Espot.
- El `~/.claude/mcp.json` global (está fuera de la carpeta de Espot; se documentó, no se modificó).
- Las skills globales ni sus flags (las 12 manual-only ya estaban globales; Espot las hereda).
- El `.claude/settings.local.json` de nivel superior (tiene un token expuesto; se deja como **pendiente manual** para no manipular un secreto en vivo).
- Credenciales de PuntualPago: **no se reutilizó ninguna**.

## Reutilizado / adaptado / separado (resumen)
- **Reutilizado de PuntualPago:** el *patrón* (estructura de 6 documentos + 3 capas de seguridad). No se copió contenido sensible.
- **Adaptado:** `CLAUDE.md` al negocio de Espot (marketplace/reservas, Azul, Twilio activo, stack Next 16). Las reglas `deny` son un archivo propio de Espot.
- **Separado por completo:** Supabase, Postgres, tokens, repos (`espot-do`), Vercel, env y documentación.
