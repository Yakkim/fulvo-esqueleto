/**
 * EL POTRERO - Datos Mock de Canchas y Utilidades
 * 
 * Este archivo contiene la información de las 6 canchas del predio
 * y funciones de consulta para el flujo de reservas.
 * 
 * TODO: En la siguiente fase, estos datos se obtendrán mediante:
 * fetch('https://api.elpotrero.com/api/canchas')
 */

const CANCHAS = [
  {
    id: 'cancha-1',
    numero: 1,
    nombre: 'La Bombonerita',
    tipo: 'Fútbol 5',
    categoria: 'F5',
    superficie: 'Césped Sintético Forbex 50mm',
    techada: true,
    precioHora: 32000,
    capacidad: '10 jugadores (5 vs 5)',
    medidas: '30 x 18 m',
    iluminacion: 'Reflectores LED 400W antideslumbrantes',
    caracteristicas: ['Techada (no se suspende por lluvia)', 'Piso amortiguado', 'Pelota F5 de medio pique'],
    descripcion: 'Cancha techada con alfombra premium de pelo alto y caucho ecológico. Ideal para jugar a máxima intensidad sin depender del clima.'
  },
  {
    id: 'cancha-2',
    numero: 2,
    nombre: 'El Monumentalito',
    tipo: 'Fútbol 5',
    categoria: 'F5',
    superficie: 'Césped Sintético Pro',
    techada: false,
    precioHora: 28000,
    capacidad: '10 jugadores (5 vs 5)',
    medidas: '32 x 20 m',
    iluminacion: '4 Torres LED 600W de alta visibilidad',
    caracteristicas: ['Al aire libre bajo reflectores', 'Líneas demarcadas con tiza sintética', 'Redes reglamentarias'],
    descripcion: 'Cancha rápida al aire libre con vista al cielo nocturno. Reflectores de estadio perimetrales que garantizan visión perfecta en cada pelota dividida.'
  },
  {
    id: 'cancha-3',
    numero: 3,
    nombre: 'El Diego',
    tipo: 'Fútbol 7',
    categoria: 'F7',
    superficie: 'Césped Sintético ShockPad',
    techada: false,
    precioHora: 46000,
    capacidad: '14 jugadores (7 vs 7)',
    medidas: '50 x 30 m',
    iluminacion: '6 Torres perimetrales de haz concentrado',
    caracteristicas: ['Base elástica ShockPad para articulaciones', 'Arcos de hierro reforzados', 'Área de bancos de suplentes'],
    descripcion: 'El espacio ideal para jugar con dinámica y metros para correr. Césped amortiguado de bajo impacto que cuida rodillas y tobillos.'
  },
  {
    id: 'cancha-4',
    numero: 4,
    nombre: 'La Scaloneta',
    tipo: 'Fútbol 7',
    categoria: 'F7',
    superficie: 'Sintético Premium Bicolor',
    techada: true,
    precioHora: 52000,
    capacidad: '14 jugadores (7 vs 7)',
    medidas: '52 x 32 m',
    iluminacion: 'Sistema lumínico suspendido de alta definición',
    caracteristicas: ['Tinglado alto con ventilación cruzada', 'Tablero digital de tanteador', 'Gradas laterales para hinchada'],
    descripcion: 'Nuestra joya de F7 techada. Tinglado de altura profesional que permite pelotazos aéreos, marcador digital y vestuario exclusivo al costado.'
  },
  {
    id: 'cancha-5',
    numero: 5,
    nombre: 'El Potrero Central',
    tipo: 'Fútbol 11',
    categoria: 'F11',
    superficie: 'Césped Natural Profesional',
    techada: false,
    precioHora: 88000,
    capacidad: '22 jugadores (11 vs 11)',
    medidas: '95 x 62 m',
    iluminacion: '8 Torres de estadio nivel transmisión nocturna',
    caracteristicas: ['Césped bermuda resembrado en invierno', 'Riego por aspersión computarizado', 'Túnel de salida y bancos oficiales'],
    descripcion: 'La experiencia definitiva de jugar en cancha grande de 11. Césped natural cuidado al detalle, líneas de cal impecables y atmósfera de final de copa.'
  },
  {
    id: 'cancha-6',
    numero: 6,
    nombre: 'Maracaná Nocturno',
    tipo: 'Fútbol 11',
    categoria: 'F11',
    superficie: 'Sintético FIFA Quality Pro',
    techada: false,
    precioHora: 94000,
    capacidad: '22 jugadores (11 vs 11)',
    medidas: '100 x 64 m',
    iluminacion: 'Reflectores LED 1200W iluminación 360°',
    caracteristicas: ['Homologación FIFA Quality', 'Drenaje rápido antihumedad', 'Banderines de córner flexibles oficiales'],
    descripcion: 'Dimensiones oficiales y césped sintético de densidad máxima. Perfecta para torneos competitivos, ligas nocturnas y partidos con amigos de pierna fuerte.'
  }
];

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
  return CANCHAS.find(cancha => cancha.id === id) || null;
}

/**
 * Genera de forma determinística la ocupación de horarios para una cancha y fecha específica.
 * Sin backend real, asegura que los mismos horarios aparezcan ocupados para una combinación dada.
 * 
 * TODO: reemplazar por fetch a /api/horarios-disponibles?cancha=${canchaId}&fecha=${fechaISO}
 * 
 * @param {string} canchaId 
 * @param {string} fechaStr (formato YYYY-MM-DD o clave del día)
 * @returns {Array<{hora: string, disponible: boolean, etiqueta: string}>}
 */
/**
 * Lee los bloqueos administrativos guardados por el panel (localStorage).
 * Devuelve un array vacío si todavía no hay bloqueos o si algo falla.
 *
 * TODO: cuando exista backend real, esto deja de leer localStorage y pasa
 * a venir directo de la misma respuesta de /api/horarios-disponibles
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
 * Genera la disponibilidad de horarios para una cancha y fecha específica,
 * cruzando primero contra los bloqueos administrativos reales guardados por
 * el panel, y usando el mock determinístico solo como relleno para el resto.
 *
 * TODO: reemplazar por fetch a /api/horarios-disponibles?cancha=${canchaId}&fecha=${fechaISO}
 *
 * @param {string} canchaId 
 * @param {string} fechaStr (formato YYYY-MM-DD)
 * @returns {Array<{hora: string, disponible: boolean, etiqueta: string, motivo?: string}>}
 */
function obtenerHorariosDisponibles(canchaId, fechaStr) {
  const bloqueos = obtenerBloqueosGuardados(canchaId, fechaStr);

  // Hash determinístico simple basado en canchaId + fechaStr (igual que antes)
  const semillaStr = `${canchaId}-${fechaStr}`;
  let hash = 0;
  for (let i = 0; i < semillaStr.length; i++) {
    hash = (hash * 31 + semillaStr.charCodeAt(i)) % 100000;
  }

  return HORARIOS_OPERATIVOS.map((hora, indice) => {
    // 1. Si está bloqueado desde el panel, gana siempre esto
    const bloqueo = bloqueos.find(b => b.horarios.includes(hora));
    if (bloqueo) {
      return {
        hora,
        disponible: false,
        etiqueta: 'OCUPADO',
        motivo: bloqueo.motivo
      };
    }

    // 2. Si no está bloqueado, seguimos con el mock determinístico de siempre
    const horaNum = parseInt(hora.split(':')[0], 10);
    const esHorarioPico = horaNum >= 20 && horaNum <= 22;

    const pseudoRandom = Math.sin(hash + indice * 17) * 10000;
    const factor = pseudoRandom - Math.floor(pseudoRandom);

    const ocupado = esHorarioPico ? (factor > 0.35) : (factor > 0.65);

    return {
      hora,
      disponible: !ocupado,
      etiqueta: ocupado ? 'OCUPADO' : 'LIBRE'
    };
  });
}

// Exportación compatible con navegador y módulos si fuera necesario
if (typeof window !== 'undefined') {
  window.CANCHAS = CANCHAS;
  window.HORARIOS_OPERATIVOS = HORARIOS_OPERATIVOS;
  window.formatearPrecio = formatearPrecio;
  window.obtenerCanchaPorId = obtenerCanchaPorId;
  window.obtenerHorariosDisponibles = obtenerHorariosDisponibles;
}
