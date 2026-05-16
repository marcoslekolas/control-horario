// Estado
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let datos = JSON.parse(localStorage.getItem('horario_datos') || '{}');
let config = datos.config || { empresa: '', cif: '', ccc: '', trabajador: '', nif: '', naf: '' };

const tbody = document.getElementById('tbody-calendario');
const mesLabel = document.getElementById('mes-actual');
const modal = document.getElementById('modal-config');
const listaRevision = document.getElementById('lista-revision');

// Utilidades
const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const presetHorarios = {
  completa: { em: '09:00', sm: '14:00', et: '16:00', st: '18:00', horas: 8, obs: '' },
  manana:   { em: '09:00', sm: '14:00', et: '',       st: '',       horas: 5, obs: '' },
  ochoa15:  { em: '08:00', sm: '15:00', et: '',       st: '',       horas: 7, obs: '' },
  festivo:  { em: '', sm: '', et: '', st: '', horas: 0, obs: 'FESTIVO' },
  vacaciones:{ em: '', sm: '', et: '', st: '', horas: 0, obs: 'VACACIONES' }
};

function guardarLocal() {
  datos.config = config;
  localStorage.setItem('horario_datos', JSON.stringify(datos));
}

function renderizarMes() {
  const nombreMes = new Date(anioActual, mesActual, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
  mesLabel.textContent = nombreMes;
  tbody.innerHTML = '';

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
  datos[claveMes] = datos[claveMes] || {};

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(anioActual, mesActual, d);
    const diaSem = fecha.getDay();
    const claveDia = String(d).padStart(2,'0');
    const reg = datos[claveMes][claveDia] || {};

    // Auto-rellenar si no existe: L-V = 8h, S-D = vacío
    if (!datos[claveMes][claveDia]) {
      datos[claveMes][claveDia] = (diaSem >= 1 && diaSem <= 5) ? { ...presetHorarios.completa } : { horas: 0, obs: '' };
    }
    const actual = datos[claveMes][claveDia];

    const tr = document.createElement('tr');
    tr.dataset.dia = d;
    tr.className = actual.obs?.includes('FESTIVO') ? 'festivo' : actual.obs?.includes('VACACIONES') ? 'vacaciones' : (diaSem === 0 || diaSem === 6 && actual.horas > 0) ? 'guardia' : '';

    tr.innerHTML = `
      <td>${d} <small>(${diasSemana[diaSem].slice(0,3)})</small></td>
      <td>
        <select onchange="actualizarTipo(${d}, this.value)">
          <option value="completa" ${actual.horas===8?'selected':''}>8h (9-14/16-18)</option>
          <option value="manana" ${actual.horas===5?'selected':''}>5h (9-14)</option>
          <option value="ochoa15" ${actual.horas===7?'selected':''}>7h (8-15)</option>
          <option value="festivo" ${actual.obs?.includes('FESTIVO')?'selected':''}>Festivo</option>
          <option value="vacaciones" ${actual.obs?.includes('VACACIONES')?'selected':''}>Vacaciones</option>
        </select>
      </td>
      <td><input type="time" value="${actual.em||''}" onchange="actualizarHora(${d},'em',this.value)"></td>
      <td><input type="time" value="${actual.sm||''}" onchange="actualizarHora(${d},'sm',this.value)"></td>
      <td><input type="time" value="${actual.et||''}" onchange="actualizarHora(${d},'et',this.value)"></td>
      <td><input type="time" value="${actual.st||''}" onchange="actualizarHora(${d},'st',this.value)"></td>
      <td>${actual.horas||0}h</td>
      <td><input type="text" value="${actual.obs||''}" placeholder="Obs." style="width:100%; padding:0.4rem;" onchange="actualizarObs(${d}, this.value)"></td>
    `;
    tbody.appendChild(tr);
  }
}

function actualizarTipo(dia, tipo) {
  const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
  datos[claveMes][String(dia).padStart(2,'0')] = { ...presetHorarios[tipo] };
  guardarLocal(); renderizarMes();
}
function actualizarHora(dia, campo, valor) {
  const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
  datos[claveMes][String(dia).padStart(2,'0')][campo] = valor;
  guardarLocal();
}
function actualizarObs(dia, valor) {
  const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
  datos[claveMes][String(dia).padStart(2,'0')].obs = valor;
  guardarLocal();
}

// Navegación
document.getElementById('btn-prev').onclick = () => { mesActual--; if(mesActual<0){mesActual=11; anioActual--;} renderizarMes(); };
document.getElementById('btn-next').onclick = () => { mesActual++; if(mesActual>11){mesActual=0; anioActual++;} renderizarMes(); };

// Configuración empresa
document.getElementById('btn-config').onclick = () => {
  const d = prompt('EMPRESA | CIF | CCC | TRABAJADOR | NIF | NAF', `${config.empresa}|${config.cif}|${config.ccc}|${config.trabajador}|${config.nif}|${config.naf}`);
  if(d) { [config.empresa,config.cif,config.ccc,config.trabajador,config.nif,config.naf] = d.split('|'); guardarLocal(); }
};

// Generar Excel
document.getElementById('btn-generar').onclick = () => {
  listaRevision.innerHTML = '';
  const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();

  for(let d=1; d<=diasEnMes; d++) {
    const reg = datos[claveMes][String(d).padStart(2,'0')] || {};
    const div = document.createElement('div');
    div.className = 'revision-item';
    div.innerHTML = `
      <span>Día ${d} | ${reg.obs||'Normal'} | ${reg.horas||0}h</span>
      <select data-dia="${d}">
        <option value="normal" selected>Conservar</option>
        <option value="guardia">Marcar Guardia</option>
        <option value="festivo">Marcar Festivo</option>
        <option value="vacaciones">Marcar Vacaciones</option>
      </select>
    `;
    listaRevision.appendChild(div);
  }
  modal.showModal();
};

document.getElementById('btn-cancelar').onclick = () => modal.close();
document.getElementById('btn-confirmar').onclick = () => {
  // Aplicar cambios de revisión
  document.querySelectorAll('#lista-revision select').forEach(sel => {
    if(sel.value !== 'normal') {
      const d = String(sel.dataset.dia).padStart(2,'0');
      const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
      datos[claveMes][d] = { ...presetHorarios[sel.value], ...(sel.value==='guardia'?{horas:8,obs:'GUARDIA'}:{}) };
    }
  });
  guardarLocal();
  generarExcel();
  modal.close();
};

function generarExcel() {
  const wb = XLSX.utils.book_new();
  const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const nombreMes = new Date(anioActual, mesActual, 1).toLocaleString('es-ES', { month: 'long' }).toUpperCase();

  const wsData = [
    ['REGISTRO DIARIO DE JORNADA'],
    ['En cumplimiento de la obligación establecida en el artículo 34.9 del Estatuto de los Trabajadores'],
    [],
    ['EMPRESA:', config.empresa, '', 'C.I.F.', config.cif, '', 'C.C.C.', config.ccc, '', '', 'MES', `${nombreMes} ${anioActual}`],
    ['TRABAJADOR/A:', config.trabajador, '', 'N.I.F', config.nif, '', 'N.A.F', config.naf, '', '', 'AÑO', anioActual],
    [],
    ['DÍA','H. ENTRADA','FIRMA','H. SALIDA','FIRMA','H. ENTRADA','FIRMA','H. SALIDA','FIRMA','HORAS ORD.','HORAS EXTRA.','OBSERVACIONES']
  ];

  let totalHoras = 0;
  for(let d=1; d<=diasEnMes; d++) {
    const reg = datos[claveMes][String(d).padStart(2,'0')] || {};
    const horas = reg.horas || 0;
    totalHoras += horas;
    wsData.push([d, reg.em||'', '', reg.sm||'', '', reg.et||'', '', reg.st||'', '', horas, '', reg.obs||'']);
  }

  wsData.push([]);
  wsData.push(['','','','','','','','','','Fdo. Empresa','','Fdo. Trabajador']);
  wsData.push(['','','','','','','','','',`Total horas: ${totalHoras}`,'','']);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Registro');
  XLSX.writeFile(wb, `${anioActual}-${String(mesActual+1).padStart(2,'0')}_REGISTRO_JORNADA.xlsx`);
}

renderizarMes();
