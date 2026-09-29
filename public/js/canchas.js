/**
 * EL POTRERO - Datos de Canchas y Utilidades
 *
 * Carga la lista de canchas desde GET /api/canchas (mismo origen).
 * Mantiene la interfaz pública que reserva.js y el resto del frontend esperan:
 *   window.CANCHAS, window.obtenerCanchaPorId, window.formatearPrecio, etc.
 *
 * Los campos que el schema D1 todavía no devuelve (superficie, medidas,
 * techada, capacidad, iluminacion, caracteristicas) se rellenan con
 * defaults de gracia para que las cards no rompan. Se completarán cuando
 * se expanda el schema en la Fase 6.
 */

let CANCHAS = [];

/**
 * Carga las canchas desde la API y las deja en window.CANCHAS.
 * Devuelve el array resultante. Si la API falla, deja CANCHAS = [] y loguea el error.
 * @returns {Promise<Array>}
 */
async function cargarCanchas() {
  try {
    const res = await fetch('/api/canchas');
    if (!res.ok) {
      throw new Error(`API respondió ${res.status}`);
    }
    const data = await res.json();
    const lista = data.canchas || [];

    // Mapear al shape que reserva.js ya espera
    CANCHAS = lista.map(c => ({
      id:              c.id,
      nombre:          c.nombre          || 'Sin nombre',
      tipo:            c.tipo            || '',
      descripcion:     c.descripcion     || '',
      precioHora:      c.precio_hora     || 0,
      imagen_url:      c.imagen_url      || '',
      // Campos que D1 aún no tiene — defaults de gracia (Fase 6 los completa)
      numero:          c.numero          || '—',
      categoria:       c.categoria       || c.tipo || '',
      superficie:      c.superficie      || '—',
      techada:         c.techada         ?? false,
      capacidad:       c.capacidad       || '—',
      medidas:         c.medidas         || '—',
      iluminacion:     c.iluminacion     || '—',
      caracteristicas: c.caracteristicas || []
    }));

    window.CANCHAS = CANCHAS;
    return CANCHAS;
  } catch (err) {
    console.error('Error al cargar canchas desde la API:', err);
    CANCHAS = [];
    window.CANCHAS = CANCHAS;
    return CANCHAS;
  }
}

// Horarios de funcionamiento de las canchas (de 14:00 a 23:00)
const HORARIOS_OPERATIVOS = [
  '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00', '23:00'
];

/**
 * Formatea un valor numérico a moneda argentina (ARS)
 * @param {number} valor 
 * @returns {string} Ejemplo: "$ 32.000"
 */
function formatearPrecio(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(valor);
}

/**
 * Obtiene una cancha por su ID
 * @param {string} id 
 * @returns {Object|null}
 */
function obtenerCanchaPorId(id) {
  // == intencional: el id puede venir como int (API) o string (URL param)
  return CANCHAS.find(cancha => cancha.id == id) || null;
}

/**
 * Lee los bloqueos administrativos guardados por el panel (localStorage).
 * Devuelve un array vacío si todavía no hay bloqueos o si algo falla.
 *
 * Se usa SOLO como parte del fallback cuando la API no responde.
 * En Fase 6, los bloqueos vendrán de la tabla D1 y esto se elimina.
 */
function obtenerBloqueosGuardados(canchaId, fechaStr) {
  try {
    const bloqueos = JSON.parse(localStorage.getItem('elpotrero_admin_bloqueos')) || [];
    return bloqueos.filter(b => b.canchaId === canchaId && b.fecha === fechaStr);
  } catch (e) {
    console.error('Error al leer bloqueos de localStorage:', e);
    return [];
  }
}

/**
 * Mock determinístico de disponibilidad — fallback cuando la API falla.
 * Se eliminará por completo cuando la API sea estable.
 */
function fallbackHorariosMock(canchaId, fechaStr) {
  const bloqueos = obtenerBloqueosGuardados(canchaId, fechaStr);

  const semillaStr = `${canchaId}-${fechaStr}`;
  let hash = 0;
  for (let i = 0; i < semillaStr.length; i++) {
    hash = (hash * 31 + semillaStr.charCodeAt(i)) % 100000;
  }

  return HORARIOS_OPERATIVOS.map((hora, indice) => {
    const bloqueo = bloqueos.find(b => b.horarios.includes(hora));
    if (bloqueo) {
      return { hora, disponible: false, etiqueta: 'OCUPADO', motivo: bloqueo.motivo };
    }

    const horaNum = parseInt(hora.split(':')[0], 10);
    const esHorarioPico = horaNum >= 20 && horaNum <= 22;
    const pseudoRandom = Math.sin(hash + indice * 17) * 10000;
    const factor = pseudoRandom - Math.floor(pseudoRandom);
    const ocupado = esHorarioPico ? (factor > 0.35) : (factor > 0.65);

    return { hora, disponible: !ocupado, etiqueta: ocupado ? 'OCUPADO' : 'LIBRE' };
  });
}

/**
 * Obtiene la disponibilidad real de horarios desde la API.
 * Devuelve el formato que reserva.js espera:
 *   { hora, disponible, etiqueta: 'LIBRE'|'OCUPADO' }
 *
 * Si la API falla, usa el mock determinístico como fallback.
 *
 * @param {string|number} canchaId
 * @param {string} fechaStr (formato YYYY-MM-DD)
 * @returns {Promise<Array<{hora: string, disponible: boolean, etiqueta: string}>>}
 */
async function obtenerHorariosDisponibles(canchaId, fechaStr) {
  try {
    const res = await fetch(`/api/disponibilidad?cancha_id=${canchaId}&fecha=${fechaStr}`);
    if (!res.ok) {
      throw new Error(`API respondió ${res.status}`);
    }
    const data = await res.json();
    const franjas = data.disponibilidad || [];

    return franjas.map(slot => ({
      hora:       slot.hora,
      disponible: slot.disponible,
      etiqueta:   slot.disponible ? 'LIBRE' : 'OCUPADO'
    }));
  } catch (err) {
    console.warn('Error al consultar disponibilidad, usando fallback mock:', err);
    return fallbackHorariosMock(canchaId, fechaStr);
  }
}

// Exportación compatible con navegador y módulos si fuera necesario
if (typeof window !== 'undefined') {
  window.CANCHAS = CANCHAS;
  window.HORARIOS_OPERATIVOS = HORARIOS_OPERATIVOS;
  window.formatearPrecio = formatearPrecio;
  window.obtenerCanchaPorId = obtenerCanchaPorId;
  window.obtenerHorariosDisponibles = obtenerHorariosDisponibles;
  window.cargarCanchas = cargarCanchas;
}
