# Roadmap y estado actual — FlexiCanchas

## Fases completadas

### Fase 0 — Setup (COMPLETA)
Reestructuración del repo, wrangler.toml, src/index.js esqueleto, .gitignore.

### Fase 1 — Schema D1 (COMPLETA)
Tablas tenants/canchas/reservas creadas, con columnas de branding en tenants
(logo_url, color_primario, color_secundario, slogan, whatsapp_contacto, direccion).
Seed de prueba inicial: tenant "cancha-norte". Reemplazado en Fase 6 por el
seed real de "El Potrero".

### Fase 2 — Bindings (COMPLETA)
Bucket R2 flexicanchas-imagenes, widget Turnstile, .dev.vars para secrets locales,
bindings DB/IMAGENES/ASSETS en wrangler.toml, entornos dev/staging/prod.

### Fase 3 — Routing del Worker (COMPLETA)
Resolución de tenant por subdominio con cache en memoria (TTL 5 min, para no
agotar el límite diario gratuito de lecturas de D1). run_worker_first para
/api/* y /gestion/*.

### Fase 4 — API pública (COMPLETA)
- [x] GET /api/canchas
- [x] GET /api/canchas/:id
- [x] GET /api/disponibilidad
- [x] Conectar public/js/canchas.js al API real (verificado por código y Network tab)
- [x] Conectar tablero de horarios en reservar.html

### Fase 6 — Autenticación admin (COMPLETA)
Hecha antes que la Fase 5 por el colaborador, en paralelo.

1. [x] Schema D1 completo:
   - Migración 0003: columnas numero, categoria, superficie, techada,
     capacidad, medidas, iluminacion en canchas; metodo_pago, notas en
     reservas; tabla bloqueos creada.
   - Migración 0004: seed real de "El Potrero" (branding + 6 canchas
     completas).

2. [x] Credenciales hardcodeadas eliminadas de public/admin/index.html.
   Página de login dedicada en public/admin/login.html.

3. [x] Auth server-side implementada:
   - Migración 0005_admin_auth.sql (admin_usuario, admin_password_hash,
     admin_password_salt).
   - Web Crypto PBKDF2-HMAC-SHA256 (100k iteraciones, salt 16B, dklen 32B).
   - HMAC-SHA256 para firma de sesión (cookie HttpOnly
     `potrero_admin_session`, 8 horas).
   - Gate server-side en Worker para `/admin/*` con redirección 302 a
     `/admin/login.html`.
   - fetch('/api/auth/login', { method: 'POST' })  -> implementado
   - fetch('/api/auth/logout')                       -> implementado

   Nota: requiere SESSION_SECRET propio en .dev.vars de cada desarrollador
   (no viaja por git). Cada uno puede tener un valor distinto en local.

## Panel de admin: contexto y contrato de API pendiente

El colaborador construyó un panel de admin funcional en public/admin/
(index.html, css/admin.css, js/admin.js, js/admin-datos.js) con 4 módulos:
Calendario, Canchas, Bloqueos, Reportes. Hoy los módulos de Canchas/Bloqueos/
Reportes siguen funcionando sobre localStorage como mock; los TODOs del
código ya indican el contrato de API esperado para cuando se conecten en
la Fase 7:

- fetch('/api/canchas', { method: 'POST/PUT' })
- fetch('/api/canchas/:id/toggle')
- fetch('/api/bloqueos', { method: 'POST' })
- fetch('/api/bloqueos/:id', { method: 'DELETE' })
- fetch('/api/reservas/:id/estado', { method: 'PATCH' })
- fetch('/api/reportes?rango=...')

## Fases pendientes

### Fase 5 — Reservas (EN CURSO)
- [x] POST /api/reservas
- [x] Validación de solapamiento de horarios (probado: 201 válida, 409 solapada)
- [x] Validación hora_inicio < hora_fin (probado: 400)
- [x] Validación de campos requeridos (probado: 400)
- [x] Lógica de chequeo contra tabla bloqueos implementada
      (validación end-to-end pendiente hasta Fase 7, cuando el admin
      cree bloqueos reales contra D1)
- [x] Conectar reservar.html (reserva.js) al POST real
- [x] Probado end-to-end en navegador: reserva exitosa, horario ocupado
      bloqueado en UI (tablero de disponibilidad), error de red manejado
- [ ] Turnstile en el formulario de reservar.html (queda para cuando
      se trabaje anti-spam/seguridad, no bloquea el flujo actual)

### Fase 7 — Panel de administración conectado a datos reales (En Curso)
- [x] CRUD de canchas (POST/PUT/toggle) contra D1, con auth gate
      (asegurarAdmin + requireAuth). Probado: 401 sin sesión, 201/200
      con sesión, whitelist de columnas verificada contra inyección
      de tenant_id/activa, coerción de techada a 0/1 verificada.
- [x] CRUD de bloqueos (POST/DELETE) contra D1, con auth gate.
      Probado: 401 sin sesión, 201 con horarios como array real,
      validación de rango horario (HH 00-23, MM 00-59), 404 cancha
      inexistente, y la prueba end-to-end clave: un bloqueo creado acá
      efectivamente hace que POST /api/reservas (Fase 5) lo rechace
      con 409, y al borrarlo la reserva vuelve a aceptarse (201).
- [x] GET /api/reservas (listado con JOIN a canchas, filtro de rango de
      fechas) y PATCH estado, con auth gate. Probado: 401 sin sesión,
      JOIN trayendo cancha_nombre, filtro de fechas, validación de
      desde > hasta (400), estado inválido (400), reserva inexistente
      (404).
- [ ] Endpoint de reportes (KPIs, ocupación, ingresos)
- [ ] Reemplazar localStorage por fetch real en admin-datos.js

### Fase 8 — Imágenes con R2
- [ ] Endpoint de upload de imágenes de canchas
- [ ] Servir imágenes públicas vía Worker o binding directo a R2

### Fase 9 — Mercado Pago
- [ ] Crear preferencia de pago al reservar
- [ ] Webhook de confirmación de pago
- [ ] Actualizar estado de reserva según pago

### Fase 10 — Cron Triggers
- [ ] Liberar reservas pendientes vencidas (timeout de pago)

### Fase 11 — Seguridad
- [ ] Rate limiting en endpoints públicos
- [ ] Aislamiento multi-tenant verificado en cada query
- [ ] Revisión de CORS

### Fase 12 — Testing
- [ ] Tests de endpoints críticos
- [ ] Test de aislamiento multi-tenant
- [ ] Test manual de flujo completo (reserva + pago)

### Fase 13 — DNS/SSL multi-tenant
- [ ] Dominio propio en Cloudflare
- [ ] Wildcard subdomain (*.tudominio.com.ar)
- [ ] Sumar dominio real + wildcard al widget de Turnstile

### Fase 14 — Deploy y operación post-lanzamiento
- [ ] Deploy a producción (wrangler deploy)
- [ ] wrangler secret put TURNSTILE_SECRET_KEY --env production
- [ ] wrangler secret put SESSION_SECRET --env production
- [ ] Monitoreo de errores/logs
- [ ] Backups periódicos de D1

## Formato de trabajo preferido
Guía paso a paso, con comandos exactos de PowerShell, contenido completo de
archivos, y verificación antes de avanzar de fase. Implementación vía
Antigravity (prompts sugeridos en el chat), revisión de plan antes de
ejecutar.