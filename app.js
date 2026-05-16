// Estado global
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let datos = JSON.parse(localStorage.getItem('horario_datos') || '{}');
let config = datos.config || { empresa: '', cif: '', ccc: '', trabajador: '', nif: '', naf: '' };

const tbody = document.getElementById('tbody-calendario');
const mesLabel = document.getElementById('mes-actual');
const infoTrabajador = document.getElementById('info-trabajador');
const modalConfig = document.getElementById('modal-config');
const modalGenerar = document.getElementById('modal-generar');
const fileImport = document.getElementById('file-import');

const diasSemana = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const nombresMeses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

const presetHorarios = {
  completa: { em: '09:00', sm: '14:00', et: '16:00', st: '18:00', horas: 8, obs: '' },
  manana:   { em: '09:00', sm: '14:00', et: '',       st: '',       horas: 5, obs: '' },
  ochoa15:  { em: '08:00', sm: '15:00', et: '',       st: '',       horas: 7, obs: '' },
  festivo:  { em: '', sm: '', et: '', st: '', horas: 0, obs: 'FESTIVO' },
  vacaciones:{ em: '', sm: '', et: '', st: '', horas: 0, obs: 'VACACIONES' },
  libre:    { em: '', sm: '', et: '', st: '', horas: 0, obs: '' }
};

// Inicialización
function init() {
  actualizarInfoTrabajador();
  renderizarMes();
  setupEventListeners();
}

function setupEventListeners() {
  document.getElementById('btn-prev').onclick = () => { mesActual--; if(mesActual<0){mesActual=11; anioActual--;} renderizarMes(); };
  document.getElementById('btn-next').onclick = () => { mesActual++; if(mesActual>11){mesActual=0; anioActual++;} renderizarMes(); };
  
  document.getElementById('btn-config').onclick = () => abrirConfig();
  document.getElementById('form-config').onsubmit = guardarConfig;
  document.getElementById('btn-cancelar').onclick = () => modalConfig.close();
  
  document.getElementById('btn-export').onclick = exportarBackup;
  document.getElementById('btn-import').onclick = () => fileImport.click();
  fileImport.onchange = importarBackup;
  
  document.getElementById('btn-generar-anual').onclick = () => {
    document.getElementById('anio-generar').textContent = anioActual;
    modalGenerar.showModal();
  };
  document.getElementById('btn-cancelar-gen').onclick = () => modalGenerar.close();
  document.getElementById('btn-confirmar-gen').onclick = () => { generarExcelAnual(); modalGenerar.close(); };
}

function actualizarInfoTrabajador() {
  if(config.trabajador && config.empresa) {
    infoTrabajador.textContent = `${config.trabajador} - ${config.empresa}`;
  } else {
    infoTrabajador.textContent = '⚠️ Configura datos de empresa/trabajador';
  }
}

function abrirConfig() {
  document.getElementById('cfg-empresa').value = config.empresa;
  document.getElementById('cfg-cif').value = config.cif;
  document.getElementById('cfg-ccc').value = config.ccc;
  document.getElementById('cfg-trabajador').value = config.trabajador;
  document.getElementById('cfg-nif').value = config.nif;
  document.getElementById('cfg-naf').value = config.naf;
  modalConfig.showModal();
}

function guardarConfig(e) {
  e.preventDefault();
  config = {
    empresa: document.getElementById('cfg-empresa').value,
    cif: document.getElementById('cfg-cif').value,
    ccc: document.getElementById('cfg-ccc').value,
    trabajador: document.getElementById('cfg-trabajador').value,
    nif: document.getElementById('cfg-nif').value,
    naf: document.getElementById('cfg-naf').value
  };
  guardarLocal();
  actualizarInfoTrabajador();
  modalConfig.close();
}

function guardarLocal() {
  datos.config = config;
  localStorage.setItem('horario_datos', JSON.stringify(datos));
}

function renderizarMes() {
  mesLabel.textContent = `${nombresMeses[mesActual]} ${anioActual}`;
  tbody.innerHTML = '';

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
  datos[claveMes] = datos[claveMes] || {};

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(anioActual, mesActual, d);
    const diaSem = fecha.getDay();
    const claveDia = String(d).padStart(2,'0');
    
    // Auto-inicializar si no existe
    if (!datos[claveMes][claveDia]) {
      datos[claveMes][claveDia] = (diaSem >= 1 && diaSem <= 5) ? { ...presetHorarios.completa } : { ...presetHorarios.libre };
    }
    const reg = datos[claveMes][claveDia];

    const tr = document.createElement('tr');
    tr.className = reg.obs?.includes('FESTIVO') ? 'festivo' : reg.obs?.includes('VACACIONES') ? 'vacaciones' : (diaSem === 0 || diaSem === 6) && reg.horas > 0 ? 'guardia' : '';

    tr.innerHTML = `
      <td><strong>${d}</strong><br><small>${diasSemana[diaSem]}</small></td>
      <td>
        <select onchange="actualizarTipo(${d}, this.value)">
          <option value="completa" ${reg.horas===8 && reg.et?'selected':''}>8h (9-14/16-18)</option>
          <option value="manana" ${reg.horas===5?'selected':''}>5h (9-14)</option>
          <option value="ochoa15" ${reg.horas===7?'selected':''}>7h (8-15)</option>
          <option value="festivo" ${reg.obs?.includes('FESTIVO')?'selected':''}>Festivo</option>
          <option value="vacaciones" ${reg.obs?.includes('VACACIONES')?'selected':''}>Vacaciones</option>
          <option value="libre" ${!reg.em && !reg.obs?'selected':''}>Libre</option>
        </select>
      </td>
      <td><input type="time" value="${reg.em||''}" onchange="actualizarHora(${d},'em',this.value)"></td>
      <td><input type="time" value="${reg.sm||''}" onchange="actualizarHora(${d},'sm',this.value)"></td>
      <td><input type="time" value="${reg.et||''}" onchange="actualizarHora(${d},'et',this.value)"></td>
      <td><input type="time" value="${reg.st||''}" onchange="actualizarHora(${d},'st',this.value)"></td>
      <td><strong>${reg.horas||0}h</strong></td>
      <td><input type="text" value="${reg.obs||''}" placeholder="Obs." onchange="actualizarObs(${d}, this.value)"></td>
    `;
    tbody.appendChild(tr);
  }
  guardarLocal();
}

function actualizarTipo(dia, tipo) {
  const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
  datos[claveMes][String(dia).padStart(2,'0')] = { ...presetHorarios[tipo] };
  guardarLocal();
  renderizarMes();
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

function exportarBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datos, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `backup_horario_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function importarBackup(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      datos = JSON.parse(evt.target.result);
      config = datos.config || config;
      localStorage.setItem('horario_datos', JSON.stringify(datos));
      actualizarInfoTrabajador();
      renderizarMes();
      alert('✅ Datos restaurados correctamente');
    } catch(err) {
      alert('❌ Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file);
  file.value = '';
}

function generarExcelAnual() {
  const wb = XLSX.utils.book_new();
  
  // Generar 12 hojas (una por mes)
  for(let mes=0; mes<12; mes++) {
    const claveMes = `${anioActual}-${String(mes+1).padStart(2,'0')}`;
    const diasEnMes = new Date(anioActual, mes + 1, 0).getDate();
    const registrosMes = datos[claveMes] || {};
    
    // Crear hoja
    const wsData = [];
    
    // Cabecera con formato
    wsData.push([{ t: 's', v: 'REGISTRO DIARIO DE JORNADA', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } }]);
    wsData.push([{ t: 's', v: 'En cumplimiento de la obligación establecida en el artículo 34.9 del Estatuto de los Trabajadores', s: { font: { italic: true }, alignment: { horizontal: 'center' } } }]);
    wsData.push([]);
    
    // Datos empresa
    wsData.push([
      { t: 's', v: 'EMPRESA:', s: { font: { bold: true } } },
      { t: 's', v: config.empresa },
      { t: 's', v: '' },
      { t: 's', v: 'C.I.F.', s: { font: { bold: true } } },
      { t: 's', v: config.cif },
      { t: 's', v: '' },
      { t: 's', v: 'C.C.C.', s: { font: { bold: true } } },
      { t: 's', v: config.ccc },
      { t: 's', v: '' },
      { t: 's', v: 'MES:', s: { font: { bold: true }, alignment: { horizontal: 'right' } } },
      { t: 's', v: nombresMeses[mes].toUpperCase() + ' ' + anioActual }
    ]);
    
    wsData.push([
      { t: 's', v: 'TRABAJADOR/A:', s: { font: { bold: true } } },
      { t: 's', v: config.trabajador },
      { t: 's', v: '' },
      { t: 's', v: 'N.I.F', s: { font: { bold: true } } },
      { t: 's', v: config.nif },
      { t: 's', v: '' },
      { t: 's', v: 'N.A.F', s: { font: { bold: true } } },
      { t: 's', v: config.naf },
      { t: 's', v: '' },
      { t: 's', v: 'AÑO:', s: { font: { bold: true }, alignment: { horizontal: 'right' } } },
      { t: 's', v: anioActual }
    ]);
    
    wsData.push([]);
    
    // Encabezados de tabla
    const headers = ['DÍA','H. ENTRADA','FIRMA','H. SALIDA','FIRMA','H. ENTRADA','FIRMA','H. SALIDA','FIRMA','HORAS ORD.','HORAS EXTRA.','OBSERVACIONES'];
    const headerRow = headers.map(h => ({ t: 's', v: h, s: { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "F1F5F9" } }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }, alignment: { horizontal: 'center' } } }));
    wsData.push(headerRow);
    
    // Días del mes
    let totalHoras = 0;
    for(let d=1; d<=diasEnMes; d++) {
      const reg = registrosMes[String(d).padStart(2,'0')] || {};
      const horas = reg.horas || 0;
      totalHoras += horas;
      
      const row = [
        { t: 'n', v: d, s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }, alignment: { horizontal: 'center' } } },
        { t: 's', v: reg.em||'', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
        { t: 's', v: '', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
        { t: 's', v: reg.sm||'', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
        { t: 's', v: '', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
        { t: 's', v: reg.et||'', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
        { t: 's', v: '', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
        { t: 's', v: reg.st||'', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
        { t: 's', v: '', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
        { t: 'n', v: horas, s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }, alignment: { horizontal: 'center' } } },
        { t: 's', v: '', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } },
        { t: 's', v: reg.obs||'', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } }
      ];
      wsData.push(row);
    }
    
    // Pie
    wsData.push([]);
    wsData.push([
      { t: 's', v: 'Fdo. La Empresa', s: { alignment: { horizontal: 'center' } } },
      { t: 's', v: '' }, { t: 's', v: '' }, { t: 's', v: '' }, { t: 's', v: '' },
      { t: 's', v: 'Fdo. Trabajador/a', s: { alignment: { horizontal: 'center' } } },
      { t: 's', v: '' }, { t: 's', v: '' }, { t: 's', v: '' },
      { t: 's', v: `Total horas: ${totalHoras}`, s: { font: { bold: true } } },
      { t: 's', v: '' }, { t: 's', v: '' }
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
      { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 20 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, nombresMeses[mes]);
  }
  
  // Descargar
  const fileName = `${anioActual}_REGISTRO_JORNADA.xlsx`;
  XLSX.writeFile(wb, fileName);
}

init();
