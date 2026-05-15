# Agentes — Espot Multi-Agent System

Sistema de agentes especializados para el desarrollo y mantenimiento de la plataforma Espot.
Cada agente tiene un rol, responsabilidades y reglas específicas para su dominio.

## Agentes disponibles

| Agente | Archivo | Dominio |
|--------|---------|---------|
| Frontend | `frontend-agent.md` | UI, componentes, mobile, accesibilidad |
| Backend | `backend-agent.md` | Server Actions, API routes, DB, pagos |
| Marketplace | `marketplace-agent.md` | Flujo de reservas, búsqueda, hosts, clientes |
| Security | `security-agent.md` | RLS, auth, HMAC, headers, rate limiting |
| SEO | `seo-agent.md` | Metadata, structured data, Core Web Vitals |
| QA | `qa-agent.md` | Testing, bugs conocidos, checklist de deploy |

## Cómo usar este sistema

Cuando trabajas en una tarea, identifica qué agente(s) aplican:

- **Cambio de UI/componente** → lee `frontend-agent.md`
- **Nueva Server Action o API Route** → lee `backend-agent.md`
- **Cambio en el flujo de reservas** → lee `marketplace-agent.md` + `backend-agent.md`
- **Cambio que toca seguridad** → siempre consultar `security-agent.md`
- **Nueva página pública** → `seo-agent.md`
- **Antes de deploy** → checklist en `qa-agent.md`

## Documentación adicional
Ver carpeta `/docs` para visión del producto, flujo de pagos, reglas del marketplace y UX guidelines.
