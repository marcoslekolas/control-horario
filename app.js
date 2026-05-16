document.addEventListener('DOMContentLoaded', function() {
  // Estado inicial
  let mes = new Date().getMonth();
  let anio = new Date().getFullYear();
  let datos = JSON.parse(localStorage.getItem('horario_datos') || '{}');
  let cfg = datos.cfg || { empresa:'', cif:'', ccc:'', trabajador:'', nif:'', naf:'' };

  // Referencias DOM
  const tbody = document.getElementById('tbody-calendario');
  const mesLabel = document.getElementById('mes-actual');
  const nombresMeses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

  // Funciones auxiliares
  function guardarDatos() {
    datos.cfg = cfg;
    localStorage.setItem('horario_datos', JSON.stringify(datos));
  }

  function claveMes() {
    return anio + '-' + String(mes + 1).padStart(2, '0');
  }

  function calcularHoras(r) {
    if (!r.em || !r.sm) return 0;
    let total = 0;
    if (r.em && r.sm) {
      total += (new Date('2000-01-01T' + r.sm) - new Date('2000-01-01T' + r.em)) / 3600000;
    }
    if (r.et && r.st) {
      total += (new Date('2000-01-01T' + r.st) - new Date('2000-01-01T' + r.et)) / 3600000;
    }
    return Math.round(total * 10) / 10;
  }

  // Renderizar tabla
  function renderizar() {
    mesLabel.textContent = nombresMeses[mes] + ' ' + anio;
    tbody.innerHTML = '';
    const dias = new Date(anio, mes + 1, 0).getDate();
    const km = claveMes();
    if (!datos[km]) datos[km] = {};

    for (let d = 1; d <= dias; d++) {
      const kd = String(d).padStart(2, '0');
      if (!datos[km][kd]) {
        const diaSem = new Date(anio, mes, d).getDay();
        datos[km][kd] = (diaSem >= 1 && diaSem <= 5)
          ? { em: '09:00', sm: '14:00', et: '16:00', st: '18:00', h: 8, o: '' }
          : { em: '', sm: '', et: '', st: '', h: 0, o: '' };
      }
      const r = datos[km][kd];

      const tr = document.createElement('tr');
      tr.innerHTML = 
        '<td><strong>' + d + '</strong></td>' +
        '<td><input type="time" value="' + (r.em || '') + '" data-f="em" data-d="' + kd + '"></td>' +
        '<td><input type="time" value="' + (r.sm || '') + '" data-f="sm" data-d="' + kd + '"></td>' +
        '<td><input type="time" value="' + (r.et || '') + '" data-f="et" data-d="' + kd + '"></td>' +
        '<td><input type="time" value="' + (r.st || '') + '" data-f="st" data-d="' + kd + '"></td>' +
        '<td><strong>' + (r.h || 0) + 'h</strong></td>' +
        '<td><input type="text" value="' + (r.o || '') + '" data-f="o" data-d="' + kd + '" placeholder="Obs."></td>';
      tbody.appendChild(tr);
    }

    // Eventos inputs
    tbody.querySelectorAll('input').forEach(function(inp) {
      inp.onchange = function(e) {
        const kd = e.target.dataset.d;
        const campo = e.target.dataset.f;
        const val = e.target.value;
        datos[km][kd][campo] = val;
        if (campo !== 'o') {
          datos[km][kd].h = calcularHoras(datos[km][kd]);
          const row = e.target.closest('tr');
          if (row) row.querySelector('td:nth-child(6) strong').textContent = (datos[km][kd].h || 0) + 'h';
        }
        guardarDatos();
      };
    });
  }

  // Navegación
  document.getElementById('btn-prev').onclick = function() {
    mes--; if (mes < 0) { mes = 11; anio--; }
    renderizar();
  };
  document.getElementById('btn-next').onclick = function() {
    mes++; if (mes > 11) { mes = 0; anio++; }
    renderizar();
  };

  // Configuración
  document.getElementById('btn-config').onclick = function() {
    document.getElementById('cfg-empresa').value = cfg.empresa;
    document.getElementById('cfg-cif').value = cfg.cif;
    document.getElementById('cfg-ccc').value = cfg.ccc;
    document.getElementById('cfg-trabajador').value = cfg.trabajador;
    document.getElementById('cfg-nif').value = cfg.nif;
    document.getElementById('cfg-naf').value = cfg.naf;
    document.getElementById('modal-config').showModal();
  };
  document.getElementById('form-config').onsubmit = function(e) {
    e.preventDefault();
    cfg.empresa = document.getElementById('cfg-empresa').value;
    cfg.cif = document.getElementById('cfg-cif').value;
    cfg.ccc = document.getElementById('cfg-ccc').value;
    cfg.trabajador = document.getElementById('cfg-trabajador').value;
    cfg.nif = document.getElementById('cfg-nif').value;
    cfg.naf = document.getElementById('cfg-naf').value;
    guardarDatos();
    document.getElementById('modal-config').close();
    renderizar();
  };
  document.getElementById('btn-cancelar').onclick = function() {
    document.getElementById('modal-config').close();
  };

  // Backup / Restaurar
  document.getElementById('btn-export').onclick = function() {
    const blob = new Blob([JSON.stringify(datos, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup_horario_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  document.getElementById('btn-import').onclick = function() {
    document.getElementById('file-import').click();
  };
  document.getElementById('file-import').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported.cfg) throw new Error('Falta configuración');
        datos = imported;
        cfg = datos.cfg || cfg;
        guardarDatos();
        renderizar();
        alert('✅ Datos restaurados correctamente');
      } catch (err) {
        alert('❌ Error al importar: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Generar Excel (SheetJS)
  document.getElementById('btn-generar').onclick = function() {
    if (typeof XLSX === 'undefined') {
      alert('⚠️ Librería no cargada. Recarga la página o verifica tu conexión.');
      return;
    }
    const wb = XLSX.utils.book_new();
    for (let m = 0; m < 12; m++) {
      const km = anio + '-' + String(m + 1).padStart(2, '0');
      const dias = new Date(anio, m + 1, 0).getDate();
      const rm = datos[km] || {};
      const wsData = [];
      wsData.push(['REGISTRO DIARIO DE JORNADA']);
      wsData.push(['En cumplimiento de la obligación establecida en el artículo 34.9 del Estatuto de los Trabajadores']);
      wsData.push([]);
      wsData.push(['EMPRESA:', cfg.empresa, '', 'C.I.F.', cfg.cif, '', 'C.C.C.', cfg.ccc, '', '', 'MES:', nombresMeses[m] + ' ' + anio]);
      wsData.push(['TRABAJADOR/A:', cfg.trabajador, '', 'N.I.F', cfg.nif, '', 'N.A.F', cfg.naf, '', '', 'AÑO:', anio]);
      wsData.push([]);
      wsData.push(['DÍA', 'HORARIO DE MAÑANA', '', '', '', 'HORARIO DE TARDE', '', '', '', '', 'HORAS ORDINARIAS', 'HORAS EXTRAORD.', 'OBSEVACIONES']);
      wsData.push(['DÍA', 'H. ENTRADA', 'FIRMA', 'H. SALIDA', 'FIRMA', 'H. ENTRADA', 'FIRMA', 'H. SALIDA', 'FIRMA', '', 'HORAS ORDINARIAS', 'HORAS EXTRAORD.', 'OBSEVACIONES']);

      let total = 0;
      for (let d = 1; d <= dias; d++) {
        const r = rm[String(d).padStart(2, '0')] || {};
        const h = r.h || 0;
        total += h;
        wsData.push([d, r.em||'', '', r.sm||'', '', r.et||'', '', r.st||'', '', '', h, '', r.o||'']);
      }
      wsData.push([]);
      wsData.push(['Fdo. La Empresa', '', '', '', '', 'Fdo. Trabajador/a', '', '', '', '', 'Total: ' + total + 'h', '', '']);

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{wch:5},{wch:11},{wch:15},{wch:11},{wch:15},{wch:11},{wch:15},{wch:11},{wch:15},{wch:3},{wch:14},{wch:14},{wch:20}];
      ws['!merges'] = [
        {s:{r:6,c:1}, e:{r:6,c:4}},
        {s:{r:6,c:5}, e:{r:6,c:9}}
      ];
      XLSX.utils.book_append_sheet(wb, ws, nombresMeses[m]);
    }
    XLSX.writeFile(wb, anio + '_CONTROL_HORARIO.xlsx');
  };

  // Inicio
  renderizar();
});
