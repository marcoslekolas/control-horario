document.addEventListener('DOMContentLoaded', () => {
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

  function init() {
    actualizarInfoTrabajador();
    renderizarMes();
    setupEventListeners();
  }

  function setupEventListeners() {
    document.getElementById('btn-prev').onclick = () => { mesActual--; if(mesActual<0){mesActual=11; anioActual--;} renderizarMes(); };
    document.getElementById('btn-next').onclick = () => { mesActual++; if(mesActual>11){mesActual=0; anioActual++;} renderizarMes(); };

    document.getElementById('btn-config').onclick = () => {
      document.getElementById('cfg-empresa').value = config.empresa;
      document.getElementById('cfg-cif').value = config.cif;
      document.getElementById('cfg-ccc').value = config.ccc;
      document.getElementById('cfg-trabajador').value = config.trabajador;
      document.getElementById('cfg-nif').value = config.nif;
      document.getElementById('cfg-naf').value = config.naf;
      modalConfig.showModal();
    };

    document.getElementById('form-config').onsubmit = (e) => {
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
    };

    document.getElementById('btn-cancelar').onclick = () => modalConfig.close();
    document.getElementById('btn-cancelar-gen').onclick = () => modalGenerar.close();

    document.getElementById('btn-export').onclick = exportarBackup;
    document.getElementById('btn-import').onclick = () => fileImport.click();
    fileImport.onchange = importarBackup;

    document.getElementById('btn-generar-anual').onclick = () => {
      document.getElementById('anio-generar').textContent = anioActual;
      modalGenerar.showModal();
    };
    document.getElementById('btn-confirmar-gen').onclick = () => { generarExcelAnual(); modalGenerar.close(); };
  }

  function actualizarInfoTrabajador() {
    infoTrabajador.textContent = (config.trabajador && config.empresa) ? `${config.trabajador} - ${config.empresa}` : '⚠️ Configura datos de empresa/trabajador';
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

      if (!datos[claveMes][claveDia]) {
        datos[claveMes][claveDia] = (diaSem >= 1 && diaSem <= 5) ? { ...presetHorarios.completa } : { ...presetHorarios.libre };
      }
      const reg = datos[claveMes][claveDia];

      const tr = document.createElement('tr');
      tr.className = reg.obs?.includes('FESTIVO') ? 'festivo' : reg.obs?.includes('VACACIONES') ? 'vacaciones' : ((diaSem === 0 || diaSem === 6) && reg.horas > 0) ? 'guardia' : '';

      tr.innerHTML = `
        <td><strong>${d}</strong><br><small>${diasSemana[diaSem]}</small></td>
        <td>
          <select data-accion="tipo" data-dia="${d}">
            <option value="completa" ${reg.horas===8 && reg.et?'selected':''}>8h (9-14/16-18)</option>
            <option value="manana" ${reg.horas===5?'selected':''}>5h (9-14)</option>
            <option value="ochoa15" ${reg.horas===7?'selected':''}>7h (8-15)</option>
            <option value="festivo" ${reg.obs?.includes('FESTIVO')?'selected':''}>Festivo</option>
            <option value="vacaciones" ${reg.obs?.includes('VACACIONES')?'selected':''}>Vacaciones</option>
            <option value="libre" ${!reg.em && !reg.obs?'selected':''}>Libre</option>
          </select>
        </td>
        <td><input type="time" value="${reg.em||''}" data-accion="hora" data-dia="${d}" data-campo="em"></td>
        <td><input type="time" value="${reg.sm||''}" data-accion="hora" data-dia="${d}" data-campo="sm"></td>
        <td><input type="time" value="${reg.et||''}" data-accion="hora" data-dia="${d}" data-campo="et"></td>
        <td><input type="time" value="${reg.st||''}" data-accion="hora" data-dia="${d}" data-campo="st"></td>
        <td><strong>${reg.horas||0}h</strong></td>
        <td><input type="text" value="${reg.obs||''}" data-accion="obs" data-dia="${d}" placeholder="Obs."></td>
      `;
      tbody.appendChild(tr);
    }
    guardarLocal();
    adjuntarEventosTabla();
  }

  function adjuntarEventosTabla() {
    tbody.querySelectorAll('[data-accion="tipo"]').forEach(el => {
      el.onchange = (e) => {
        const dia = String(e.target.dataset.dia).padStart(2,'0');
        const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
        datos[claveMes][dia] = { ...presetHorarios[e.target.value] };
        guardarLocal(); renderizarMes();
      };
    });
    tbody.querySelectorAll('[data-accion="hora"]').forEach(el => {
      el.onchange = (e) => {
        const dia = String(e.target.dataset.dia).padStart(2,'0');
        const campo = e.target.dataset.campo;
        const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
        datos[claveMes][dia][campo] = e.target.value;
        guardarLocal();
      };
    });
    tbody.querySelectorAll('[data-accion="obs"]').forEach(el => {
      el.onchange = (e) => {
        const dia = String(e.target.dataset.dia).padStart(2,'0');
        const claveMes = `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;
        datos[claveMes][dia].obs = e.target.value;
        guardarLocal();
      };
    });
  }

  function exportarBackup() {
    try {
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_horario_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch(e) { alert('Error al crear backup'); }
  }

  function importarBackup(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if(!imported.config) throw new Error('Falta configuración');
        datos = imported;
        config = datos.config || config;
        guardarLocal();
        actualizarInfoTrabajador();
        renderizarMes();
        alert('✅ Datos restaurados correctamente');
      } catch(err) { alert('❌ Error al importar: ' + err.message); }
    };
    reader.readAsText(file);
    file.value = '';
  }

  function generarExcelAnual() {
    try {
      const wb = XLSX.utils.book_new();
      for(let mes=0; mes<12; mes++) {
        const claveMes = `${anioActual}-${String(mes+1).padStart(2,'0')}`;
        const diasEnMes = new Date(anioActual, mes + 1, 0).getDate();
        const registrosMes = datos[claveMes] || {};
        const wsData = [
          ['REGISTRO DIARIO DE JORNADA'],
          ['En cumplimiento del art. 34.9 ET'],
          [],
          ['EMPRESA:', config.empresa, '', 'C.I.F.', config.cif, '', 'C.C.C.', config.ccc, '', '', 'MES', nombresMeses[mes] + ' ' + anioActual],
          ['TRABAJADOR/A:', config.trabajador, '', 'N.I.F', config.nif, '', 'N.A.F', config.naf, '', '', 'AÑO', anioActual],
          [],
          ['DÍA','H. ENTRADA','FIRMA','H. SALIDA','FIRMA','H. ENTRADA','FIRMA','H. SALIDA','FIRMA','HORAS ORD.','HORAS EXTRA.','OBSERVACIONES']
        ];

        let totalHoras = 0;
        for(let d=1; d<=diasEnMes; d++) {
          const reg = registrosMes[String(d).padStart(2,'0')] || {};
          const horas = reg.horas || 0;
          totalHoras += horas;
          wsData.push([d, reg.em||'', '', reg.sm||'', '', reg.et||'', '', reg.st||'', '', horas, '', reg.obs||'']);
        }
        wsData.push([]);
        wsData.push(['Fdo. La Empresa', '', '', '', '', 'Fdo. Trabajador/a', '', '', '', `Total: ${totalHoras}h`, '', '']);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{wch:5},{wch:10},{wch:8},{wch:10},{wch:8},{wch:10},{wch:8},{wch:10},{wch:8},{wch:10},{wch:12},{wch:20}];
        XLSX.utils.book_append_sheet(wb, ws, nombresMeses[mes]);
      }
      XLSX.writeFile(wb, `${anioActual}_CONTROL_HORARIO.xlsx`);
    } catch(e) { alert('Error generando Excel: ' + e.message); }
  }

  init();
});

init();
