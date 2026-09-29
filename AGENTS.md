# FlexiCanchas — Contexto para agentes de IA

## Qué es esto
SaaS multi-tenant para gestión y reserva online de canchas de fútbol.
Repo: Yakkim/fulvo-esqueleto. Un colaborador trabaja en paralelo sobre el mismo repo.
Regla de oro: no romper infraestructura por cambios accidentales del colaborador.

## Stack (NO cambiar sin decisión explícita)
- Backend/API: Cloudflare Workers
- Base de datos: Cloudflare D1 (SQLite)
- Storage: Cloudflare R2, bucket `flexicanchas-imagenes`
- Frontend: HTML5 + CSS3 + JS vanilla — SIN build step, SIN framework
- Hosting frontend: Workers Static Assets
- Anti-bot: Cloudflare Turnstile
- CLI: Wrangler
- Entorno dev: Windows + PowerShell + VS Code

Explícitamente EXCLUIDO: Node/Express, React/Vue/Angular, Django, PostgreSQL,
Docker, Redis, Firebase, AWS.

## Arquitectura
- Multi-tenancy por subdominio (ej: cancha-norte.tudominio.com.ar)
- Un solo Worker y una sola base D1 para todos los tenants
- Panel admin en `/gestion` (o `/admin`), protegido server-side
- Auth simple: credenciales por complejo, sin sistema de roles complejo

## Convenciones de trabajo
- PowerShell no es bash: `mv` no acepta múltiples orígenes como en bash
- `wrangler secret put` no funciona antes del primer deploy real → usar `.dev.vars` en local
- El binding de D1 en wrangler.toml DEBE llamarse `DB` (no el nombre de la base)
- SIEMPRE correr `wrangler dev` en una terminal separada de otros comandos
  (intercepta teclas sueltas como atajos, ej. "t" activa un túnel público sin querer)
- Ante rechazo de `git push`, hacer `git pull origin main` primero (hay colaborador activo)

## Ver también
- docs/roadmap-estado.md — roadmap completo de 15 fases y estado actual