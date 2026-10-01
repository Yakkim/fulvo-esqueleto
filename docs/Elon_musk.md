# Registro de Cambios — Sesiones de Trabajo

Historial de cambios realizados en el proyecto durante mis sesiones de trabajo en FlexiCanchas.

---

## Historial previo (sin fecha exacta)

1. **Frontend — Simplificación de tickets y pagos**: Se quitó el código de barras de los tickets del Paso 3 y del Paso 4, se quitó el campo de email del formulario, el pago quedó exclusivamente con Mercado Pago y se eliminó el botón de imprimir comprobante.
2. **Navegación — Acceso a Administración**: Se agregó el botón "Administración" en el footer de la página principal (home).
3. **Base de Datos — Migraciones 0003 y 0004**: Se aplicaron en D1 local las migraciones `0003` (nuevas columnas de canchas/reservas y creación de la tabla de bloqueos) y `0004` (seed de datos reales para el complejo El Potrero con sus 6 canchas).
4. **Frontend — Carga asíncrona de canchas**: `reserva.js` e `index.html` ahora esperan la resolución de `cargarCanchas()` antes de proceder a renderizar las canchas en pantalla.
5. **Seguridad / Backend — Autenticación de Admin Server-Side**: Implementación de la migración `0005`, autenticación mediante credenciales con cookie firmada criptográficamente (HMAC-SHA256) y compuerta (gate) server-side para todas las rutas bajo `/admin/*`.
6. **Panel Admin — Sincronización de canchas**: Corrección en el panel de administración para consumir y reflejar las canchas reales provistas por la API.

---

## Cambios por fecha

### 2026-10-01: Integración de Cloudflare Turnstile (Anti-Bots) en el flujo de reservas

- **Archivos tocados:**
  - [.dev.vars](file:///c:/Users/joaqu/OneDrive/Desktop/fulvo/.dev.vars)
  - [src/index.js](file:///c:/Users/joaqu/OneDrive/Desktop/fulvo/src/index.js)
  - [public/reservar.html](file:///c:/Users/joaqu/OneDrive/Desktop/fulvo/public/reservar.html)
  - [public/js/reserva.js](file:///c:/Users/joaqu/OneDrive/Desktop/fulvo/public/js/reserva.js)
  - [docs/plan-turnstile.md](file:///c:/Users/joaqu/OneDrive/Desktop/fulvo/docs/plan-turnstile.md)
  - [docs/Elon_musk.md](file:///c:/Users/joaqu/OneDrive/Desktop/fulvo/docs/Elon_musk.md)

- **Qué se cambió:**
  1. **Configuración local (`.dev.vars`)**: Se configuraron las claves oficiales de prueba de Cloudflare Turnstile (`TURNSTILE_SITE_KEY=1x00000000000000000000AA` y `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`) para desarrollo local sin quemar claves reales ni exponer secretos.
  2. **Backend (`src/index.js`)**:
     - Se añadió el endpoint público `GET /api/config` para entregar la `turnstile_site_key` al cliente dinámicamente.
     - Se implementó la función auxiliar `verificarTurnstile(token, env, ip)` con política cerrada (fail-closed) consultando la API oficial de Cloudflare `siteverify` enviando IP remota si está presente.
     - En `crearReserva`, inmediatamente luego de parsear el JSON y antes de cualquier consulta a D1, se exige `turnstile_token`. Si falta o es rechazado devuelve HTTP 403; si el servicio de Cloudflare no responde devuelve HTTP 503. El token no se almacena en la base de datos.
  3. **Estructura Frontend (`public/reservar.html`)**:
     - Se incorporó la carga asíncrona del script oficial de Turnstile con `render=explicit`.
     - Se añadió el contenedor `#turnstile-container` en el Paso 3 del formulario de confirmación, antes de los botones de acción.
  4. **Lógica de Cliente (`public/js/reserva.js`)**:
     - Renderizado explícito y diferido del widget únicamente al ingresar al Paso 3, evitando renderizados duplicados ante retrocesos en el wizard.
     - Chequeo de existencia de `window.turnstile` y espera segura asíncrona con fallback amigable en caso de falla de carga.
     - Validación previa obligatoria del token antes de enviar la reserva.
     - Reset garantizado del widget y limpieza de token en el bloque `finally` para asegurar el uso único del token en cada intento de envío.
     - Manejo de respuestas 403 y 503 sin avanzar de paso.

- **Por qué:**
  - Evitar ataques de bots y reservas fantasma sin autorización humana en el endpoint público `POST /api/reservas`, protegiendo además las cuotas y lecturas de Cloudflare D1 en el tier gratuito al validar el captcha antes de consultar la base de datos.

- **Cómo se verificó:**
  1. `GET /api/config`: Verificado con PowerShell devolviendo `{ turnstile_site_key: "1x00000000000000000000AA" }`.
  2. Petición `POST /api/reservas` sin token: Rechazada con HTTP 403 `{ error: "No pudimos verificar que sos una persona. Probá de nuevo." }`.
  3. Control positivo `POST /api/reservas` con token dummy y secret `1x...`: Exitosa con HTTP 201 Created y generación de ID `res_fdabdc29a55ac9d1`.
  4. Petición con secret inválido (`2x...`): Rechazada con HTTP 403 y mensaje de error al fallar la validación.
  5. Petición con secret de token gastado (`3x...`): Rechazada con HTTP 403 y mensaje de error al simular token consumido.
  6. Integridad en D1: Se constató mediante `SELECT COUNT(*) FROM reservas;` que el conteo inicial fue 0 y el final fue 1 (únicamente la reserva del control positivo), demostrando que ninguna solicitud rechazada insertó registros en la base.
