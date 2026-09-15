/**
 * EL POTRERO - Panel de Administración: Capa de Datos y Persistencia Mock
 * 
 * Gestiona el almacenamiento local de canchas, bloqueos y reservas.
 * Todos los métodos incluyen comentarios de integración futura con la API.
 */

const STORAGE_KEYS = {
  CANCHAS: 'elpotrero_admin_canchas',
  BLOQUEOS: 'elpotrero_admin_bloqueos',
  RESERVAS: 'elpotrero_admin_reservas',
  AUTH: 'elpotrero_admin_auth'
};

// Paleta de colores de acento por cancha para el calendario y reportes
// Reutiliza e intensifica la paleta oficial (verde, oro, tiza, carbón) sin colores ajenos
const CANCHAS_PALETA = {
  'cancha-1': { bg: '#1E5333', border: '#F2B705', text: '#F1F3EA', badge: '#F2B705', badgeText: '#3D2E00' }, // La Bombonerita
  'cancha-2': { bg: '#16482B', border: '#81C784', text: '#F1F3EA', badge: '#81C784', badgeText: '#133A22' }, // El Monumentalito
  'cancha-3': { bg: '#255C37', border: '#FFD54F', text: '#F1F3EA', badge: '#FFD54F', badgeText: '#3D2E00' }, // El Diego
  'cancha-4': { bg: '#1B4729', border: '#A5D6A7', text: '#F1F3EA', badge: '#A5D6A7', badgeText: '#133A22' }, // La Scaloneta
  'cancha-5': { bg: '#234E33', border: '#DCE775', text: '#F1F3EA', badge: '#DCE775', badgeText: '#283618' }, // El Potrero Central
  'cancha-6': { bg: '#133A22', border: '#FFE082', text: '#F1F3EA', badge: '#FFE082', badgeText: '#3D2E00' }  // Maracaná Nocturno
};

const NOMBRES_CLIENTES = [
  'Lucas Fernández', 'Matías Gómez', 'Gonzalo Romero', 'Tomás Benítez',
  'Agustín Díaz', 'Facundo Torres', 'Santiago Morales', 'Nicolás Castro',
  'Martín Palermo', 'Juan Román Pérez', 'Franco Armani', 'Julián Álvarez',
  'Rodrigo De Paul', 'Leandro Paredes', 'Alexis Mac Allister', 'Emiliano Martínez',
  'Federico Valverde', 'Nahuel Molina', 'Cristian Romero', 'Enzo Fernández'
];

/**
 * Inicializa los datos en localStorage si no existen
 */
function inicializarDatosAdmin() {
  // 1. Canchas
  // TODO: reemplazar por fetch('https://api.elpotrero.com/api/canchas') en producción
  if (!localStorage.getItem(STORAGE_KEYS.CANCHAS)) {
    const canchasBase = (typeof window.CANCHAS !== 'undefined') ? window.CANCHAS : [
      { id: 'cancha-1', numero: 1, nombre: 'La Bombonerita', tipo: 'Fútbol 5', categoria: 'F5', superficie: 'Césped Sintético Forbex 50mm', techada: true, precioHora: 32000, capacidad: '10 jugadores', medidas: '30 x 18 m', iluminacion: 'LED 400W', activa: true },
      { id: 'cancha-2', numero: 2, nombre: 'El Monumentalito', tipo: 'Fútbol 5', categoria: 'F5', superficie: 'Césped Sintético Pro', techada: false, precioHora: 28000, capacidad: '10 jugadores', medidas: '32 x 20 m', iluminacion: 'Torres LED 600W', activa: true },
      { id: 'cancha-3', numero: 3, nombre: 'El Diego', tipo: 'Fútbol 7', categoria: 'F7', superficie: 'Césped Sintético ShockPad', techada: false, precioHora: 46000, capacidad: '14 jugadores', medidas: '50 x 30 m', iluminacion: 'Torres 600W', activa: true },
      { id: 'cancha-4', numero: 4, nombre: 'La Scaloneta', tipo: 'Fútbol 7', categoria: 'F7', superficie: 'Sintético Premium Bicolor', techada: true, precioHora: 52000, capacidad: '14 jugadores', medidas: '52 x 32 m', iluminacion: 'LED Alta Definición', activa: true },
      { id: 'cancha-5', numero: 5, nombre: 'El Potrero Central', tipo: 'Fútbol 11', categoria: 'F11', superficie: 'Césped Natural Profesional', techada: false, precioHora: 88000, capacidad: '22 jugadores', medidas: '95 x 62 m', iluminacion: 'Torres Transmisión TV', activa: true },
      { id: 'cancha-6', numero: 6, nombre: 'Maracaná Nocturno', tipo: 'Fútbol 11', categoria: 'F11', superficie: 'Sintético FIFA Quality Pro', techada: false, precioHora: 94000, capacidad: '22 jugadores', medidas: '100 x 64 m', iluminacion: 'Reflectores LED 1200W', activa: true }
    ];
    
    // Asegurar propiedad 'activa' en cada cancha
    const canchasIniciales = canchasBase.map(c => ({
      ...c,
      activa: c.activa !== undefined ? c.activa : true
    }));
    
    localStorage.setItem(STORAGE_KEYS.CANCHAS, JSON.stringify(canchasIniciales));
  }

  // 2. Bloqueos iniciales de muestra
  // TODO: reemplazar por fetch('https://api.elpotrero.com/api/bloqueos') en producción
  if (!localStorage.getItem(STORAGE_KEYS.BLOQUEOS)) {
    const hoyStr = new Date().toISOString().split('T')[0];
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const mananaStr = manana.toISOString().split('T')[0];

    const bloqueosIniciales = [
      {
        id: 'blk-1',
        canchaId: 'cancha-2',
        canchaNombre: 'El Monumentalito',
        fecha: hoyStr,
        horarios: ['14:00', '15:00'],
        motivo: 'Mantenimiento',
        nota: 'Recepillado de caucho y alineación de reflectores',
        creadoEn: new Date().toISOString()
      },
      {
        id: 'blk-2',
        canchaId: 'cancha-5',
        canchaNombre: 'El Potrero Central',
        fecha: mananaStr,
        horarios: ['14:00', '15:00', '16:00'],
        motivo: 'Mantenimiento',
        nota: 'Riego intensivo y resembrado de área chica',
        creadoEn: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.BLOQUEOS, JSON.stringify(bloqueosIniciales));
  }

  // 3. Reservas mock realistas
  // TODO: reemplazar por fetch('https://api.elpotrero.com/api/reservas') en producción
  if (!localStorage.getItem(STORAGE_KEYS.RESERVAS)) {
    generarReservasMockIniciales();
  }
}

/**
 * Genera un conjunto rico de reservas para poblar calendario y reportes
 */
function generarReservasMockIniciales() {
  const canchas = JSON.parse(localStorage.getItem(STORAGE_KEYS.CANCHAS));
  const horarios = (typeof window.HORARIOS_OPERATIVOS !== 'undefined')
    ? window.HORARIOS_OPERATIVOS
    : ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

  const reservas = [];
  const hoy = new Date();

  // Generamos reservas desde hace 20 días hasta 10 días en el futuro
  let contadorId = 1001;

  for (let offsetDias = -20; offsetDias <= 10; offsetDias++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + offsetDias);
    const fechaStr = fecha.toISOString().split('T')[0];
    const esPasado = offsetDias < 0;

    canchas.forEach((cancha, cIdx) => {
      // Determinamos cuántas reservas hay en este día para esta cancha (entre 2 y 6)
      const cantReservas = ((cIdx + offsetDias + 30) % 5) + 1;
      
      // Seleccionar horarios distribuidos (priorizando noche 19:00 a 22:00)
      const horariosDisponibles = [...horarios];
      for (let r = 0; r < cantReservas; r++) {
        if (horariosDisponibles.length === 0) break;

        // Horarios pico tienen más probabilidad
        const slotIdx = (r * 2 + (cIdx % 3)) % horariosDisponibles.length;
        const hora = horariosDisponibles.splice(slotIdx, 1)[0];
        
        const clienteIdx = (contadorId + cIdx * 3) % NOMBRES_CLIENTES.length;
        const clienteNombre = NOMBRES_CLIENTES[clienteIdx];
        const telNum = 1140000000 + (contadorId * 37) % 90000000;
        const clienteTelefono = `+54 9 ${telNum}`;

        // Estados
        let estado = 'confirmada';
        if (esPasado) {
          estado = ((contadorId % 10) === 0) ? 'cancelada' : 'confirmada';
        } else {
          estado = ((contadorId % 5) === 0) ? 'pendiente' : 'confirmada';
        }

        const metodosPago = ['mercadopago', 'mercadopago', 'efectivo', 'transferencia'];
        const metodoPago = metodosPago[contadorId % metodosPago.length];

        reservas.push({
          id: `POTRERO-${contadorId}`,
          canchaId: cancha.id,
          canchaNombre: cancha.nombre,
          tipoCancha: cancha.tipo,
          fecha: fechaStr,
          hora: hora,
          clienteNombre: clienteNombre,
          clienteTelefono: clienteTelefono,
          estado: estado,
          monto: cancha.precioHora || 32000,
          metodoPago: metodoPago,
          creadoEn: new Date(fecha.getTime() - 86400000 * 2).toISOString(),
          notas: (estado === 'pendiente') ? 'Seña abonada 50% vía Mercado Pago' : 'Pago total completado'
        });

        contadorId++;
      }
    });
  }

  localStorage.setItem(STORAGE_KEYS.RESERVAS, JSON.stringify(reservas));
}

// ============================================================================
// API HELPERS (con comentarios TODO de reemplazo por fetch a Cloudflare Workers)
// ============================================================================

const adminDatos = {
  /**
   * Obtiene la lista completa de canchas
   * TODO: reemplazar por fetch('https://api.elpotrero.com/api/canchas')
   */
  getCanchas() {
    inicializarDatosAdmin();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CANCHAS)) || [];
    } catch (e) {
      console.error('Error al leer canchas de localStorage:', e);
      return [];
    }
  },

  /**
   * Guarda o actualiza una cancha
   * TODO: reemplazar por fetch('https://api.elpotrero.com/api/canchas', { method: 'POST'/'PUT', body: JSON.stringify(cancha) })
   */
  guardarCancha(canchaData) {
    const canchas = this.getCanchas();
    let esNueva = false;

    if (!canchaData.id) {
      esNueva = true;
      const nuevoIdNum = canchas.length + 1;
      canchaData.id = `cancha-${nuevoIdNum}`;
      canchaData.numero = nuevoIdNum;
      if (canchaData.activa === undefined) canchaData.activa = true;
      canchas.push(canchaData);
    } else {
      const idx = canchas.findIndex(c => c.id === canchaData.id);
      if (idx !== -1) {
        canchas[idx] = { ...canchas[idx], ...canchaData };
      } else {
        canchas.push(canchaData);
      }
    }

    localStorage.setItem(STORAGE_KEYS.CANCHAS, JSON.stringify(canchas));
    return { ok: true, cancha: canchaData, esNueva };
  },

  /**
   * Cambia el estado activo/inactivo de una cancha
   * TODO: reemplazar por fetch(`https://api.elpotrero.com/api/canchas/${id}/toggle`, { method: 'PATCH' })
   */
  toggleEstadoCancha(id) {
    const canchas = this.getCanchas();
    const cancha = canchas.find(c => c.id === id);
    if (!cancha) return { ok: false, error: 'Cancha no encontrada' };

    cancha.activa = !cancha.activa;
    localStorage.setItem(STORAGE_KEYS.CANCHAS, JSON.stringify(canchas));
    return { ok: true, cancha };
  },

  /**
   * Obtiene una cancha por su ID
   */
  getCanchaById(id) {
    return this.getCanchas().find(c => c.id === id) || null;
  },

  /**
   * Obtiene la lista completa de bloqueos de horarios
   * TODO: reemplazar por fetch('https://api.elpotrero.com/api/bloqueos')
   */
  getBloqueos() {
    inicializarDatosAdmin();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.BLOQUEOS)) || [];
    } catch (e) {
      console.error('Error al leer bloqueos de localStorage:', e);
      return [];
    }
  },

  /**
   * Agrega un nuevo bloqueo
   * TODO: reemplazar por fetch('https://api.elpotrero.com/api/bloqueos', { method: 'POST', body: JSON.stringify(...) })
   */
  crearBloqueo({ canchaId, fecha, horarios, motivo, nota }) {
    if (!canchaId || !fecha || !horarios || horarios.length === 0) {
      return { ok: false, error: 'Completá cancha, fecha y al menos un horario.' };
    }

    const canchas = this.getCanchas();
    const cancha = canchas.find(c => c.id === canchaId);
    const bloqueos = this.getBloqueos();

    const nuevoBloqueo = {
      id: `blk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      canchaId,
      canchaNombre: cancha ? cancha.nombre : 'Cancha',
      fecha,
      horarios: Array.isArray(horarios) ? horarios : [horarios],
      motivo: motivo || 'Mantenimiento',
      nota: nota || '',
      creadoEn: new Date().toISOString()
    };

    bloqueos.unshift(nuevoBloqueo);
    localStorage.setItem(STORAGE_KEYS.BLOQUEOS, JSON.stringify(bloqueos));
    return { ok: true, bloqueo: nuevoBloqueo };
  },

  /**
   * Levanta (elimina) un bloqueo de horario
   * TODO: reemplazar por fetch(`https://api.elpotrero.com/api/bloqueos/${id}`, { method: 'DELETE' })
   */
  eliminarBloqueo(id) {
    let bloqueos = this.getBloqueos();
    const totalInicial = bloqueos.length;
    bloqueos = bloqueos.filter(b => b.id !== id);

    if (bloqueos.length === totalInicial) {
      return { ok: false, error: 'Bloqueo no encontrado' };
    }

    localStorage.setItem(STORAGE_KEYS.BLOQUEOS, JSON.stringify(bloqueos));
    return { ok: true };
  },

  /**
   * Obtiene la lista completa de reservas
   * TODO: reemplazar por fetch('https://api.elpotrero.com/api/reservas')
   */
  getReservas() {
    inicializarDatosAdmin();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVAS)) || [];
    } catch (e) {
      console.error('Error al leer reservas de localStorage:', e);
      return [];
    }
  },

  /**
   * Obtiene una reserva por su ID
   */
  getReservaById(id) {
    return this.getReservas().find(r => r.id === id) || null;
  },

  /**
   * Actualiza el estado de una reserva (confirmada / pendiente / cancelada)
   * TODO: reemplazar por fetch(`https://api.elpotrero.com/api/reservas/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) })
   */
  actualizarEstadoReserva(id, nuevoEstado) {
    const reservas = this.getReservas();
    const reserva = reservas.find(r => r.id === id);
    if (!reserva) return { ok: false, error: 'Reserva no encontrada' };

    reserva.estado = nuevoEstado;
    localStorage.setItem(STORAGE_KEYS.RESERVAS, JSON.stringify(reservas));
    return { ok: true, reserva };
  },

  /**
   * Agrega una nueva reserva mock
   * TODO: reemplazar por fetch('https://api.elpotrero.com/api/reservas', { method: 'POST', body: JSON.stringify(...) })
   */
  crearReserva(reservaData) {
    const reservas = this.getReservas();
    const nuevoCodigo = `POTRERO-${Math.floor(1000 + Math.random() * 9000)}`;
    const nuevaReserva = {
      id: nuevoCodigo,
      ...reservaData,
      creadoEn: new Date().toISOString()
    };
    reservas.unshift(nuevaReserva);
    localStorage.setItem(STORAGE_KEYS.RESERVAS, JSON.stringify(reservas));
    return { ok: true, reserva: nuevaReserva };
  },

  /**
   * Combina reservas y bloqueos para una cancha y fecha específica,
   * garantizando que los bloqueos se reflejen como no disponibles.
   * Extiende el criterio de obtenerHorariosDisponibles de canchas.js
   * 
   * TODO: reemplazar por fetch(`https://api.elpotrero.com/api/disponibilidad?cancha=${canchaId}&fecha=${fechaStr}`)
   */
  obtenerDisponibilidadCompleta(canchaId, fechaStr) {
    const horarios = (typeof window.HORARIOS_OPERATIVOS !== 'undefined')
      ? window.HORARIOS_OPERATIVOS
      : ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

    const bloqueos = this.getBloqueos().filter(b => b.canchaId === canchaId && b.fecha === fechaStr);
    const reservas = this.getReservas().filter(r => r.canchaId === canchaId && r.fecha === fechaStr && r.estado !== 'cancelada');

    return horarios.map(hora => {
      // 1. Verificar si está bloqueado administrativamente
      const bloqueo = bloqueos.find(b => b.horarios.includes(hora));
      if (bloqueo) {
        return {
          hora,
          disponible: false,
          estado: 'BLOQUEADO',
          motivo: bloqueo.motivo,
          detalle: bloqueo.nota || bloqueo.motivo,
          bloqueoId: bloqueo.id
        };
      }

      // 2. Verificar si está reservado
      const reserva = reservas.find(r => r.hora === hora);
      if (reserva) {
        return {
          hora,
          disponible: false,
          estado: 'RESERVADO',
          reservaId: reserva.id,
          cliente: reserva.clienteNombre,
          reservaEstado: reserva.estado,
          monto: reserva.monto
        };
      }

      // 3. Horario libre
      return {
        hora,
        disponible: true,
        estado: 'LIBRE'
      };
    });
  },

  /**
   * Calcula estadísticas para el módulo de Reportes según rango de fechas
   * Rango: 'semana' | 'mes' | { desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD' }
   * 
   * TODO: reemplazar por fetch(`https://api.elpotrero.com/api/reportes?rango=${rango}`)
   */
  calcularEstadisticas(rango) {
    const reservas = this.getReservas().filter(r => r.estado !== 'cancelada');
    const bloqueos = this.getBloqueos();
    const canchas = this.getCanchas();
    const horariosCount = 10; // 14:00 a 23:00 = 10 slots por día

    const hoy = new Date();
    let fechaInicio, fechaFin, totalDias = 7;

    if (rango === 'semana') {
      // Lunes a Domingo de la semana actual
      const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay(); // 1 = lunes, 7 = domingo
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - (diaSemana - 1));
      fechaInicio.setHours(0, 0, 0, 0);

      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + 6);
      fechaFin.setHours(23, 59, 59, 999);
      totalDias = 7;
    } else if (rango === 'mes') {
      // Mes calendario actual (1 al último día)
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
      totalDias = fechaFin.getDate();
    } else if (typeof rango === 'object' && rango.desde && rango.hasta) {
      fechaInicio = new Date(rango.desde + 'T00:00:00');
      fechaFin = new Date(rango.hasta + 'T23:59:59');
      const diffTime = Math.abs(fechaFin - fechaInicio);
      totalDias = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else {
      // Default semana
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - 6);
      fechaFin = new Date(hoy);
      totalDias = 7;
    }

    const isoInicio = fechaInicio.toISOString().split('T')[0];
    const isoFin = fechaFin.toISOString().split('T')[0];

    // Filtrar reservas dentro del período
    const reservasEnPeriodo = reservas.filter(r => r.fecha >= isoInicio && r.fecha <= isoFin);

    // Filtrar bloqueos en el período
    const bloqueosEnPeriodo = bloqueos.filter(b => b.fecha >= isoInicio && b.fecha <= isoFin);
    let totalTurnosBloqueados = 0;
    bloqueosEnPeriodo.forEach(b => {
      totalTurnosBloqueados += (b.horarios ? b.horarios.length : 1);
    });

    // Calcular por cancha
    const slotsTotalesPorCancha = totalDias * horariosCount;
    let totalIngresosPredio = 0;
    let totalReservasPredio = reservasEnPeriodo.length;

    const reportePorCancha = canchas.map(cancha => {
      const reservasCancha = reservasEnPeriodo.filter(r => r.canchaId === cancha.id);
      const ingresosCancha = reservasCancha.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
      const turnosReservados = reservasCancha.length;
      const porcentajeOcupacion = slotsTotalesPorCancha > 0
        ? Math.min(100, Math.round((turnosReservados / slotsTotalesPorCancha) * 100))
        : 0;

      totalIngresosPredio += ingresosCancha;

      return {
        canchaId: cancha.id,
        canchaNombre: cancha.nombre,
        canchaTipo: cancha.tipo,
        canchaActiva: cancha.activa,
        turnosReservados,
        slotsTotales: slotsTotalesPorCancha,
        ingresos: ingresosCancha,
        porcentajeOcupacion
      };
    });

    // Slots totales del predio (6 canchas)
    const slotsTotalesPredio = slotsTotalesPorCancha * canchas.length;
    const porcentajeOcupacionPredio = slotsTotalesPredio > 0
      ? Math.min(100, Math.round((totalReservasPredio / slotsTotalesPredio) * 100))
      : 0;

    return {
      rangoLabel: (rango === 'semana') ? 'Esta Semana' : (rango === 'mes') ? 'Este Mes' : `${isoInicio} al ${isoFin}`,
      isoInicio,
      isoFin,
      totalDias,
      totalIngresos: totalIngresosPredio,
      porcentajeOcupacion: porcentajeOcupacionPredio,
      totalReservas: totalReservasPredio,
      totalBloqueos: totalTurnosBloqueados,
      porCancha: reportePorCancha
    };
  },

  // Helper de paleta
  getPaletaCancha(canchaId) {
    return CANCHAS_PALETA[canchaId] || { bg: '#1E5333', border: '#F2B705', text: '#F1F3EA', badge: '#F2B705', badgeText: '#3D2E00' };
  }
};

// Exportación global para scripts
if (typeof window !== 'undefined') {
  window.adminDatos = adminDatos;
  window.CANCHAS_PALETA = CANCHAS_PALETA;
}
