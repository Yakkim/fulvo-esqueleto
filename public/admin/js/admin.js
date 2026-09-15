/**
 * EL POTRERO - Panel de Administración: Lógica Modular
 * 
 * Controla:
 * 1. Autenticación placeholder (admin / potrero2026)
 * 2. Navegación por pestañas (estilo tablero de estadio)
 * 3. Módulo 1: Calendario (Día / Semana / Mes + Detalle de reserva)
 * 4. Módulo 2: Canchas (Alta, edición, toggle activa/inactiva, tabla responsiva)
 * 5. Módulo 3: Bloqueos de horarios (Formulario interactivo y listado)
 * 6. Módulo 4: Reportes (KPIs de estadio, barras en CSS puro y detalle)
 */

// Estado global de la vista de administración
const adminState = {
  tabActiva: 'calendario',
  calModo: 'dia', // 'dia' | 'semana' | 'mes'
  calFecha: new Date(),
  calFiltroCancha: 'todas',
  bloqueoHorariosSeleccionados: new Set(),
  reporteRango: 'semana',
  reporteDesde: null,
  reporteHasta: null
};

document.addEventListener('DOMContentLoaded', () => {
  inicializarAutenticacion();
  inicializarNavegacionTabs();
  inicializarModuloCalendario();
  inicializarModuloCanchas();
  inicializarModuloBloqueos();
  inicializarModuloReportes();
  inicializarModales();

  // Escuchar hash de URL para navegación directa (ej: #canchas)
  const hash = window.location.hash.replace('#', '');
  if (['calendario', 'canchas', 'bloqueos', 'reportes'].includes(hash)) {
    activarTab(hash, false);
  }
});

// ============================================================================
// 1. AUTENTICACIÓN PLACEHOLDER
// // TODO: reemplazar por autenticación real contra el backend antes de producción
// ============================================================================

function inicializarAutenticacion() {
  const overlay = document.getElementById('login-overlay');
  const form = document.getElementById('form-login');
  const errorBox = document.getElementById('login-error');
  const btnLogout = document.getElementById('btn-logout');

  // Verificar sesión persistida
  // TODO: reemplazar por verificación de cookie de sesión o JWT en Cloudflare Workers
  const estaAutenticado = localStorage.getItem('elpotrero_admin_auth') === 'true';

  if (!estaAutenticado) {
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const usuario = document.getElementById('login-usuario').value.trim();
    const password = document.getElementById('login-password').value.trim();

    // Validación contra valor fijo de prueba
    // TODO: reemplazar por fetch('https://api.elpotrero.com/api/auth/login', { method: 'POST', body: ... })
    if (usuario === 'admin' && password === 'potrero2026') {
      localStorage.setItem('elpotrero_admin_auth', 'true');
      overlay.style.display = 'none';
      errorBox.style.display = 'none';
      form.reset();
      mostrarToast('⚽ ¡Bienvenido al Panel de Administración de El Potrero!');
    } else {
      errorBox.textContent = 'Usuario o contraseña incorrectos. Verificá los datos e intentá nuevamente.';
      errorBox.style.display = 'block';
    }
  });

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      // TODO: reemplazar por fetch('https://api.elpotrero.com/api/auth/logout')
      localStorage.removeItem('elpotrero_admin_auth');
      overlay.style.display = 'flex';
      mostrarToast('Sesión cerrada correctamente.');
    });
  }
}

// ============================================================================
// 2. NAVEGACIÓN POR PESTAÑAS (TABLERO DE ESTADIO)
// ============================================================================

function inicializarNavegacionTabs() {
  const tabs = document.querySelectorAll('.admin-tab-btn');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const seccionId = tab.id.replace('tab-', '');
      activarTab(seccionId, true);
    });

    // Soporte de navegación por teclado accesible (Left / Right)
    tab.addEventListener('keydown', (e) => {
      const tabsArr = Array.from(tabs);
      const index = tabsArr.indexOf(tab);
      let nextTab = null;

      if (e.key === 'ArrowRight') {
        nextTab = tabsArr[(index + 1) % tabsArr.length];
      } else if (e.key === 'ArrowLeft') {
        nextTab = tabsArr[(index - 1 + tabsArr.length) % tabsArr.length];
      }

      if (nextTab) {
        nextTab.focus();
        nextTab.click();
      }
    });
  });
}

function activarTab(tabNombre, actualizarHash = true) {
  adminState.tabActiva = tabNombre;

  // Actualizar botones de pestaña
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    const esActivo = btn.id === `tab-${tabNombre}`;
    btn.classList.toggle('active', esActivo);
    btn.setAttribute('aria-selected', esActivo ? 'true' : 'false');
  });

  // Actualizar paneles
  document.querySelectorAll('.admin-panel-section').forEach(panel => {
    const esActivo = panel.id === `panel-${tabNombre}`;
    panel.classList.toggle('active', esActivo);
  });

  if (actualizarHash) {
    window.location.hash = tabNombre;
  }

  // Refrescar datos de la sección al cambiar
  if (tabNombre === 'calendario') renderizarCalendario();
  if (tabNombre === 'canchas') renderizarTablaCanchas();
  if (tabNombre === 'bloqueos') renderizarModuloBloqueos();
  if (tabNombre === 'reportes') renderizarModuloReportes();
}

// ============================================================================
// 3. MÓDULO 1: CALENDARIO
// ============================================================================

function inicializarModuloCalendario() {
  // Botones de modo de vista (Día / Semana / Mes)
  const viewBtns = document.querySelectorAll('.view-btn[data-view]');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      adminState.calModo = btn.dataset.view;
      renderizarCalendario();
    });
  });

  // Navegación de fecha
  const btnPrev = document.getElementById('btn-fecha-prev');
  const btnNext = document.getElementById('btn-fecha-next');
  const dateInput = document.getElementById('cal-fecha-input');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      modificarFechaCalendario(-1);
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      modificarFechaCalendario(1);
    });
  }

  if (dateInput) {
    dateInput.value = adminState.calFecha.toISOString().split('T')[0];
    dateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        adminState.calFecha = new Date(e.target.value + 'T12:00:00');
        renderizarCalendario();
      }
    });
  }

  // Filtro por cancha
  const selectCancha = document.getElementById('cal-filtro-cancha');
  if (selectCancha) {
    selectCancha.addEventListener('change', (e) => {
      adminState.calFiltroCancha = e.target.value;
      renderizarCalendario();
    });
  }

  renderizarCalendario();
}

function modificarFechaCalendario(delta) {
  const f = new Date(adminState.calFecha);
  if (adminState.calModo === 'dia') {
    f.setDate(f.getDate() + delta);
  } else if (adminState.calModo === 'semana') {
    f.setDate(f.getDate() + (delta * 7));
  } else if (adminState.calModo === 'mes') {
    f.setMonth(f.getMonth() + delta);
  }
  adminState.calFecha = f;

  const dateInput = document.getElementById('cal-fecha-input');
  if (dateInput) dateInput.value = f.toISOString().split('T')[0];

  renderizarCalendario();
}

function renderizarCalendario() {
  const contenedor = document.getElementById('cal-contenedor-vista');
  const txtFecha = document.getElementById('cal-fecha-texto');
  if (!contenedor) return;

  const f = adminState.calFecha;
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Actualizar etiqueta de fecha
  if (txtFecha) {
    if (adminState.calModo === 'dia') {
      const hoyIso = new Date().toISOString().split('T')[0];
      const calIso = f.toISOString().split('T')[0];
      const esHoy = (hoyIso === calIso);
      txtFecha.textContent = esHoy ? 'Hoy' : `${diasSemana[f.getDay()]} ${f.getDate()} ${meses[f.getMonth()]}`;
    } else if (adminState.calModo === 'semana') {
      const diaSem = f.getDay() === 0 ? 7 : f.getDay();
      const lunes = new Date(f);
      lunes.setDate(f.getDate() - (diaSem - 1));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      txtFecha.textContent = `${lunes.getDate()} ${meses[lunes.getMonth()]} - ${domingo.getDate()} ${meses[domingo.getMonth()]}`;
    } else if (adminState.calModo === 'mes') {
      const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      txtFecha.textContent = `${nombresMeses[f.getMonth()]} ${f.getFullYear()}`;
    }
  }

  if (adminState.calModo === 'dia') {
    renderizarCalendarioDia(contenedor);
  } else if (adminState.calModo === 'semana') {
    renderizarCalendarioSemana(contenedor);
  } else if (adminState.calModo === 'mes') {
    renderizarCalendarioMes(contenedor);
  }
}

/**
 * Vista Día: Grilla de horas (14:00 a 23:00) en vertical x Canchas en horizontal
 */
function renderizarCalendarioDia(contenedor) {
  let canchas = adminDatos.getCanchas();
  if (adminState.calFiltroCancha !== 'todas') {
    canchas = canchas.filter(c => c.id === adminState.calFiltroCancha);
  }

  const horarios = (typeof window.HORARIOS_OPERATIVOS !== 'undefined')
    ? window.HORARIOS_OPERATIVOS
    : ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

  const fechaStr = adminState.calFecha.toISOString().split('T')[0];

  let html = `
    <div class="cal-day-container">
      <div class="cal-day-matrix" style="grid-template-columns: 85px repeat(${canchas.length}, minmax(180px, 1fr));">
        <div class="cal-matrix-header time-col-header">HORA</div>
  `;

  canchas.forEach(c => {
    const paleta = adminDatos.getPaletaCancha(c.id);
    html += `
      <div class="cal-matrix-header" style="border-top: 4px solid ${paleta.border};">
        <div>${c.nombre}</div>
        <div style="font-size: 0.75rem; color: var(--accent); font-family: var(--font-body); font-weight: normal;">
          ${c.tipo} ${c.techada ? '• Techada' : ''}
        </div>
      </div>
    `;
  });

  // Filas por cada horario
  horarios.forEach(hora => {
    html += `<div class="cal-hour-cell">${hora}</div>`;

    canchas.forEach(cancha => {
      const disp = adminDatos.obtenerDisponibilidadCompleta(cancha.id, fechaStr);
      const slot = disp.find(s => s.hora === hora);
      const paleta = adminDatos.getPaletaCancha(cancha.id);

      if (slot && slot.estado === 'RESERVADO') {
        const res = adminDatos.getReservaById(slot.reservaId);
        const estadoClass = `status-${slot.reservaEstado || 'confirmada'}`;
        const montoFmt = (typeof window.formatearPrecio === 'function') ? window.formatearPrecio(slot.monto) : `$ ${slot.monto}`;

        html += `
          <div class="cal-slot-cell" style="background-color: ${paleta.bg}; border-color: ${paleta.border};">
            <div class="reserva-badge-card" style="border-left-color: ${paleta.border};"
                 onclick="abrirModalDetalleReserva('${slot.reservaId}')"
                 role="button" tabindex="0" aria-label="Reserva ${slot.reservaId}">
              <div class="reserva-badge-top">
                <span class="reserva-badge-id">${slot.reservaId}</span>
                <span class="reserva-badge-status ${estadoClass}">${slot.reservaEstado}</span>
              </div>
              <div class="reserva-badge-client">${slot.cliente}</div>
              <div class="reserva-badge-bottom">
                <span>${cancha.nombre.split(' ')[0]}</span>
                <strong style="color: var(--accent);">${montoFmt}</strong>
              </div>
            </div>
          </div>
        `;
      } else if (slot && slot.estado === 'BLOQUEADO') {
        html += `
          <div class="cal-slot-cell" style="background-color: rgba(230, 57, 70, 0.15); border-color: var(--danger);">
            <div class="bloqueo-slot-card">
              <span class="bloqueo-slot-tag">🔒 BLOQUEADO</span>
              <span class="bloqueo-slot-motivo">${slot.motivo}</span>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="cal-slot-cell slot-empty">
            <span>LIBRE</span>
          </div>
        `;
      }
    });
  });

  html += `
      </div>
    </div>
  `;

  contenedor.innerHTML = html;
}

/**
 * Vista Semana: 7 columnas con las reservas de cada día
 */
function renderizarCalendarioSemana(contenedor) {
  const f = adminState.calFecha;
  const diaSem = f.getDay() === 0 ? 7 : f.getDay();
  const lunes = new Date(f);
  lunes.setDate(f.getDate() - (diaSem - 1));

  const diasSemanaNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const reservas = adminDatos.getReservas().filter(r => r.estado !== 'cancelada');
  const bloqueos = adminDatos.getBloqueos();

  let html = `<div class="cal-week-grid">`;

  for (let i = 0; i < 7; i++) {
    const diaFecha = new Date(lunes);
    diaFecha.setDate(lunes.getDate() + i);
    const isoDia = diaFecha.toISOString().split('T')[0];
    const esHoy = (new Date().toISOString().split('T')[0] === isoDia);

    let reservasDia = reservas.filter(r => r.fecha === isoDia);
    let bloqueosDia = bloqueos.filter(b => b.fecha === isoDia);

    if (adminState.calFiltroCancha !== 'todas') {
      reservasDia = reservasDia.filter(r => r.canchaId === adminState.calFiltroCancha);
      bloqueosDia = bloqueosDia.filter(b => b.canchaId === adminState.calFiltroCancha);
    }

    // Ordenar por hora
    reservasDia.sort((a, b) => a.hora.localeCompare(b.hora));

    html += `
      <div class="cal-week-day-col" style="${esHoy ? 'border: 2px solid var(--accent);' : ''}">
        <div class="cal-week-day-header">
          <div class="cal-week-day-name" style="${esHoy ? 'color: var(--accent);' : ''}">${diasSemanaNombres[i]}</div>
          <div class="cal-week-day-date">${diaFecha.getDate()} / ${diaFecha.getMonth() + 1}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1;">
    `;

    if (reservasDia.length === 0 && bloqueosDia.length === 0) {
      html += `
        <div style="text-align: center; color: rgba(241, 243, 234, 0.4); font-size: 0.8rem; margin-top: 2rem;">
          Sin turnos registrados
        </div>
      `;
    }

    // Mostrar bloqueos
    bloqueosDia.forEach(b => {
      html += `
        <div class="bloqueo-slot-card" style="padding: 0.4rem;">
          <span class="bloqueo-slot-tag" style="font-size: 0.65rem;">🔒 ${b.horarios.join(', ')}</span>
          <span class="bloqueo-slot-motivo">${b.canchaNombre.split(' ')[0]} • ${b.motivo}</span>
        </div>
      `;
    });

    // Mostrar reservas
    reservasDia.forEach(r => {
      const paleta = adminDatos.getPaletaCancha(r.canchaId);
      const estadoClass = `status-${r.estado || 'confirmada'}`;

      html += `
        <div class="reserva-badge-card" style="border-left-color: ${paleta.border};"
             onclick="abrirModalDetalleReserva('${r.id}')" role="button" tabindex="0">
          <div class="reserva-badge-top">
            <strong style="color: var(--chalk); font-family: var(--font-display); font-size: 1.1rem;">${r.hora}</strong>
            <span class="reserva-badge-status ${estadoClass}">${r.estado}</span>
          </div>
          <div class="reserva-badge-client">${r.clienteNombre}</div>
          <div class="reserva-badge-bottom">
            <span>${r.canchaNombre}</span>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  }

  html += `</div>`;
  contenedor.innerHTML = html;
}

/**
 * Vista Mes: Grilla de días del mes calendario con contadores
 */
function renderizarCalendarioMes(contenedor) {
  const f = adminState.calFecha;
  const primerDiaMes = new Date(f.getFullYear(), f.getMonth(), 1);
  const ultimoDiaMes = new Date(f.getFullYear(), f.getMonth() + 1, 0);

  const diasSemanaNombres = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const reservas = adminDatos.getReservas().filter(r => r.estado !== 'cancelada');

  let html = `
    <div style="background-color: var(--ink); border: 2px solid var(--chalk); padding: 1rem;">
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; text-align: center; margin-bottom: 0.75rem;">
  `;

  diasSemanaNombres.forEach(d => {
    html += `<div style="font-family: var(--font-display); color: var(--accent); font-size: 1.15rem;">${d}</div>`;
  });

  html += `</div><div class="cal-month-grid">`;

  // Espacios vacíos antes del primer día del mes (1 = lunes, 0 = domingo)
  const diaSemPrimer = primerDiaMes.getDay() === 0 ? 7 : primerDiaMes.getDay();
  for (let i = 1; i < diaSemPrimer; i++) {
    html += `<div style="background-color: rgba(0,0,0,0.2); border: 1px dashed rgba(217,222,203,0.1); min-height: 80px;"></div>`;
  }

  // Días del mes
  const hoyIso = new Date().toISOString().split('T')[0];
  for (let d = 1; d <= ultimoDiaMes.getDate(); d++) {
    const fechaDia = new Date(f.getFullYear(), f.getMonth(), d);
    const isoDia = fechaDia.toISOString().split('T')[0];
    const esHoy = (hoyIso === isoDia);

    let reservasDia = reservas.filter(r => r.fecha === isoDia);
    if (adminState.calFiltroCancha !== 'todas') {
      reservasDia = reservasDia.filter(r => r.canchaId === adminState.calFiltroCancha);
    }

    const totalIngresosDia = reservasDia.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
    const totalFmt = (typeof window.formatearPrecio === 'function') ? window.formatearPrecio(totalIngresosDia) : `$ ${totalIngresosDia}`;

    html += `
      <div class="cal-month-day-cell ${esHoy ? 'is-today' : ''}" onclick="seleccionarDiaDesdeMes('${isoDia}')">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span class="cal-month-day-num">${d}</span>
          ${esHoy ? '<span style="color: var(--accent); font-size: 0.65rem; font-weight: bold;">HOY</span>' : ''}
        </div>
        ${reservasDia.length > 0 ? `
          <div class="cal-month-stat-pill">
            ${reservasDia.length} ${reservasDia.length === 1 ? 'partido' : 'partidos'}
            <div style="color: var(--chalk); font-size: 0.65rem;">${totalFmt}</div>
          </div>
        ` : '<span style="font-size: 0.7rem; color: rgba(241,243,234,0.3); text-align: center;">-</span>'}
      </div>
    `;
  }

  html += `</div></div>`;
  contenedor.innerHTML = html;
}

function seleccionarDiaDesdeMes(fechaIso) {
  adminState.calFecha = new Date(fechaIso + 'T12:00:00');
  adminState.calModo = 'dia';

  document.querySelectorAll('.view-btn[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === 'dia');
  });

  const dateInput = document.getElementById('cal-fecha-input');
  if (dateInput) dateInput.value = fechaIso;

  renderizarCalendario();
}

// ============================================================================
// 4. MÓDULO 2: CANCHAS (ALTA, EDICIÓN, PRECIOS Y HORARIOS)
// ============================================================================

function inicializarModuloCanchas() {
  const btnNuevaCancha = document.getElementById('btn-abrir-nueva-cancha');
  const formModalCancha = document.getElementById('form-cancha-modal');

  if (btnNuevaCancha) {
    btnNuevaCancha.addEventListener('click', () => {
      abrirModalCancha(null); // Modo crear
    });
  }

  if (formModalCancha) {
    formModalCancha.addEventListener('submit', (e) => {
      e.preventDefault();
      guardarCanchaDesdeModal();
    });
  }

  renderizarTablaCanchas();
}

function renderizarTablaCanchas() {
  const tbody = document.getElementById('tabla-canchas-body');
  if (!tbody) return;

  const canchas = adminDatos.getCanchas();
  tbody.innerHTML = '';

  canchas.forEach(c => {
    const tr = document.createElement('tr');
    const precioFmt = (typeof window.formatearPrecio === 'function')
      ? window.formatearPrecio(c.precioHora)
      : `$ ${c.precioHora}`;

    const estadoBadge = c.activa
      ? `<span class="table-badge activa">ACTIVA</span>`
      : `<span class="table-badge inactiva">INACTIVA</span>`;

    const btnToggleTexto = c.activa ? 'DESACTIVAR' : 'ACTIVAR';
    const btnToggleClass = c.activa ? 'btn-action-sm danger' : 'btn-action-sm';

    tr.innerHTML = `
      <td data-label="#"><strong>${c.numero || c.id.replace('cancha-', '')}</strong></td>
      <td data-label="Cancha">
        <strong style="color: var(--chalk); font-size: 1.05rem;">${c.nombre}</strong>
      </td>
      <td data-label="Tipo / Cat">
        <span class="badge-tag ${c.categoria ? c.categoria.toLowerCase() : 'f5'}">${c.tipo}</span>
      </td>
      <td data-label="Superficie">${c.superficie}</td>
      <td data-label="Techada">${c.techada ? '✓ Sí (Tinglado)' : '✕ Descubierta'}</td>
      <td data-label="Precio / Hora">
        <strong style="color: var(--accent); font-family: var(--font-display); font-size: 1.25rem;">${precioFmt}</strong>
      </td>
      <td data-label="Estado">${estadoBadge}</td>
      <td data-label="Acciones" style="text-align: right;">
        <div class="table-actions" style="justify-content: flex-end;">
          <button type="button" class="btn-action-sm" onclick="abrirModalCancha('${c.id}')">EDITAR</button>
          <button type="button" class="${btnToggleClass}" onclick="toggleEstadoCancha('${c.id}')">${btnToggleTexto}</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function abrirModalCancha(canchaId) {
  const modal = document.getElementById('modal-cancha-form');
  const modalTitulo = document.getElementById('modal-cancha-titulo');
  const form = document.getElementById('form-cancha-modal');
  if (!modal || !form) return;

  form.reset();

  if (canchaId) {
    const c = adminDatos.getCanchaById(canchaId);
    if (!c) return;

    modalTitulo.textContent = `EDITAR: ${c.nombre.toUpperCase()}`;
    document.getElementById('cancha-id-input').value = c.id;
    document.getElementById('cancha-nombre-input').value = c.nombre;
    document.getElementById('cancha-tipo-input').value = c.tipo;
    document.getElementById('cancha-precio-input').value = c.precioHora;
    document.getElementById('cancha-superficie-input').value = c.superficie;
    document.getElementById('cancha-capacidad-input').value = c.capacidad || '';
    document.getElementById('cancha-medidas-input').value = c.medidas || '';
    document.getElementById('cancha-iluminacion-input').value = c.iluminacion || '';
    document.getElementById('cancha-techada-input').checked = !!c.techada;
  } else {
    modalTitulo.textContent = 'REGISTRAR NUEVA CANCHA';
    document.getElementById('cancha-id-input').value = '';
    document.getElementById('cancha-techada-input').checked = false;
  }

  modal.classList.add('open');
}

function guardarCanchaDesdeModal() {
  const id = document.getElementById('cancha-id-input').value.trim();
  const nombre = document.getElementById('cancha-nombre-input').value.trim();
  const tipo = document.getElementById('cancha-tipo-input').value;
  const precioHora = parseInt(document.getElementById('cancha-precio-input').value, 10);
  const superficie = document.getElementById('cancha-superficie-input').value.trim();
  const capacidad = document.getElementById('cancha-capacidad-input').value.trim();
  const medidas = document.getElementById('cancha-medidas-input').value.trim();
  const iluminacion = document.getElementById('cancha-iluminacion-input').value.trim();
  const techada = document.getElementById('cancha-techada-input').checked;

  if (!nombre || isNaN(precioHora) || !superficie) {
    mostrarToast('⚠️ Completá los campos obligatorios marcados con *');
    return;
  }

  let categoria = 'F5';
  if (tipo.includes('7')) categoria = 'F7';
  if (tipo.includes('11')) categoria = 'F11';

  const canchaData = {
    nombre,
    tipo,
    categoria,
    precioHora,
    superficie,
    capacidad: capacidad || `${tipo} Reglamentario`,
    medidas: medidas || 'Dimensiones oficiales',
    iluminacion: iluminacion || 'Reflectores LED estadio',
    techada
  };

  if (id) {
    canchaData.id = id;
  }

  // TODO: reemplazar por fetch('https://api.elpotrero.com/api/canchas', { method: ... })
  const res = adminDatos.guardarCancha(canchaData);
  if (res.ok) {
    document.getElementById('modal-cancha-form').classList.remove('open');
    renderizarTablaCanchas();
    renderizarCalendario();
    renderizarModuloBloqueos();
    mostrarToast(res.esNueva ? '⚽ ¡Cancha agregada exitosamente!' : '✓ Cancha actualizada correctamente');
  }
}

function toggleEstadoCancha(canchaId) {
  // TODO: reemplazar por fetch(`https://api.elpotrero.com/api/canchas/${canchaId}/toggle`)
  const res = adminDatos.toggleEstadoCancha(canchaId);
  if (res.ok) {
    renderizarTablaCanchas();
    mostrarToast(`Cancha ${res.cancha.activa ? 'ACTIVADA' : 'DESACTIVADA'} con éxito.`);
  }
}

// ============================================================================
// 5. MÓDULO 3: BLOQUEOS DE HORARIOS
// ============================================================================

function inicializarModuloBloqueos() {
  const formBloqueo = document.getElementById('form-nuevo-bloqueo');
  const btnToggleTodos = document.getElementById('btn-toggle-todos-horarios');
  const fechaInput = document.getElementById('bloqueo-fecha-input');

  if (fechaInput) {
    const hoyStr = new Date().toISOString().split('T')[0];
    fechaInput.value = hoyStr;
    fechaInput.min = hoyStr;
  }

  if (btnToggleTodos) {
    btnToggleTodos.addEventListener('click', () => {
      const chips = document.querySelectorAll('.horario-chip');
      const todosSeleccionados = Array.from(chips).every(c => c.classList.contains('selected'));

      chips.forEach(chip => {
        const hora = chip.dataset.hora;
        if (todosSeleccionados) {
          chip.classList.remove('selected');
          adminState.bloqueoHorariosSeleccionados.delete(hora);
        } else {
          chip.classList.add('selected');
          adminState.bloqueoHorariosSeleccionados.add(hora);
        }
      });
    });
  }

  if (formBloqueo) {
    formBloqueo.addEventListener('submit', (e) => {
      e.preventDefault();
      crearBloqueoDesdeForm();
    });
  }

  renderizarModuloBloqueos();
}

function renderizarModuloBloqueos() {
  // 1. Opciones de canchas en el select
  const selectCancha = document.getElementById('bloqueo-cancha-select');
  if (selectCancha) {
    const canchas = adminDatos.getCanchas();
    selectCancha.innerHTML = '';
    canchas.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.nombre} (${c.tipo})${c.techada ? ' - Techada' : ''}`;
      selectCancha.appendChild(opt);
    });
  }

  // 2. Chips de horarios operativos (14:00 a 23:00)
  const chipsContainer = document.getElementById('bloqueo-horarios-chips');
  if (chipsContainer) {
    chipsContainer.innerHTML = '';
    const horarios = (typeof window.HORARIOS_OPERATIVOS !== 'undefined')
      ? window.HORARIOS_OPERATIVOS
      : ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

    horarios.forEach(hora => {
      const chip = document.createElement('div');
      chip.className = `horario-chip ${adminState.bloqueoHorariosSeleccionados.has(hora) ? 'selected' : ''}`;
      chip.dataset.hora = hora;
      chip.textContent = hora;
      chip.addEventListener('click', () => {
        if (adminState.bloqueoHorariosSeleccionados.has(hora)) {
          adminState.bloqueoHorariosSeleccionados.delete(hora);
          chip.classList.remove('selected');
        } else {
          adminState.bloqueoHorariosSeleccionados.add(hora);
          chip.classList.add('selected');
        }
      });
      chipsContainer.appendChild(chip);
    });
  }

  // 3. Tabla de bloqueos activos
  const tbody = document.getElementById('tabla-bloqueos-body');
  if (tbody) {
    const bloqueos = adminDatos.getBloqueos();
    tbody.innerHTML = '';

    if (bloqueos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--chalk-dim); padding: 2rem;">
            No hay bloqueos activos en el sistema.
          </td>
        </tr>
      `;
      return;
    }

    bloqueos.forEach(b => {
      const tr = document.createElement('tr');
      const horariosTexto = Array.isArray(b.horarios) ? b.horarios.join(', ') : b.horarios;

      tr.innerHTML = `
        <td data-label="Cancha">
          <strong style="color: var(--chalk); font-size: 1.05rem;">${b.canchaNombre}</strong>
        </td>
        <td data-label="Fecha">${b.fecha}</td>
        <td data-label="Horarios Bloqueados">
          <span style="color: var(--accent); font-weight: 700;">${horariosTexto}</span>
        </td>
        <td data-label="Motivo">
          <span class="table-badge" style="background-color: rgba(230, 57, 70, 0.2); color: #FF8A8A; border: 1px solid var(--danger);">
            ${b.motivo}
          </span>
        </td>
        <td data-label="Detalle">${b.nota || '-'}</td>
        <td data-label="Acción" style="text-align: right;">
          <button type="button" class="btn-action-sm danger" onclick="levantarBloqueo('${b.id}')">
            LEVANTAR BLOQUEO ✕
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function crearBloqueoDesdeForm() {
  const canchaId = document.getElementById('bloqueo-cancha-select').value;
  const fecha = document.getElementById('bloqueo-fecha-input').value;
  const motivo = document.getElementById('bloqueo-motivo-select').value;
  const nota = document.getElementById('bloqueo-nota-input').value.trim();
  const horarios = Array.from(adminState.bloqueoHorariosSeleccionados);

  if (!canchaId || !fecha || horarios.length === 0) {
    mostrarToast('⚠️ Seleccioná cancha, fecha y al menos un horario para bloquear.');
    return;
  }

  // TODO: reemplazar por fetch('https://api.elpotrero.com/api/bloqueos', { method: 'POST', body: ... })
  const res = adminDatos.crearBloqueo({ canchaId, fecha, horarios, motivo, nota });

  if (res.ok) {
    adminState.bloqueoHorariosSeleccionados.clear();
    document.getElementById('bloqueo-nota-input').value = '';
    renderizarModuloBloqueos();
    renderizarCalendario();
    mostrarToast('🔒 Horarios bloqueados correctamente en el sistema.');
  } else {
    mostrarToast(`Error: ${res.error}`);
  }
}

function levantarBloqueo(bloqueoId) {
  // TODO: reemplazar por fetch(`https://api.elpotrero.com/api/bloqueos/${bloqueoId}`, { method: 'DELETE' })
  const res = adminDatos.eliminarBloqueo(bloqueoId);
  if (res.ok) {
    renderizarModuloBloqueos();
    renderizarCalendario();
    mostrarToast('✓ Bloqueo levantado. Horarios liberados para reservas.');
  }
}

// ============================================================================
// 6. MÓDULO 4: REPORTES (ESTILO MARCADOR DE ESTADIO)
// ============================================================================

function inicializarModuloReportes() {
  const btnsRango = document.querySelectorAll('.view-btn[data-rango]');
  const customBox = document.getElementById('reporte-custom-range');
  const btnAplicarCustom = document.getElementById('btn-aplicar-rango-rep');

  // Inicializar inputs de fecha custom
  const hoy = new Date();
  const hace7 = new Date();
  hace7.setDate(hoy.getDate() - 7);
  const repDesde = document.getElementById('rep-desde');
  const repHasta = document.getElementById('rep-hasta');
  if (repDesde && repHasta) {
    repDesde.value = hace7.toISOString().split('T')[0];
    repHasta.value = hoy.toISOString().split('T')[0];
  }

  btnsRango.forEach(btn => {
    btn.addEventListener('click', () => {
      btnsRango.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const rango = btn.dataset.rango;
      adminState.reporteRango = rango;

      if (rango === 'personalizado') {
        customBox.style.display = 'inline-flex';
      } else {
        customBox.style.display = 'none';
        renderizarModuloReportes();
      }
    });
  });

  if (btnAplicarCustom) {
    btnAplicarCustom.addEventListener('click', () => {
      const desde = repDesde.value;
      const hasta = repHasta.value;
      if (!desde || !hasta) {
        mostrarToast('⚠️ Seleccioná fecha desde y hasta para calcular.');
        return;
      }
      renderizarModuloReportes({ desde, hasta });
    });
  }

  renderizarModuloReportes();
}

function renderizarModuloReportes(rangoCustom = null) {
  const rangoParam = rangoCustom || adminState.reporteRango;
  // TODO: reemplazar por fetch(`https://api.elpotrero.com/api/reportes?rango=...`)
  const stats = adminDatos.calcularEstadisticas(rangoParam);

  const kpiBox = document.getElementById('reporte-kpis-box');
  const chartIngresos = document.getElementById('chart-ingresos-bars');
  const chartOcupacion = document.getElementById('chart-ocupacion-bars');
  const tbody = document.getElementById('tabla-reporte-canchas-body');

  if (!kpiBox) return;

  const totalIngresosFmt = (typeof window.formatearPrecio === 'function')
    ? window.formatearPrecio(stats.totalIngresos)
    : `$ ${stats.totalIngresos}`;

  // 1. KPIs Marcador de Estadio
  kpiBox.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-title">INGRESOS TOTALES</div>
      <div class="kpi-val">${totalIngresosFmt}</div>
      <div class="kpi-sub">Período: ${stats.rangoLabel}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">OCUPACIÓN PROMEDIO</div>
      <div class="kpi-val" style="color: #5CDB95;">${stats.porcentajeOcupacion}%</div>
      <div class="kpi-sub">De capacidad total del predio</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">PARTIDOS RESERVADOS</div>
      <div class="kpi-val" style="color: var(--chalk);">${stats.totalReservas}</div>
      <div class="kpi-sub">Turnos confirmados / jugados</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">HORARIOS BLOQUEADOS</div>
      <div class="kpi-val" style="color: #FF8A8A;">${stats.totalBloqueos}</div>
      <div class="kpi-sub">Mantenimiento y clima</div>
    </div>
  `;

  // 2. Gráfico de Barras CSS Puro: Ingresos por Cancha
  if (chartIngresos) {
    chartIngresos.innerHTML = '';
    const maxIngresos = Math.max(...stats.porCancha.map(c => c.ingresos), 1);

    stats.porCancha.forEach(c => {
      const pct = Math.round((c.ingresos / maxIngresos) * 100);
      const ingFmt = (typeof window.formatearPrecio === 'function')
        ? window.formatearPrecio(c.ingresos)
        : `$ ${c.ingresos}`;

      const row = document.createElement('div');
      row.className = 'chart-row';
      row.innerHTML = `
        <div class="chart-row-label">${c.canchaNombre}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="--bar-pct: ${pct}%;"></div>
        </div>
        <div class="chart-row-val">${ingFmt}</div>
      `;
      chartIngresos.appendChild(row);
    });
  }

  // 3. Gráfico de Barras CSS Puro: Ocupación por Cancha
  if (chartOcupacion) {
    chartOcupacion.innerHTML = '';

    stats.porCancha.forEach(c => {
      const pct = c.porcentajeOcupacion;

      const row = document.createElement('div');
      row.className = 'chart-row';
      row.innerHTML = `
        <div class="chart-row-label">${c.canchaNombre}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill bar-emerald" style="--bar-pct: ${pct}%;"></div>
        </div>
        <div class="chart-row-val" style="color: #5CDB95;">${pct}%</div>
      `;
      chartOcupacion.appendChild(row);
    });
  }

  // 4. Tabla Detallada
  if (tbody) {
    tbody.innerHTML = '';
    stats.porCancha.forEach(c => {
      const tr = document.createElement('tr');
      const ingFmt = (typeof window.formatearPrecio === 'function')
        ? window.formatearPrecio(c.ingresos)
        : `$ ${c.ingresos}`;

      tr.innerHTML = `
        <td data-label="Cancha">
          <strong style="color: var(--chalk);">${c.canchaNombre}</strong>
        </td>
        <td data-label="Tipo">${c.canchaTipo}</td>
        <td data-label="Turnos Reservados">
          <strong style="color: var(--accent);">${c.turnosReservados}</strong>
        </td>
        <td data-label="Turnos Disponibles">${c.slotsTotales}</td>
        <td data-label="% Ocupación">
          <strong style="color: #5CDB95;">${c.porcentajeOcupacion}%</strong>
        </td>
        <td data-label="Ingresos Totales" style="text-align: right;">
          <strong style="color: var(--accent); font-family: var(--font-display); font-size: 1.2rem;">${ingFmt}</strong>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// ============================================================================
// 7. MODALES & DETALLE DE RESERVA
// ============================================================================

function inicializarModales() {
  // Modal Detalle de Reserva
  const modalReserva = document.getElementById('modal-detalle-reserva');
  const btnCerrarModalReserva = document.getElementById('btn-cerrar-modal-reserva');
  const btnCerrarModalReservaBottom = document.getElementById('btn-modal-reserva-cerrar');

  const cerrarReservaModal = () => {
    if (modalReserva) modalReserva.classList.remove('open');
  };

  if (btnCerrarModalReserva) btnCerrarModalReserva.addEventListener('click', cerrarReservaModal);
  if (btnCerrarModalReservaBottom) btnCerrarModalReservaBottom.addEventListener('click', cerrarReservaModal);

  // Modal Cancha Form
  const modalCancha = document.getElementById('modal-cancha-form');
  const btnCerrarCancha = document.getElementById('btn-cerrar-modal-cancha');
  const btnCancelarCancha = document.getElementById('btn-cancelar-cancha');

  const cerrarCanchaModal = () => {
    if (modalCancha) modalCancha.classList.remove('open');
  };

  if (btnCerrarCancha) btnCerrarCancha.addEventListener('click', cerrarCanchaModal);
  if (btnCancelarCancha) btnCancelarCancha.addEventListener('click', cerrarCanchaModal);

  // Cerrar al clickear fuera
  window.addEventListener('click', (e) => {
    if (e.target === modalReserva) cerrarReservaModal();
    if (e.target === modalCancha) cerrarCanchaModal();
  });

  // Cerrar con Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cerrarReservaModal();
      cerrarCanchaModal();
    }
  });
}

function abrirModalDetalleReserva(reservaId) {
  const reserva = adminDatos.getReservaById(reservaId);
  const modal = document.getElementById('modal-detalle-reserva');
  const body = document.getElementById('modal-reserva-body');
  if (!reserva || !modal || !body) return;

  const montoFmt = (typeof window.formatearPrecio === 'function')
    ? window.formatearPrecio(reserva.monto)
    : `$ ${reserva.monto}`;

  const telLimpio = (reserva.clienteTelefono || '').replace(/[^0-9]/g, '');
  const waLink = `https://wa.me/${telLimpio}?text=${encodeURIComponent(`¡Hola ${reserva.clienteNombre}! Te contactamos desde El Potrero por tu reserva ${reserva.id} para el turno de las ${reserva.hora} hs.`)}`;

  body.innerHTML = `
    <div class="ticket-wrapper" style="margin-bottom: 1rem;">
      <div class="ticket-header">
        <div class="ticket-club">EL POTRERO • ENTRADA OFICIAL</div>
        <div class="ticket-stub-code">${reserva.id}</div>
      </div>
      <div class="ticket-body">
        <div class="ticket-details-grid">
          <div class="ticket-field">
            <span class="ticket-lbl">CANCHA</span>
            <span class="ticket-val cancha-destacada">${reserva.canchaNombre}</span>
            <span style="font-size: 0.8rem; color: var(--ink-soft);">${reserva.tipoCancha || 'Fútbol'}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-lbl">HORARIO & FECHA</span>
            <span class="ticket-val">${reserva.hora} HS</span>
            <span style="font-size: 0.85rem; color: var(--ink-soft);">${reserva.fecha}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-lbl">TITULAR / CAPITÁN</span>
            <span class="ticket-val">${reserva.clienteNombre}</span>
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" style="font-size: 0.85rem; color: #1B5E20; font-weight: bold; margin-top: 0.2rem;">
              📲 ${reserva.clienteTelefono} (WhatsApp)
            </a>
          </div>
          <div class="ticket-field">
            <span class="ticket-lbl">VALOR DEL TURNO</span>
            <span class="ticket-val precio-destacado">${montoFmt}</span>
            <span style="font-size: 0.8rem; color: var(--ink-soft); text-transform: uppercase;">
              Método: ${reserva.metodoPago || 'Mercado Pago'}
            </span>
          </div>
        </div>

        <div class="ticket-barcode-wrap">
          <div class="barcode-lines"></div>
          <div class="barcode-text">${reserva.id} • OFICIAL EL POTRERO</div>
        </div>
      </div>
    </div>

    <!-- Modificador de Estado -->
    <div style="background-color: var(--pitch-dark); border: 2px solid var(--border); padding: 1.25rem;">
      <label for="cambio-estado-select" class="form-label">ESTADO DE LA RESERVA</label>
      <div style="display: flex; gap: 0.75rem; align-items: center;">
        <select id="cambio-estado-select" class="form-input" style="flex: 1;">
          <option value="confirmada" ${reserva.estado === 'confirmada' ? 'selected' : ''}>CONFIRMADA (Pago/Seña acreditada)</option>
          <option value="pendiente" ${reserva.estado === 'pendiente' ? 'selected' : ''}>PENDIENTE (Abono en boletería)</option>
          <option value="cancelada" ${reserva.estado === 'cancelada' ? 'selected' : ''}>CANCELADA (Turno anulado)</option>
        </select>
        <button type="button" class="btn btn-primary" onclick="guardarCambioEstadoReserva('${reserva.id}')">
          ACTUALIZAR
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

function guardarCambioEstadoReserva(reservaId) {
  const select = document.getElementById('cambio-estado-select');
  if (!select) return;

  const nuevoEstado = select.value;
  // TODO: reemplazar por fetch(`https://api.elpotrero.com/api/reservas/${reservaId}/estado`, { method: 'PATCH', body: ... })
  const res = adminDatos.actualizarEstadoReserva(reservaId, nuevoEstado);

  if (res.ok) {
    document.getElementById('modal-detalle-reserva').classList.remove('open');
    renderizarCalendario();
    renderizarModuloReportes();
    mostrarToast(`✓ Estado de reserva ${reservaId} actualizado a ${nuevoEstado.toUpperCase()}.`);
  }
}

// ============================================================================
// 8. TOAST NOTIFICACIONES VISUALES
// ============================================================================

function mostrarToast(mensaje, duracion = 3500) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'admin-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = mensaje;
  toast.style.display = 'block';

  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, duracion);
}

// Exposición global de handlers necesarios en HTML onclick
window.activarTab = activarTab;
window.abrirModalCancha = abrirModalCancha;
window.toggleEstadoCancha = toggleEstadoCancha;
window.levantarBloqueo = levantarBloqueo;
window.abrirModalDetalleReserva = abrirModalDetalleReserva;
window.guardarCambioEstadoReserva = guardarCambioEstadoReserva;
window.seleccionarDiaDesdeMes = seleccionarDiaDesdeMes;
window.mostrarToast = mostrarToast;
