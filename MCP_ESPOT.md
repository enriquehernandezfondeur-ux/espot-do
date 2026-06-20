# MCP de Espot — auditoría y separación

> Creado el 13 de junio de 2026. Auditoría de los servidores MCP tal como afectan a Espot, y plan para separarlos completamente de PuntualPago. **No se modificaron los MCP globales** (están fuera de la carpeta de Espot); aquí se documenta el estado y los pasos recomendados.

## 1. Cómo están configurados hoy (GLOBAL)

Los MCP viven en `~/.claude/mcp.json` — es **configuración global compartida por TODOS los proyectos** (Espot, PuntualPago, etc.). Esto es justo lo que conviene separar.

| MCP | Apunta a | ¿Correcto para Espot? |
|---|---|---|
| `espot-filesystem` | `…/espot-saas/host-dashboard` | ✅ Sí — es la carpeta de Espot |
| `supabase` (read-only) | proyecto **`vgwstcpewywkpookvktk`** | ⚠️ **Probable Espot, sin confirmar** (no es el de PuntualPago `hmrwqakcjunsyvktndvu`) |
| `postgres` | `db.vgwstcpewywkpookvktk…` | ⚠️ Mismo ref — verificar |
| `github` | GitHub (token global) | Compartido — sirve para ambos repos |
| `puppeteer`, `thinking` | genéricos | Neutros |

## 2. Confirmación del proyecto Supabase de Espot

- **Repo/Vercel de Espot:** `espot-do` (git remote) y `espot-do` (Vercel `projectName`). ✅ Confirmado que esta carpeta es Espot.
- **Supabase de Espot:** las variables (`NEXT_PUBLIC_SUPABASE_URL`, claves) **se inyectan desde Vercel**, no están en archivos locales (`.env.local` solo tiene `VERCEL_OIDC_TOKEN` y la API key de Google Maps). Por eso **no se pudo confirmar el project-ref desde el código**.
- **MCP global** apunta a `vgwstcpewywkpookvktk`, que **NO** es PuntualPago (`hmrwqakcjunsyvktndvu`). Es muy probable que sea Espot, pero **debe confirmarse manualmente** (ver `PENDIENTES_MANUALES.md`).

> ✅ **Cómo confirmar:** en Supabase Dashboard → proyecto de Espot → Settings → General → "Reference ID". Debe ser `vgwstcpewywkpookvktk`. O en Vercel → proyecto espot-do → Settings → Environment Variables → `NEXT_PUBLIC_SUPABASE_URL` (el subdominio es el ref).

## 3. El problema de separación

Como el MCP es **global**, hoy **el mismo servidor Supabase/Postgres se usa sin importar el proyecto abierto**. Cuando trabajas en PuntualPago, el MCP apunta a Espot (incorrecto), y viceversa. No hay aislamiento real.

## 4. Separación recomendada (MCP por proyecto)

Claude Code soporta **`.mcp.json` a nivel de proyecto**. La forma limpia de separar:

1. **Espot** → un `.mcp.json` en `host-dashboard/` con su Supabase/Postgres apuntando al ref de Espot y **su propio token**.
2. **PuntualPago** → su propio `.mcp.json` con `hmrwqakcjunsyvktndvu` y **su propio token**.
3. **Quitar** Supabase/Postgres del `~/.claude/mcp.json` global (dejar ahí solo lo neutro: github, puppeteer, thinking).

> 🔐 **Regla de oro:** el `.mcp.json` con tokens **NO debe versionarse**. Como el `.gitignore` de Espot ignora `.env*` pero **no** `.mcp.json`, hay que **añadir `.mcp.json` al `.gitignore`** antes de crearlo con secretos. Por eso aquí **no** se creó un `.mcp.json` con credenciales — se deja como paso manual seguro (ver `PENDIENTES_MANUALES.md`).

### Plantilla sugerida (SIN secretos) para `host-dashboard/.mcp.json`
```jsonc
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "--project-ref", "<REF_DE_ESPOT>", "--read-only"],
      "env": { "SUPABASE_ACCESS_TOKEN": "<TOKEN_PROPIO_DE_ESPOT>" }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "<CADENA_POSTGRES_DE_ESPOT>"]
    }
  }
}
```
> Reemplazar los `<…>` con valores de Espot. **Nunca** reutilizar el token de PuntualPago. Añadir `.mcp.json` al `.gitignore` primero.

## 5. Estado de separación

| Recurso | PuntualPago | Espot | ¿Separado? |
|---|---|---|---|
| Supabase project-ref | `hmrwqakcjunsyvktndvu` | `vgwstcpewywkpookvktk` (por confirmar) | ✅ distinto |
| Repo GitHub | `puntualpago-do` | `espot-do` | ✅ |
| Proyecto Vercel | (PuntualPago) | `espot-do` | ✅ |
| Variables de entorno | `.env.local` propio | Vercel + `.env.local` propio | ✅ |
| Tokens Supabase/Postgres | propios | **deben separarse** (hoy MCP global) | ⚠️ pendiente |
| MCP filesystem | carpeta PuntualPago | carpeta Espot | ✅ |
| Documentación | en su repo | en este repo | ✅ |
