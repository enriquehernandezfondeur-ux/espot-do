# MCP Servers — Espot Setup

## Qué son los MCP Servers
Model Context Protocol (MCP) es el estándar de Anthropic que permite a Claude Code
conectarse con herramientas externas: tu código, GitHub, base de datos, navegador, etc.

La configuración vive en `~/.claude/mcp.json` y se activa automáticamente cada vez
que abres Claude Code.

---

## Servidores instalados para Espot

### 1. `espot-filesystem` — Acceso al código
**Paquete:** `@modelcontextprotocol/server-filesystem`
**Acceso:** `/Users/enriquehernandezfondeur/Espot SaaS & Marketplace/espot-saas/host-dashboard`

Lee y escribe cualquier archivo del proyecto sin necesidad de que tú los abras primero.

**Ejemplo de uso en Claude Code:**
```
"Lee el archivo src/lib/actions/booking.ts y explícame el flujo completo"
"Crea un nuevo componente en src/components/ui/Badge.tsx con estas props..."
"Busca todos los archivos que usan createBooking y muéstrame cómo se llama"
```

---

### 2. `github` — GitHub API
**Paquete:** `@modelcontextprotocol/server-github`
**Requiere:** `GITHUB_PERSONAL_ACCESS_TOKEN`

Accede a tu repositorio `enriquehernandezfondeur-ux/espot-do` — crea issues,
lee PRs, ve el historial de commits, gestiona branches.

#### Configurar el token
1. Ve a https://github.com/settings/tokens/new
2. Selecciona: `repo`, `issues`, `pull_requests`, `actions`
3. Copia el token
4. Edita `~/.claude/mcp.json` y reemplaza `REEMPLAZAR_CON_TU_TOKEN`

**Ejemplo de uso:**
```
"Crea un issue en GitHub con el título 'Bug: mapa no carga en mobile'"
"Muéstrame los últimos 10 commits del repositorio"
"¿Cuáles PRs están abiertos ahora mismo?"
"Crea una rama 'feat/google-maps-geocoder' para el trabajo de geocoding"
```

---

### 3. `supabase` — Supabase Management API
**Paquete:** `@supabase/mcp-server-supabase`
**Project:** `vgwstcpewywkpookvktk`
**Modo:** `--read-only` (seguro para producción)

Interactúa con tu proyecto Supabase: ve tablas, esquema, políticas RLS,
estadísticas de uso, logs de auth y más — sin riesgo de modificar datos de producción.

#### Configurar el token
1. Ve a https://supabase.com/dashboard/account/tokens
2. Crea un token con nombre "Claude Code MCP"
3. Edita `~/.claude/mcp.json` y reemplaza `REEMPLAZAR_CON_TU_SUPABASE_ACCESS_TOKEN`

**Para permitir escritura** (con cuidado): elimina `--read-only` del args.

**Ejemplo de uso:**
```
"¿Cuáles tablas tienen RLS desactivado?"
"Muéstrame el esquema de la tabla bookings"
"¿Cuántos usuarios se registraron esta semana?"
"¿Hay algún error reciente en los logs de autenticación?"
"Muéstrame las políticas RLS de la tabla payments"
```

---

### 4. `postgres` — Consultas SQL directas
**Paquete:** `@modelcontextprotocol/server-postgres`
**Conexión:** PostgreSQL directo a Supabase

Ejecuta queries SQL arbitrarios contra tu base de datos.
Ideal para análisis, debugging y verificar datos en tiempo real.

#### Configurar la contraseña
1. Ve a Supabase Dashboard → Settings → Database
2. Copia el `Database Password`
3. Edita `~/.claude/mcp.json` y reemplaza `[PASSWORD]`

**Ejemplo de uso:**
```
"¿Cuántas reservas confirmadas hay en mayo 2026?"
"Muéstrame los 5 espacios con más reservas este mes"
"¿Hay bookings en estado pending con más de 48h sin respuesta?"
"Calcula el GMV total procesado este mes"
"¿Cuáles hosts tienen cuotas vencidas sin pagar?"
```

---

### 5. `puppeteer` — Automatización de navegador
**Paquete:** `@modelcontextprotocol/server-puppeteer`

Abre un navegador Chromium real, navega páginas, hace screenshots,
extrae contenido y puede interactuar con la UI de Espot.

**Ejemplo de uso:**
```
"Abre espothub.com y toma un screenshot de la homepage"
"Navega a /buscar y verifica que el mapa carga correctamente"
"Prueba el flujo de login en espothub.com/auth"
"¿Cómo se ve la página en 375px de ancho (mobile)?"
"Verifica que el logo de Espot aparece correctamente en todas las páginas"
```

---

### 6. `thinking` — Razonamiento secuencial
**Paquete:** `@modelcontextprotocol/server-sequential-thinking`

Habilita a Claude para dividir problemas complejos en pasos y razonar
cada uno explícitamente antes de responder.

**Ejemplo de uso:**
```
"Usa sequential thinking para analizar si el flujo de pagos tiene edge cases
 que podrían causar doble cargo a un cliente"

"Con razonamiento paso a paso, diseña la arquitectura del sistema de
 notificaciones push para la app móvil de Espot"

"Analiza sistemáticamente qué pasaría si Azul envía el callback dos veces
 para la misma transacción"
```

---

## Verificar que funcionan

Después de configurar los tokens, reinicia Claude Code y prueba:

```
"Lista los archivos en src/lib/actions/"           → filesystem ✓
"¿Cuántos commits tiene el repo espot-do?"         → github ✓
"¿Cuántas tablas tiene mi proyecto Supabase?"      → supabase ✓
"SELECT COUNT(*) FROM bookings;"                   → postgres ✓
"Toma un screenshot de espothub.com"               → puppeteer ✓
```

---

## Combinando servidores (casos de uso Espot)

### Debugging de bug en producción
```
"Hay un bug donde los pins del mapa no aparecen en ciertos dispositivos.
 Usa filesystem para leer SpacesMap.tsx, postgres para ver si hay espacios
 sin coordenadas, y puppeteer para verificar en el browser real"
```

### Code review automático
```
"Usa filesystem para leer todos los Server Actions en src/lib/actions/,
 luego con thinking analiza si hay alguna que no esté verificando
 auth.getUser() correctamente"
```

### Análisis de negocio
```
"Usa postgres para calcular la tasa de conversión de este mes
 (reservas_confirmadas / bookings_creados) y compárala con el mes anterior"
```

### Deploy y verificación
```
"Usa github para ver el último commit en main, luego puppeteer para
 verificar que espothub.com refleja los cambios y no hay errores visuales"
```

---

## Seguridad importante

### `--read-only` en Supabase
El servidor Supabase está configurado con `--read-only` para proteger producción.
Solo lo elimines si necesitas hacer cambios estructurales y sabes lo que haces.

### No commitear el mcp.json
El archivo `~/.claude/mcp.json` está en tu home directory, no en el repo.
Nunca pongas tokens en archivos dentro del repositorio.

### Rotación de tokens
- Token de GitHub: rotar si alguien más tuvo acceso a tu máquina
- Token de Supabase: rotar si ves actividad extraña en el dashboard
- Contraseña de Postgres: cambiar en Settings → Database → Reset password

---

## Actualizaciones

Para actualizar un servidor a la última versión, npx lo hace automáticamente
con `-y`. Si quieres forzar una versión específica:

```json
"args": ["-y", "@modelcontextprotocol/server-filesystem@2026.1.14"]
```

---

## Archivo de configuración completo
Ubicación: `~/.claude/mcp.json`

```json
{
  "mcpServers": {
    "espot-filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/enriquehernandezfondeur/Espot SaaS & Marketplace/espot-saas/host-dashboard"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y", "@supabase/mcp-server-supabase",
        "--project-ref", "vgwstcpewywkpookvktk",
        "--read-only"
      ],
      "env": { "SUPABASE_ACCESS_TOKEN": "sbp_..." }
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y", "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:[PASSWORD]@db.vgwstcpewywkpookvktk.supabase.co:5432/postgres"
      ]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```
