/**
 * EL POTRERO - Lógica del Flujo de Reserva
 * 
 * Flujo de 4 pasos:
 * 1. Selección de cancha (6 opciones con detalles y precio)
 * 2. Selección de día y horario (Tablero marcador de estadio 14:00 a 23:00)
 * 3. Resumen en boleto/ticket + datos del capitán + método de pago simulado
 * 4. Confirmación con código de reserva oficial y acciones
 * 
 * Todo el estado vive en memoria sin dependencias de servidor.
 */

// Estado global de la sesión de reserva
const reservaState = {
  pasoActual: 1,
  canchaId: null,
  canchaObj: null,
  diaIndice: 0, // 0 = Hoy, 1 = Mañana, 2 = Pasado
  fechaObj: null,
  horaSeleccionada: null,
  datosCliente: {
    nombre: '',
    telefono: ''
  },
  metodoPago: 'mercadopago', // mercadopago | tarjeta | efectivo
  codigoReserva: null
};

/**
 * Fechas relativas disponibles (Hoy, Mañana, Pasado Mañana)
 */
function obtenerDiasDisponibles() {
  const hoy = new Date();
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const dias = [];
  for (let i = 0; i < 3; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);

    let etiquetaRel = 'Hoy';
    if (i === 1) etiquetaRel = 'Mañana';
    if (i === 2) etiquetaRel = 'Pasado';

    const nombreDia = diasSemana[fecha.getDay()];
    const numDia = fecha.getDate();
    const nombreMes = meses[fecha.getMonth()];
    const isoFecha = fecha.toISOString().split('T')[0];

    dias.push({
      indice: i,
      etiquetaRel,
      textoCorto: `${nombreDia} ${numDia} ${nombreMes}`,
      textoCompleto: `${nombreDia} ${numDia} de ${nombreMes}`,
      isoFecha,
      fecha
    });
  }

  return dias;
}

/**
 * Inicialización principal de la página de reservas
 */
document.addEventListener('DOMContentLoaded', () => {
  inicializarFlujoReserva();
});

function inicializarFlujoReserva() {
  const dias = obtenerDiasDisponibles();
  reservaState.fechaObj = dias[0];

  // Render inicial de canchas en Paso 1
  renderizarCanchasGrid();

  // Escuchar parámetros de URL (ej: reservar.html?cancha=cancha-2)
  const urlParams = new URLSearchParams(window.location.search);
  const paramCancha = urlParams.get('cancha');
  if (paramCancha) {
    seleccionarCancha(paramCancha, false);
  }

  // Vincular eventos de botones de navegación
  vincularEventosNavegacion();

  // Vincular eventos de formulario de pago
  vincularEventosFormulario();
}

/**
 * Cambia el paso activo del asistente
 * @param {number} nuevoPaso (1 al 4)
 */
function cambiarPaso(nuevoPaso) {
  if (nuevoPaso < 1 || nuevoPaso > 4) return;

  // Validación antes de avanzar
  if (nuevoPaso === 2 && !reservaState.canchaId) {
    mostrarAlertaPaso('Por favor, elegí una cancha antes de continuar.');
    return;
  }
  if (nuevoPaso === 3 && !reservaState.horaSeleccionada) {
    mostrarAlertaPaso('Por favor, elegí un horario disponible en el marcador.');
    return;
  }

  reservaState.pasoActual = nuevoPaso;

  // Actualizar visibilidad de paneles
  for (let i = 1; i <= 4; i++) {
    const pasoPanel = document.getElementById(`panel-paso-${i}`);
    const pasoTab = document.getElementById(`step-tab-${i}`);

    if (pasoPanel) {
      if (i === nuevoPaso) {
        pasoPanel.style.display = 'block';
        pasoPanel.removeAttribute('hidden');
      } else {
        pasoPanel.style.display = 'none';
        pasoPanel.setAttribute('hidden', 'true');
      }
    }

    if (pasoTab) {
      pasoTab.classList.remove('active', 'completed');
      if (i === nuevoPaso) {
        pasoTab.classList.add('active');
        pasoTab.setAttribute('aria-current', 'step');
      } else if (i < nuevoPaso) {
        pasoTab.classList.add('completed');
        pasoTab.removeAttribute('aria-current');
      } else {
        pasoTab.removeAttribute('aria-current');
      }
    }
  }

  // Desplazamiento suave a la parte superior del flujo
  const stepper = document.getElementById('stepper-container');
  if (stepper) {
    stepper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Acciones específicas de render según el paso
  if (nuevoPaso === 2) {
    renderizarSelectorDias();
    renderizarTableroHorarios();
  } else if (nuevoPaso === 3) {
    renderizarTicketResumen();
  }
}

/**
 * Renderiza la grilla de 6 canchas para el Paso 1
 */
function renderizarCanchasGrid() {
  const container = document.getElementById('canchas-selector-grid');
  if (!container) return;

  // TODO: reemplazar por fetch a /api/canchas
  const canchas = window.CANCHAS || [];

  container.innerHTML = canchas.map(cancha => {
    const esSeleccionada = reservaState.canchaId === cancha.id;
    const badgeTechada = cancha.techada
      ? `<span class="badge-tag techada">🌧️ Techada</span>`
      : `<span class="badge-tag">☀️ Aire Libre</span>`;

    const tagCategoria = cancha.categoria.toLowerCase();

    return `
      <article 
        class="cancha-card ${esSeleccionada ? 'selected' : ''}" 
        id="card-${cancha.id}"
        tabindex="0"
        role="button"
        aria-pressed="${esSeleccionada ? 'true' : 'false'}"
        onclick="seleccionarCancha('${cancha.id}')"
        onkeydown="if(event.key==='Enter'||event.key===' ') { event.preventDefault(); seleccionarCancha('${cancha.id}'); }"
      >
        <div>
          <div class="cancha-header">
            <span class="cancha-num-tag">CANCHA #${cancha.numero}</span>
            <div class="cancha-tags">
              <span class="badge-tag ${tagCategoria}">${cancha.tipo}</span>
              ${badgeTechada}
            </div>
          </div>
          <h3 class="cancha-nombre">${cancha.nombre}</h3>
          <p style="font-size: 0.85rem; margin-top: 0.5rem; margin-bottom: 1rem;">${cancha.descripcion}</p>
          
          <div class="cancha-specs">
            <div class="spec-item">
              <span class="spec-lbl">Superficie</span>
              <span class="spec-val">${cancha.superficie}</span>
            </div>
            <div class="spec-item">
              <span class="spec-lbl">Capacidad</span>
              <span class="spec-val">${cancha.capacidad}</span>
            </div>
            <div class="spec-item">
              <span class="spec-lbl">Dimensiones</span>
              <span class="spec-val">${cancha.medidas}</span>
            </div>
            <div class="spec-item">
              <span class="spec-lbl">Iluminación</span>
              <span class="spec-val">${cancha.iluminacion}</span>
            </div>
          </div>
        </div>

        <div class="cancha-footer">
          <div class="cancha-precio-box">
            <span class="precio-lbl">Precio por hora</span>
            <span class="precio-monto">${formatearPrecio(cancha.precioHora)}</span>
          </div>
          <button 
            type="button" 
            class="btn ${esSeleccionada ? 'btn-primary' : 'btn-pitch'}" 
            tabindex="-1"
            aria-hidden="true"
          >
            ${esSeleccionada ? 'SELECCIONADA' : 'ELEGIR'}
          </button>
        </div>
      </article>
    `;
  }).join('');

  actualizarBotonPaso1();
}

/**
 * Selecciona una cancha por su ID
 * @param {string} id 
 * @param {boolean} [avanzar=false] - si debe pasar automáticamente a paso 2
 */
function seleccionarCancha(id, avanzar = false) {
  reservaState.canchaId = id;
  reservaState.canchaObj = obtenerCanchaPorId(id);

  // Reiniciar hora seleccionada al cambiar de cancha
  reservaState.horaSeleccionada = null;

  renderizarCanchasGrid();
  actualizarBotonPaso1();

  if (avanzar) {
    cambiarPaso(2);
  }
}

function actualizarBotonPaso1() {
  const btnContinuar = document.getElementById('btn-continuar-paso-1');
  const txtSeleccion = document.getElementById('txt-cancha-seleccionada-info');

  if (btnContinuar) {
    if (reservaState.canchaObj) {
      btnContinuar.disabled = false;
      btnContinuar.classList.remove('btn-secondary');
      btnContinuar.classList.add('btn-primary');
      if (txtSeleccion) {
        txtSeleccion.textContent = `Cancha elegida: ${reservaState.canchaObj.nombre} (${reservaState.canchaObj.tipo}) - ${formatearPrecio(reservaState.canchaObj.precioHora)}`;
      }
    } else {
      btnContinuar.disabled = true;
      btnContinuar.classList.remove('btn-primary');
      btnContinuar.classList.add('btn-secondary');
      if (txtSeleccion) {
        txtSeleccion.textContent = 'Seleccioná una de las 6 canchas para continuar.';
      }
    }
  }
}

/**
 * Renderiza el selector de días (Hoy, Mañana, Pasado)
 */
function renderizarSelectorDias() {
  const container = document.getElementById('dias-selector-box');
  if (!container) return;

  const dias = obtenerDiasDisponibles();

  container.innerHTML = dias.map(dia => {
    const esActivo = reservaState.diaIndice === dia.indice;
    return `
      <button 
        type="button" 
        class="dia-btn ${esActivo ? 'active' : ''}"
        onclick="seleccionarDia(${dia.indice})"
        aria-pressed="${esActivo ? 'true' : 'false'}"
      >
        <span class="dia-rel">${dia.etiquetaRel}</span>
        <span class="dia-fecha">${dia.textoCorto}</span>
      </button>
    `;
  }).join('');
}

/**
 * Selecciona el día de reserva
 * @param {number} indice 
 */
function seleccionarDia(indice) {
  const dias = obtenerDiasDisponibles();
  reservaState.diaIndice = indice;
  reservaState.fechaObj = dias[indice];
  reservaState.horaSeleccionada = null; // Reiniciar slot seleccionado

  renderizarSelectorDias();
  renderizarTableroHorarios();
  actualizarBotonPaso2();
}

/**
 * Renderiza la grilla de horarios estilo marcador de estadio (14:00 a 23:00)
 */
function renderizarTableroHorarios() {
  const container = document.getElementById('horarios-grid-box');
  const infoCanchaHeader = document.getElementById('tablero-cancha-nombre');
  if (!container) return;

  if (infoCanchaHeader && reservaState.canchaObj) {
    infoCanchaHeader.textContent = `${reservaState.canchaObj.nombre} • ${reservaState.fechaObj.textoCompleto}`;
  }

  // TODO: reemplazar por fetch a /api/horarios-disponibles?cancha=${canchaId}&fecha=${fechaISO}
  const slots = obtenerHorariosDisponibles(reservaState.canchaId, reservaState.fechaObj.isoFecha);

  container.innerHTML = slots.map(slot => {
    const esSeleccionado = reservaState.horaSeleccionada === slot.hora;
    const ocupadoClass = slot.disponible ? '' : 'ocupado';
    const selectedClass = esSeleccionado ? 'selected' : '';

    return `
      <button 
        type="button" 
        class="hora-slot ${ocupadoClass} ${selectedClass}"
        ${slot.disponible ? '' : 'disabled aria-disabled="true"'}
        onclick="${slot.disponible ? `seleccionarHora('${slot.hora}')` : ''}"
        aria-label="Horario ${slot.hora}, ${slot.etiqueta}"
      >
        <span class="slot-hora">${slot.hora}</span>
        <span class="slot-estado">${slot.etiqueta}</span>
      </button>
    `;
  }).join('');

  actualizarBotonPaso2();
}

/**
 * Selecciona una hora en el tablero
 * @param {string} hora 
 */
function seleccionarHora(hora) {
  reservaState.horaSeleccionada = hora;
  renderizarTableroHorarios();
  actualizarBotonPaso2();
}

function actualizarBotonPaso2() {
  const btnContinuar = document.getElementById('btn-continuar-paso-2');
  const txtHoraInfo = document.getElementById('txt-horario-seleccionado-info');

  if (btnContinuar) {
    if (reservaState.horaSeleccionada) {
      btnContinuar.disabled = false;
      btnContinuar.classList.remove('btn-secondary');
      btnContinuar.classList.add('btn-primary');
      if (txtHoraInfo) {
        txtHoraInfo.textContent = `Turno elegido: ${reservaState.fechaObj.textoCompleto} a las ${reservaState.horaSeleccionada} hs.`;
      }
    } else {
      btnContinuar.disabled = true;
      btnContinuar.classList.remove('btn-primary');
      btnContinuar.classList.add('btn-secondary');
      if (txtHoraInfo) {
        txtHoraInfo.textContent = 'Elegí un horario en estado LIBRE para continuar.';
      }
    }
  }
}

/**
 * Renderiza el Ticket de partido y resumen para el Paso 3
 */
function renderizarTicketResumen() {
  const ticketContainer = document.getElementById('ticket-resumen-container');
  if (!ticketContainer || !reservaState.canchaObj) return;

  const c = reservaState.canchaObj;
  const fechaTexto = reservaState.fechaObj.textoCompleto;
  const horaTexto = `${reservaState.horaSeleccionada} a ${calcularHoraFin(reservaState.horaSeleccionada)} hs`;

  ticketContainer.innerHTML = `
    <div class="ticket-wrapper">
      <div class="ticket-header">
        <div class="ticket-club">EL POTRERO • CLUB DE FÚTBOL</div>
        <div class="ticket-stub-code">TURNO OFICIAL</div>
      </div>

      <div class="ticket-body">
        <div class="ticket-details-grid">
          <div class="ticket-field">
            <span class="ticket-lbl">Cancha</span>
            <span class="ticket-val cancha-destacada">${c.nombre} (#${c.numero})</span>
            <span style="font-size: 0.8rem; color: var(--ink-soft);">${c.tipo} • ${c.superficie}</span>
          </div>

          <div class="ticket-field">
            <span class="ticket-lbl">Condición</span>
            <span class="ticket-val">${c.techada ? '🌧️ Techada' : '☀️ Al aire libre'}</span>
            <span style="font-size: 0.8rem; color: var(--ink-soft);">${c.iluminacion}</span>
          </div>

          <div class="ticket-field">
            <span class="ticket-lbl">Fecha del Partido</span>
            <span class="ticket-val">${fechaTexto}</span>
          </div>

          <div class="ticket-field">
            <span class="ticket-lbl">Horario</span>
            <span class="ticket-val">${horaTexto}</span>
          </div>

          <div class="ticket-field">
            <span class="ticket-lbl">Duración</span>
            <span class="ticket-val">60 Minutos</span>
          </div>

          <div class="ticket-field">
            <span class="ticket-lbl">Total a Abonar</span>
            <span class="ticket-val precio-destacado">${formatearPrecio(c.precioHora)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Calcula la hora de finalización (1 hora de duración)
 * @param {string} horaInicio 
 * @returns {string} Ejemplo: '15:00' si inicio es '14:00'
 */
function calcularHoraFin(horaInicio) {
  if (!horaInicio) return '';
  const [h, m] = horaInicio.split(':').map(Number);
  const finH = (h + 1).toString().padStart(2, '0');
  return `${finH}:${m.toString().padStart(2, '0')}`;
}

/**
 * Vincula los métodos de navegación hacia adelante y atrás
 */
function vincularEventosNavegacion() {
  // Paso 1
  const btnPaso1 = document.getElementById('btn-continuar-paso-1');
  if (btnPaso1) {
    btnPaso1.addEventListener('click', () => cambiarPaso(2));
  }

  // Paso 2
  const btnAtrasPaso2 = document.getElementById('btn-volver-paso-1');
  if (btnAtrasPaso2) {
    btnAtrasPaso2.addEventListener('click', () => cambiarPaso(1));
  }

  const btnPaso2 = document.getElementById('btn-continuar-paso-2');
  if (btnPaso2) {
    btnPaso2.addEventListener('click', () => cambiarPaso(3));
  }

  // Paso 3
  const btnAtrasPaso3 = document.getElementById('btn-volver-paso-2');
  if (btnAtrasPaso3) {
    btnAtrasPaso3.addEventListener('click', () => cambiarPaso(2));
  }
}

/**
 * Vincula el formulario de contacto y métodos de pago
 */
function vincularEventosFormulario() {
  // Selección de medios de pago
  const metodos = document.querySelectorAll('.metodo-card');
  metodos.forEach(card => {
    card.addEventListener('click', () => {
      metodos.forEach(m => {
        m.classList.remove('selected');
        const radio = m.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
      });

      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        reservaState.metodoPago = radio.value;
      }
    });
  });

  // Envío del formulario final de reserva
  const form = document.getElementById('form-reserva-final');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      procesarConfirmacionReserva();
    });
  }
}

/**
 * Procesa la confirmación de la reserva y genera código oficial
 */
function procesarConfirmacionReserva() {
  const inputNombre = document.getElementById('cliente-nombre');
  const inputTelefono = document.getElementById('cliente-telefono');

  if (!inputNombre || !inputTelefono) return;

  const nombre = inputNombre.value.trim();
  const telefono = inputTelefono.value.trim();

  if (!nombre || !telefono) {
    mostrarAlertaPaso('Por favor, completá todos tus datos de contacto para emitir el comprobante.');
    return;
  }

  reservaState.datosCliente = { nombre, telefono };

  // Generar código de reserva único de estadio (ej: POTRERO-8371)
  const numRandom = Math.floor(1000 + Math.random() * 9000);
  reservaState.codigoReserva = `POTRERO-${numRandom}`;

  // TODO: reemplazar por POST a /api/reservas
  /*
  fetch('/api/reservas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservaState)
  });
  */

  // Renderizar la pantalla de confirmación
  renderizarPantallaConfirmacion();

  // Avanzar al Paso 4
  cambiarPaso(4);
}

/**
 * Renderiza los detalles en la pantalla de confirmación del Paso 4
 */
function renderizarPantallaConfirmacion() {
  const elCodigo = document.getElementById('confirmacion-codigo-texto');
  const elDetalle = document.getElementById('confirmacion-resumen-ticket');

  if (elCodigo) {
    elCodigo.textContent = reservaState.codigoReserva;
  }

  if (elDetalle && reservaState.canchaObj) {
    const c = reservaState.canchaObj;
    const metodoNombres = {
      mercadopago: 'Mercado Pago (simulado)'
    };

    elDetalle.innerHTML = `
      <div class="ticket-wrapper" style="margin-top: 1.5rem;">
        <div class="ticket-header">
          <div class="ticket-club">EL POTRERO • COMPROBANTE OFICIAL</div>
          <div class="ticket-stub-code">${reservaState.codigoReserva}</div>
        </div>
        <div class="ticket-body">
          <div class="ticket-details-grid">
            <div class="ticket-field">
              <span class="ticket-lbl">Titular de la Reserva</span>
              <span class="ticket-val">${reservaState.datosCliente.nombre}</span>
              <span style="font-size: 0.8rem; color: var(--ink-soft);">${reservaState.datosCliente.telefono}</span>
            </div>

            <div class="ticket-field">
              <span class="ticket-lbl">Cancha Reservada</span>
              <span class="ticket-val cancha-destacada">${c.nombre} (${c.tipo})</span>
              <span style="font-size: 0.8rem; color: var(--ink-soft);">${c.superficie}</span>
            </div>

            <div class="ticket-field">
              <span class="ticket-lbl">Día y Horario</span>
              <span class="ticket-val">${reservaState.fechaObj.textoCompleto}</span>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--pitch-dark);">${reservaState.horaSeleccionada} a ${calcularHoraFin(reservaState.horaSeleccionada)} hs</span>
            </div>

            <div class="ticket-field">
              <span class="ticket-lbl">Medio de Pago</span>
              <span class="ticket-val">${metodoNombres[reservaState.metodoPago] || reservaState.metodoPago}</span>
            </div>

            <div class="ticket-field">
              <span class="ticket-lbl">Monto Total</span>
              <span class="ticket-val precio-destacado">${formatearPrecio(c.precioHora)}</span>
            </div>

            <div class="ticket-field">
              <span class="ticket-lbl">Estado</span>
              <span class="ticket-val" style="color: var(--pitch-mid);">✓ CONFIRMADA</span>
              <span style="font-size: 0.75rem; color: var(--ink-soft);">Presentar este código al llegar</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Configurar botón de compartir en WhatsApp
  const btnWhatsApp = document.getElementById('btn-whatsapp-reserva');
  if (btnWhatsApp && reservaState.canchaObj) {
    const c = reservaState.canchaObj;
    const msg = encodeURIComponent(
      `¡Hola! Tengo mi reserva confirmada en El Potrero:\n` +
      `⚽ Cancha: ${c.nombre} (${c.tipo})\n` +
      `📅 Fecha: ${reservaState.fechaObj.textoCompleto}\n` +
      `⏰ Horario: ${reservaState.horaSeleccionada} hs\n` +
      `🎟️ Código: ${reservaState.codigoReserva}\n` +
      `👤 Titular: ${reservaState.datosCliente.nombre}`
    );
    btnWhatsApp.href = `https://wa.me/?text=${msg}`;
    btnWhatsApp.target = '_blank';
    btnWhatsApp.rel = 'noopener noreferrer';
  }
}

/**
 * Reinicia todo el flujo para realizar una nueva reserva
 */
function reiniciarReserva() {
  reservaState.pasoActual = 1;
  reservaState.canchaId = null;
  reservaState.canchaObj = null;
  reservaState.diaIndice = 0;
  reservaState.horaSeleccionada = null;
  reservaState.codigoReserva = null;

  const form = document.getElementById('form-reserva-final');
  if (form) form.reset();

  const dias = obtenerDiasDisponibles();
  reservaState.fechaObj = dias[0];

  renderizarCanchasGrid();
  cambiarPaso(1);
}

/**
 * Muestra alerta visual accesible sin interrumpir con alert() intrusivo
 * @param {string} mensaje 
 */
function mostrarAlertaPaso(mensaje) {
  let alertBox = document.getElementById('alerta-flujo-reserva');
  if (!alertBox) {
    alertBox = document.createElement('div');
    alertBox.id = 'alerta-flujo-reserva';
    alertBox.setAttribute('role', 'alert');
    alertBox.style.cssText = `
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      background-color: var(--accent);
      color: var(--accent-ink);
      padding: 1rem 1.5rem;
      font-weight: 700;
      border: 2px solid var(--ink);
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 99999;
      max-width: 90vw;
      letter-spacing: 0.02em;
    `;
    document.body.appendChild(alertBox);
  }

  alertBox.textContent = `⚠️ ${mensaje}`;
  alertBox.style.display = 'block';

  clearTimeout(window._alertaTimer);
  window._alertaTimer = setTimeout(() => {
    alertBox.style.display = 'none';
  }, 4000);
}

// Exportar para uso global
window.cambiarPaso = cambiarPaso;
window.seleccionarCancha = seleccionarCancha;
window.seleccionarDia = seleccionarDia;
window.seleccionarHora = seleccionarHora;
window.reiniciarReserva = reiniciarReserva;
