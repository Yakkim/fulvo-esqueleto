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
// Handlers (esqueleto, se completan en Fase 4 y 6)
// ============================================
async function manejarApi(request, env, tenant, pathname) {
  return new Response(JSON.stringify({ mensaje: "API OK", tenant: tenant.nombre }), {
    headers: { "Content-Type": "application/json" }
  });
}

async function manejarGestion(request, env, tenant, pathname) {
  return new Response("Panel de gestion (pendiente Fase 6/7)", { status: 200 });
}