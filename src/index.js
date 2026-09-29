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

    // 3. Rutas de administración
    if (pathname.startsWith("/gestion/")) {
      return manejarGestion(request, env, tenant, pathname);
    }

    // 4. Cualquier otra ruta: la maneja Static Assets
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

  return jsonResponse({ error: "Ruta de API no encontrada" }, 404);
}

// ============================================
// Handlers de la API
// ============================================
async function listarCanchas(env, tenant) {
  const { results } = await env.DB.prepare(
    "SELECT id, nombre, tipo, descripcion, precio_hora, imagen_url FROM canchas WHERE tenant_id = ? AND activa = 1"
  ).bind(tenant.id).all();

  return jsonResponse({ canchas: results });
}

async function obtenerCancha(env, tenant, canchaId) {
  const cancha = await env.DB.prepare(
    "SELECT id, nombre, tipo, descripcion, precio_hora, imagen_url FROM canchas WHERE id = ? AND tenant_id = ? AND activa = 1"
  ).bind(canchaId, tenant.id).first();

  if (!cancha) {
    return jsonResponse({ error: "Cancha no encontrada" }, 404);
  }

  return jsonResponse({ cancha });
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