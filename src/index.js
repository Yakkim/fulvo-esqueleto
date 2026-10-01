// Cache simple en memoria del tenant, para no pegarle a D1 en cada request
const tenantCache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutos

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, hostname } = url;

    // 1. Resolver el tenant a partir del subdominio
    const tenant = await resolverTenant(hostname, env);

    if (!tenant) {
      return new Response("Complejo no encontrado", { status: 404 });
    }

    // 2. Rutas de API
    if (pathname.startsWith("/api/")) {
      return manejarApi(request, env, tenant, pathname);
    }

    // 3. Rutas de administración (legacy / pendiente)
    if (pathname.startsWith("/gestion/")) {
      return manejarGestion(request, env, tenant, pathname);
    }

    // 4. Panel de administración /admin/* (server-side gate)
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return manejarAdmin(request, env, tenant, pathname);
    }

    // 5. Cualquier otra ruta: la maneja Static Assets
    return env.ASSETS.fetch(request);
  }
};

// ============================================
// Resolución de tenant por subdominio (con cache)
// ============================================
async function resolverTenant(hostname, env) {
  const subdominio = extraerSubdominio(hostname);
  if (!subdominio) return null;

  const cacheado = tenantCache.get(subdominio);
  if (cacheado && (Date.now() - cacheado.ts) < TTL_MS) {
    return cacheado.data;
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM tenants WHERE subdominio = ? AND activo = 1"
  ).bind(subdominio).all();

  const tenant = results.length > 0 ? results[0] : null;
  tenantCache.set(subdominio, { data: tenant, ts: Date.now() });
  return tenant;
}

function extraerSubdominio(hostname) {
  // En local (localhost / 127.0.0.1), usamos un tenant fijo de prueba
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    return "cancha-norte";
  }

  const partes = hostname.split(".");
  // ejemplo: cancha-norte.tudominio.com.ar -> ["cancha-norte","tudominio","com","ar"]
  if (partes.length < 3) {
    return null;
  }
  return partes[0];
}

// ============================================
// Router de la API pública
// ============================================
async function manejarApi(request, env, tenant, pathname) {
  const url = new URL(request.url);

  // GET /api/canchas
  if (pathname === "/api/canchas" && request.method === "GET") {
    return listarCanchas(env, tenant);
  }

  // GET /api/canchas/:id
  const matchCanchaId = pathname.match(/^\/api\/canchas\/([a-zA-Z0-9_-]+)$/);
  if (matchCanchaId && request.method === "GET") {
    return obtenerCancha(env, tenant, matchCanchaId[1]);
  }

  // GET /api/disponibilidad?cancha_id=xxx&fecha=YYYY-MM-DD
  if (pathname === "/api/disponibilidad" && request.method === "GET") {
    const canchaId = url.searchParams.get("cancha_id");
    const fecha = url.searchParams.get("fecha");
    return obtenerDisponibilidad(env, tenant, canchaId, fecha);
  }

  // POST /api/auth/login
  if (pathname === "/api/auth/login" && request.method === "POST") {
    return loginAdmin(request, env, tenant);
  }

  // POST /api/auth/logout
  if (pathname === "/api/auth/logout" && request.method === "POST") {
    return logoutAdmin();
  }

  // POST /api/reservas
  if (pathname === "/api/reservas" && request.method === "POST") {
    return crearReserva(request, env, tenant);
  }

  // POST /api/canchas
  if (pathname === "/api/canchas" && request.method === "POST") {
    return crearCancha(request, env, tenant);
  }

  // PATCH /api/canchas/:id/toggle
  const matchCanchaToggle = pathname.match(/^\/api\/canchas\/([a-zA-Z0-9_-]+)\/toggle$/);
  if (matchCanchaToggle && request.method === "PATCH") {
    return toggleCancha(request, env, tenant, matchCanchaToggle[1]);
  }

  // PUT /api/canchas/:id
  if (matchCanchaId && request.method === "PUT") {
    return editarCancha(request, env, tenant, matchCanchaId[1]);
  }

  // POST /api/bloqueos
  if (pathname === "/api/bloqueos" && request.method === "POST") {
    return crearBloqueo(request, env, tenant);
  }

  // DELETE /api/bloqueos/:id
  const matchBloqueoId = pathname.match(/^\/api\/bloqueos\/([a-zA-Z0-9_-]+)$/);
  if (matchBloqueoId && request.method === "DELETE") {
    return eliminarBloqueo(request, env, tenant, matchBloqueoId[1]);
  }

  return jsonResponse({ error: "Ruta de API no encontrada" }, 404);
}

// ============================================
// Handlers de la API
// ============================================
async function listarCanchas(env, tenant) {
  const { results } = await env.DB.prepare(
    `SELECT id, nombre, tipo, categoria, numero, descripcion, precio_hora, imagen_url,
            superficie, techada, capacidad, medidas, iluminacion
     FROM canchas WHERE tenant_id = ? AND activa = 1
     ORDER BY numero`
  ).bind(tenant.id).all();

  return jsonResponse({ canchas: results });
}

async function obtenerCancha(env, tenant, canchaId) {
  const cancha = await env.DB.prepare(
    `SELECT id, nombre, tipo, categoria, numero, descripcion, precio_hora, imagen_url,
            superficie, techada, capacidad, medidas, iluminacion
     FROM canchas WHERE id = ? AND tenant_id = ? AND activa = 1`
  ).bind(canchaId, tenant.id).first();

  if (!cancha) {
    return jsonResponse({ error: "Cancha no encontrada" }, 404);
  }

  return jsonResponse({ cancha });
}

async function crearCancha(request, env, tenant) {
  const authError = await asegurarAdmin(request, env, tenant);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Body JSON inválido" }, 400);
  }

  const { nombre, tipo, precio_hora } = body || {};
  const faltantes = [];
  if (!nombre) faltantes.push("nombre");
  if (!tipo) faltantes.push("tipo");
  if (precio_hora === undefined || precio_hora === null || isNaN(Number(precio_hora))) {
    faltantes.push("precio_hora");
  }

  if (faltantes.length > 0) {
    return jsonResponse({ error: `Campos requeridos faltantes o inválidos: ${faltantes.join(", ")}` }, 400);
  }

  const id = generarIdCancha();
  const techada = body.techada ? 1 : 0;
  const precioHoraNum = Number(precio_hora);

  await env.DB.prepare(
    `INSERT INTO canchas (
      id, tenant_id, nombre, tipo, categoria, numero, descripcion,
      precio_hora, superficie, techada, capacidad, medidas, iluminacion, imagen_url, activa
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(
    id,
    tenant.id,
    nombre,
    tipo,
    body.categoria || null,
    body.numero !== undefined && body.numero !== null && !isNaN(Number(body.numero)) ? Number(body.numero) : null,
    body.descripcion || null,
    precioHoraNum,
    body.superficie || null,
    techada,
    body.capacidad || null,
    body.medidas || null,
    body.iluminacion || null,
    body.imagen_url || null
  ).run();

  const cancha = await env.DB.prepare(
    `SELECT id, nombre, tipo, categoria, numero, descripcion, precio_hora, imagen_url,
            superficie, techada, capacidad, medidas, iluminacion, activa
     FROM canchas WHERE id = ? AND tenant_id = ?`
  ).bind(id, tenant.id).first();

  return jsonResponse({ cancha }, 201);
}

async function editarCancha(request, env, tenant, canchaId) {
  const authError = await asegurarAdmin(request, env, tenant);
  if (authError) return authError;

  const existe = await env.DB.prepare(
    "SELECT id FROM canchas WHERE id = ? AND tenant_id = ?"
  ).bind(canchaId, tenant.id).first();

  if (!existe) {
    return jsonResponse({ error: "Cancha no encontrada" }, 404);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Body JSON inválido" }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Body JSON inválido" }, 400);
  }

  // Whitelist fija de columnas actualizables
  const COLUMNAS_PERMITIDAS = [
    "nombre", "tipo", "categoria", "numero", "descripcion",
    "precio_hora", "superficie", "techada", "capacidad", "medidas",
    "iluminacion", "imagen_url"
  ];

  const setClauses = [];
  const values = [];

  for (const col of COLUMNAS_PERMITIDAS) {
    if (body[col] !== undefined) {
      setClauses.push(`${col} = ?`);
      if (col === "techada") {
        values.push(body.techada ? 1 : 0);
      } else if (col === "precio_hora") {
        values.push(Number(body.precio_hora));
      } else if (col === "numero") {
        values.push(body.numero !== null && !isNaN(Number(body.numero)) ? Number(body.numero) : null);
      } else {
        values.push(body[col]);
      }
    }
  }

  if (setClauses.length > 0) {
    values.push(canchaId, tenant.id);
    await env.DB.prepare(
      `UPDATE canchas SET ${setClauses.join(", ")} WHERE id = ? AND tenant_id = ?`
    ).bind(...values).run();
  }

  const cancha = await env.DB.prepare(
    `SELECT id, nombre, tipo, categoria, numero, descripcion, precio_hora, imagen_url,
            superficie, techada, capacidad, medidas, iluminacion, activa
     FROM canchas WHERE id = ? AND tenant_id = ?`
  ).bind(canchaId, tenant.id).first();

  return jsonResponse({ cancha }, 200);
}

async function toggleCancha(request, env, tenant, canchaId) {
  const authError = await asegurarAdmin(request, env, tenant);
  if (authError) return authError;

  const cancha = await env.DB.prepare(
    "SELECT id, activa FROM canchas WHERE id = ? AND tenant_id = ?"
  ).bind(canchaId, tenant.id).first();

  if (!cancha) {
    return jsonResponse({ error: "Cancha no encontrada" }, 404);
  }

  const nuevoValor = cancha.activa === 1 ? 0 : 1;

  await env.DB.prepare(
    "UPDATE canchas SET activa = ? WHERE id = ? AND tenant_id = ?"
  ).bind(nuevoValor, canchaId, tenant.id).run();

  return jsonResponse({ id: canchaId, activa: nuevoValor }, 200);
}

async function crearBloqueo(request, env, tenant) {
  const authError = await asegurarAdmin(request, env, tenant);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Body JSON inválido" }, 400);
  }

  const { cancha_id, fecha, horarios, motivo, nota } = body || {};

  const faltantes = [];
  if (!cancha_id) faltantes.push("cancha_id");
  if (!fecha) faltantes.push("fecha");
  if (!horarios) faltantes.push("horarios");
  if (!motivo) faltantes.push("motivo");

  if (faltantes.length > 0) {
    return jsonResponse({ error: `Campos requeridos faltantes: ${faltantes.join(", ")}` }, 400);
  }

  // Validar formato fecha (YYYY-MM-DD)
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha)) {
    return jsonResponse({ error: "Formato de fecha inválido, usar YYYY-MM-DD" }, 400);
  }

  // Validar horarios: array no vacío
  if (!Array.isArray(horarios) || horarios.length === 0) {
    return jsonResponse({ error: "El campo horarios debe ser un array no vacío" }, 400);
  }

  // Validar formato y rango de cada hora en horarios (HH:MM con HH entre 00 y 23, MM entre 00 y 59)
  const horaRegex = /^\d{2}:\d{2}$/;
  for (const h of horarios) {
    if (typeof h !== "string" || !horaRegex.test(h)) {
      return jsonResponse({ error: `Horario inválido: ${h}` }, 400);
    }
    const [hh, mm] = h.split(":").map(Number);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      return jsonResponse({ error: `Horario inválido: ${h}` }, 400);
    }
  }

  // Validar que la cancha pertenezca al tenant actual
  const cancha = await env.DB.prepare(
    "SELECT id FROM canchas WHERE id = ? AND tenant_id = ?"
  ).bind(cancha_id, tenant.id).first();

  if (!cancha) {
    return jsonResponse({ error: "Cancha no encontrada" }, 404);
  }

  const id = generarIdBloqueo();
  const horariosJson = JSON.stringify(horarios);

  await env.DB.prepare(
    `INSERT INTO bloqueos (id, tenant_id, cancha_id, fecha, horarios, motivo, nota)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, tenant.id, cancha_id, fecha, horariosJson, motivo, nota || null).run();

  const bloqueo = await env.DB.prepare(
    "SELECT id, cancha_id, fecha, horarios, motivo, nota, creado_en FROM bloqueos WHERE id = ?"
  ).bind(id).first();

  let horariosParsed = horarios;
  try {
    horariosParsed = JSON.parse(bloqueo.horarios);
  } catch {}

  return jsonResponse({
    bloqueo: {
      ...bloqueo,
      horarios: horariosParsed
    }
  }, 201);
}

async function eliminarBloqueo(request, env, tenant, bloqueoId) {
  const authError = await asegurarAdmin(request, env, tenant);
  if (authError) return authError;

  const bloqueo = await env.DB.prepare(
    "SELECT id FROM bloqueos WHERE id = ? AND tenant_id = ?"
  ).bind(bloqueoId, tenant.id).first();

  if (!bloqueo) {
    return jsonResponse({ error: "Bloqueo no encontrado" }, 404);
  }

  await env.DB.prepare(
    "DELETE FROM bloqueos WHERE id = ? AND tenant_id = ?"
  ).bind(bloqueoId, tenant.id).run();

  return jsonResponse({ id: bloqueoId, eliminado: true }, 200);
}

async function obtenerDisponibilidad(env, tenant, canchaId, fecha) {
  if (!canchaId || !fecha) {
    return jsonResponse({ error: "Faltan parametros: cancha_id y fecha son requeridos" }, 400);
  }

  // Validar que la cancha pertenezca al tenant
  const cancha = await env.DB.prepare(
    "SELECT id FROM canchas WHERE id = ? AND tenant_id = ? AND activa = 1"
  ).bind(canchaId, tenant.id).first();

  if (!cancha) {
    return jsonResponse({ error: "Cancha no encontrada" }, 404);
  }

  // Traer las reservas confirmadas/pendientes de ese dia
  const { results } = await env.DB.prepare(
    `SELECT hora_inicio, hora_fin FROM reservas
     WHERE cancha_id = ? AND tenant_id = ? AND fecha = ? AND estado != 'cancelada'`
  ).bind(canchaId, tenant.id, fecha).all();

  // Generar franjas horarias del dia (09:00 a 23:00, cada 1 hora) y marcar ocupadas
  const franjas = generarFranjas("09:00", "23:00", 60);
  const ocupadas = new Set(results.map(r => r.hora_inicio));

  const disponibilidad = franjas.map(hora => ({
    hora,
    disponible: !ocupadas.has(hora)
  }));

  return jsonResponse({ cancha_id: canchaId, fecha, disponibilidad });
}

async function crearReserva(request, env, tenant) {
  // 1. Parsear body
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Body JSON inválido" }, 400);
  }

  // 2. Validar campos requeridos
  const { cancha_id, fecha, hora_inicio, hora_fin, nombre_cliente, telefono_cliente,
          email_cliente, metodo_pago, notas } = body || {};

  const faltantes = [];
  if (!cancha_id)        faltantes.push("cancha_id");
  if (!fecha)            faltantes.push("fecha");
  if (!hora_inicio)      faltantes.push("hora_inicio");
  if (!hora_fin)         faltantes.push("hora_fin");
  if (!nombre_cliente)   faltantes.push("nombre_cliente");
  if (!telefono_cliente) faltantes.push("telefono_cliente");

  if (faltantes.length > 0) {
    return jsonResponse({ error: `Campos requeridos faltantes: ${faltantes.join(", ")}` }, 400);
  }

  // 3. Validar formato fecha (YYYY-MM-DD) y hora (HH:MM)
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  const horaRegex = /^\d{2}:\d{2}$/;

  if (!fechaRegex.test(fecha)) {
    return jsonResponse({ error: "Formato de fecha inválido, usar YYYY-MM-DD" }, 400);
  }
  if (!horaRegex.test(hora_inicio) || !horaRegex.test(hora_fin)) {
    return jsonResponse({ error: "Formato de hora inválido, usar HH:MM" }, 400);
  }

  // 4. Validar que hora_inicio < hora_fin
  if (hora_inicio >= hora_fin) {
    return jsonResponse({ error: "hora_inicio debe ser menor a hora_fin" }, 400);
  }

  // 5. Validar que la cancha exista y pertenezca al tenant
  const cancha = await env.DB.prepare(
    "SELECT id, precio_hora FROM canchas WHERE id = ? AND tenant_id = ? AND activa = 1"
  ).bind(cancha_id, tenant.id).first();

  if (!cancha) {
    return jsonResponse({ error: "Cancha no encontrada" }, 404);
  }

  // 6. Generar las horas intermedias del turno pedido (hora_inicio inclusive, hora_fin exclusive)
  const horasTurno = generarFranjas(hora_inicio, hora_fin, 60);

  // 7. Chequear bloqueos administrativos
  const { results: bloqueos } = await env.DB.prepare(
    "SELECT horarios, motivo FROM bloqueos WHERE tenant_id = ? AND cancha_id = ? AND fecha = ?"
  ).bind(tenant.id, cancha_id, fecha).all();

  for (const bloqueo of bloqueos) {
    let horasBloqueadas = [];
    try {
      horasBloqueadas = JSON.parse(bloqueo.horarios);
    } catch {
      continue;
    }
    const horaConflicto = horasTurno.find(h => horasBloqueadas.includes(h));
    if (horaConflicto) {
      return jsonResponse({
        error: `Horario bloqueado por administración: ${bloqueo.motivo || "sin motivo"}`,
        hora_bloqueada: horaConflicto
      }, 409);
    }
  }

  // 8. Chequear solapamiento con reservas existentes
  //    Una reserva existente se solapa si: su hora_inicio < hora_fin pedida AND su hora_fin > hora_inicio pedida
  const reservaExistente = await env.DB.prepare(
    `SELECT id, hora_inicio, hora_fin FROM reservas
     WHERE cancha_id = ? AND tenant_id = ? AND fecha = ? AND estado != 'cancelada'
     AND hora_inicio < ? AND hora_fin > ?`
  ).bind(cancha_id, tenant.id, fecha, hora_fin, hora_inicio).first();

  if (reservaExistente) {
    return jsonResponse({
      error: `Horario no disponible: ya existe una reserva de ${reservaExistente.hora_inicio} a ${reservaExistente.hora_fin}`,
      reserva_conflicto: reservaExistente.id
    }, 409);
  }

  // 9. Generar ID y calcular monto
  const reservaId = generarIdReserva();
  const cantidadHoras = horasTurno.length;
  const montoTotal = cancha.precio_hora * cantidadHoras;

  // 10. INSERT
  await env.DB.prepare(
    `INSERT INTO reservas (id, tenant_id, cancha_id, nombre_cliente, telefono_cliente,
       email_cliente, fecha, hora_inicio, hora_fin, estado, monto_total, metodo_pago, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`
  ).bind(
    reservaId, tenant.id, cancha_id, nombre_cliente, telefono_cliente,
    email_cliente || null, fecha, hora_inicio, hora_fin, montoTotal,
    metodo_pago || null, notas || null
  ).run();

  // 11. Leer la reserva insertada para devolver creado_en
  const reservaCreada = await env.DB.prepare(
    "SELECT id, cancha_id, fecha, hora_inicio, hora_fin, nombre_cliente, telefono_cliente, email_cliente, estado, monto_total, metodo_pago, notas, creado_en FROM reservas WHERE id = ?"
  ).bind(reservaId).first();

  return jsonResponse({ reserva: reservaCreada }, 201);
}

function generarIdReserva() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `res_${hex}`;
}

function generarIdCancha() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `cancha_${hex}`;
}

function generarIdBloqueo() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `bloqueo_${hex}`;
}

// ============================================
// Utilidades
// ============================================
function generarFranjas(horaInicio, horaFin, intervaloMinutos) {
  const franjas = [];
  let [h, m] = horaInicio.split(":").map(Number);
  const [hFin, mFin] = horaFin.split(":").map(Number);

  while (h < hFin || (h === hFin && m < mFin)) {
    franjas.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += intervaloMinutos;
    if (m >= 60) {
      h += 1;
      m -= 60;
    }
  }
  return franjas;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function manejarGestion(request, env, tenant, pathname) {
  return new Response("Panel de gestion (pendiente Fase 6/7)", { status: 200 });
}

// ============================================
// Gate de Administración (/admin/*)
// ============================================
async function manejarAdmin(request, env, tenant, pathname) {
  // Si pathname es exactamente /admin/login.html, /admin/login, o empieza con /admin/css/ o /admin/js/ o /admin/assets/
  // -> servir directo con env.ASSETS.fetch(request), sin chequeo (son estáticos, no sensibles)
  if (
    pathname === "/admin/login.html" ||
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/css/") ||
    pathname.startsWith("/admin/js/") ||
    pathname.startsWith("/admin/assets/")
  ) {
    return env.ASSETS.fetch(request);
  }

  // Para cualquier otro pathname bajo /admin/ (típicamente /admin/ o /admin/index.html)
  // -> llamar requireAuth(); si es true, env.ASSETS.fetch(request); si es false, redirect 302 a /admin/login.html
  const estaAutenticado = await requireAuth(request, env, tenant);
  if (estaAutenticado) {
    if (pathname === "/admin") {
      return Response.redirect(new URL("/admin/index.html", request.url), 302);
    }
    return env.ASSETS.fetch(request);
  }

  return Response.redirect(new URL("/admin/login.html", request.url), 302);
}

// ============================================
// Endpoints de Autenticación
// ============================================
async function loginAdmin(request, env, tenant) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Usuario o contraseña incorrectos" }, 401);
  }

  const { usuario, password } = body || {};
  if (!usuario || !password) {
    return jsonResponse({ error: "Usuario o contraseña incorrectos" }, 401);
  }

  if (!tenant.admin_usuario || tenant.admin_usuario !== usuario) {
    return jsonResponse({ error: "Usuario o contraseña incorrectos" }, 401);
  }

  const valido = await verificarPassword(
    password,
    tenant.admin_password_salt,
    tenant.admin_password_hash
  );

  if (!valido) {
    return jsonResponse({ error: "Usuario o contraseña incorrectos" }, 401);
  }

  const exp = Math.floor(Date.now() / 1000) + 28800; // 8 horas
  const secret = env.SESSION_SECRET || "";
  const token = await firmarSesion({ tenant_id: tenant.id, exp }, secret);

  const isDev = env.ENVIRONMENT === "development";
  const secureFlag = isDev ? "" : "; Secure";
  const cookieHeader = `potrero_admin_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secureFlag}`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader
    }
  });
}

function logoutAdmin() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "potrero_admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
    }
  });
}

async function requireAuth(request, env, tenant) {
  if (!env.SESSION_SECRET) return false;
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)potrero_admin_session=([^;]*)/);
  if (!match) return false;
  const token = decodeURIComponent(match[1].trim());
  const payload = await verificarSesion(token, env.SESSION_SECRET);
  if (!payload) return false;
  if (payload.tenant_id !== tenant.id) return false;
  return true;
}

async function asegurarAdmin(request, env, tenant) {
  const autorizado = await requireAuth(request, env, tenant);
  if (!autorizado) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }
  return null;
}

// ============================================
// Helpers de Criptografía (Web Crypto API)
// ============================================
function hexToBytes(hex) {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64UrlEncode(bufferOrStr) {
  let bytes;
  if (typeof bufferOrStr === "string") {
    bytes = new TextEncoder().encode(bufferOrStr);
  } else {
    bytes = new Uint8Array(bufferOrStr);
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return mismatch === 0;
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const saltBytes = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256 // 32 bytes = 256 bits
  );
  return bytesToHex(derivedBits);
}

async function verificarPassword(password, saltHex, hashEsperadoHex) {
  if (!password || !saltHex || !hashEsperadoHex) return false;
  const hashCalculadoHex = await hashPassword(password, saltHex);
  return timingSafeEqualStr(hashCalculadoHex.toLowerCase(), hashEsperadoHex.toLowerCase());
}

async function firmarSesion(payload, secret) {
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(payloadB64)
  );
  const firmaB64 = base64UrlEncode(signatureBuffer);
  return `${payloadB64}.${firmaB64}`;
}

async function verificarSesion(cookieValue, secret) {
  if (!cookieValue || !secret || !cookieValue.includes(".")) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, firmaB64] = parts;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(payloadB64)
  );
  const firmaCalculadaB64 = base64UrlEncode(signatureBuffer);

  if (!timingSafeEqualStr(firmaB64, firmaCalculadaB64)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) {
    return null;
  }

  return payload;
}