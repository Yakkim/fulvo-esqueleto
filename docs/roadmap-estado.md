# Roadmap y estado actual — FlexiCanchas

## Fases completadas

### Fase 0 — Setup (COMPLETA)
Reestructuración del repo, wrangler.toml, src/index.js esqueleto, .gitignore.

### Fase 1 — Schema D1 (COMPLETA)
Tablas tenants/canchas/reservas creadas, con columnas de branding en tenants
(logo_url, color_primario, color_secundario, slogan, whatsapp_contacto, direccion).
Seed de prueba: tenant "cancha-norte" ("El Potrero").

### Fase 2 — Bindings (COMPLETA)
Bucket R2 flexicanchas-imagenes, widget Turnstile, .dev.vars para secrets locales,
bindings DB/IMAGENES/ASSETS en wrangler.toml, entornos dev/staging/prod.

### Fase 3 — Routing del Worker (COMPLETA)
Resolución de tenant por subdominio con cache en memoria (TTL 5 min, para no
agotar el límite diario gratuito de lecturas de D1). run_worker_first para
/api/* y /gestion/*.

### Fase 4 — API pública (PARCIAL)
Endpoints backend probados y funcionando:
- GET /api/canchas
- GET /api/canchas/:id
- GET /api/disponibilidad?cancha_id=X&fecha=YYYY-MM-DD

PENDIENTE: conectar public/js/canchas.js y public/js/reserva.js (que hoy usan
datos mock hardcodeados) a estos endpoints reales.

## Hallazgo importante: panel de admin ya existe

El colaborador construyó un panel de admin funcional en public/admin/
(index.html, css/admin.css, js/admin.js, js/admin-datos.js) con 4 módulos:
Calendario, Canchas, Bloqueos, Reportes. Todo funciona sobre localStorage
como mock de base de datos, con comentarios TODO que ya indican el contrato
de API esperado:

- fetch('/api/auth/login', { method: 'POST' })
- fetch('/api/auth/logout')
- fetch('/api/canchas', { method: 'POST/PUT' })
- fetch('/api/canchas/:id/toggle')
- fetch('/api/bloqueos', { method: 'POST' })
- fetch('/api/bloqueos/:id', { method: 'DELETE' })
- fetch('/api/reservas/:id/estado', { method: 'PATCH' })
- fetch('/api/reportes?rango=...')

## 3 issues a resolver en Fase 6 (antes de conectar el admin real)

1. Schema D1 incompleto:
   - Tabla canchas le faltan: numero, categoria, superficie, techada,
     capacidad, medidas, iluminacion
   - Tabla reservas le faltan: metodo_pago, notas
   - No existe tabla bloqueos (cancha_id, fecha, horarios, motivo, nota)

2. Credenciales hardcodeadas eliminadas de public/admin/index.html.
   Página de login dedicada creada en public/admin/login.html.

3. Auth server-side implementada:
   - Migración 0005_admin_auth.sql (columnas admin_usuario, admin_password_hash, admin_password_salt).
   - Web Crypto PBKDF2-HMAC-SHA256 (100k iteraciones, salt 16B, dklen 32B).
   - HMAC-SHA256 para firma de sesión (cookie HttpOnly `potrero_admin_session`, 8 horas).
   - Gate server-side en Worker para `/admin/*` con redirección 302 a `/admin/login.html`.
   - Botón de cierre de sesión conectado a POST `/api/auth/logout`.

## Fases pendientes (5 a 14)

5. Reservas (POST /api/reservas, validación de solapamiento, Turnstile)
6. Autenticación admin (server-side real)
7. Panel de administración conectado a datos reales
8. Imágenes con R2
9. Mercado Pago
10. Cron Triggers (liberar reservas pendientes vencidas)
11. Seguridad (rate limiting, aislamiento multi-tenant, CORS)
12. Testing
13. DNS/SSL multi-tenant (wildcard *.tudominio.com.ar)
14. Deploy y operación post-lanzamiento

## Formato de trabajo preferido
Guía paso a paso, con comandos exactos de PowerShell, contenido completo de
archivos, y verificación antes de avanzar de fase.