document.addEventListener('DOMContentLoaded', function() {
  // Estado global
  let mesActual = new Date().getMonth();
  let anioActual = new Date().getFullYear();
  let datos = JSON.parse(localStorage.getItem('controlHorarioDatos') || '{}');
  
  // Configuración por defecto
  let config = datos.config || { 
    empresa: '', cif: '', ccc: '', 
    trabajador: '', nif: '', naf: '',
    tipoJornada: 'partido' // 'partido' o 'continuo'
  };

  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

  // Horarios predefinidos
  const horarios = {
    partido: { em: '09:00', sm: '14:00', et: '16:00', st: '18:00', horas: 8 },
    continuo: { em: '08:00', sm: '15:00', et: '', st: '', horas: 7 },
    festivo: { em: '', sm: '', et: '', st: '', horas: 0, obs: 'FESTIVO' },
    guardia: { em: '', sm: '', et: '', st: '', horas: 8, obs: 'GUARDIA' },
    vacaciones: { em: '', sm: '', et: '', st: '', horas: 0, obs: 'VACACIONES' },
    libre: { em: '', sm: '', et: '', st: '', horas: 0, obs: '' }
  };

  // Inicialización
  cargarConfiguracion();
  renderizarCalendario();
  setupEventListeners();

  // ==================== EVENT LISTENERS ====================
  function setupEventListeners() {
    // Navegación entre meses
    document.getElementById('btnPrev').addEventListener('click', function() {
      mesActual--; if (mesActual < 0) { mesActual = 11; anioActual--; }
      renderizarCalendario();
    });
    document.getElementById('btnNext').addEventListener('click', function() {
      mesActual++; if (mesActual > 11) { mesActual = 0; anioActual++; }
      renderizarCalendario();
    });

    // Guardar configuración
    document.getElementById('btnGuardarConfig').addEventListener('click', guardarConfiguracion);
    
    // Autocompletar mes
    document.getElementById('btnAutocompletar').addEventListener('click', autocompletarMes);
    
    // Guardar datos del mes
    document.getElementById('btnGuardar').addEventListener('click', function() {
      guardarDatosMes();
      alert('✅ Datos guardados correctamente');
    });
    
    // Generar Excel
    document.getElementById('btnExcel').addEventListener('click', generarExcel);
    
    // Backup/Restore
    document.getElementById('btnBackup').addEventListener('click', crearBackup);
    document.getElementById('btnRestore').addEventListener('click', function() {
      document.getElementById('fileRestore').click();
    });
    document.getElementById('fileRestore').addEventListener('change', restaurarBackup);

    // Selector de tipo de jornada
    document.getElementById('tipoJornada').addEventListener('change', function() {
      config.tipoJornada = this.value;
      guardarConfiguracion();
    });
  }

  // ==================== FUNCIONES PRINCIPALES ====================
  
  function cargarConfiguracion() {
    document.getElementById('empresa').value = config.empresa || '';
    document.getElementById('cif').value = config.cif || '';
    document.getElementById('ccc').value = config.ccc || '';
    document.getElementById('trabajador').value = config.trabajador || '';
    document.getElementById('nif').value = config.nif || '';
    document.getElementById('naf').value = config.naf || '';
    document.getElementById('tipoJornada').value = config.tipoJornada || 'partido';
  }

  function guardarConfiguracion() {
    config = {
      empresa: document.getElementById('empresa').value,
      cif: document.getElementById('cif').value,
      ccc: document.getElementById('ccc').value,
      trabajador: document.getElementById('trabajador').value,
      nif: document.getElementById('nif').value,
      naf: document.getElementById('naf').value,
      tipoJornada: document.getElementById('tipoJornada').value
    };
    if (!datos.config) datos.config = {};
    Object.assign(datos.config, config);
    localStorage.setItem('controlHorarioDatos', JSON.stringify(datos));
    alert('✅ Configuración guardada');
  }

  function claveMes() {
    return `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  }

  function renderizarCalendario() {
    document.getElementById('mesActual').textContent = `${meses[mesActual]} ${anioActual}`;
    const tbody = document.getElementById('tbodyCalendario');
    tbody.innerHTML = '';
    
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
    const km = claveMes();
    if (!datos.meses) datos.meses = {};
    if (!datos.meses[km]) datos.meses[km] = {};
    
    let totalHoras = 0, totalExtras = 0, totalComplem = 0;

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const kd = String(dia).padStart(2, '0');
      const diaSem = new Date(anioActual, mesActual, dia).getDay();
      
      // Inicializar registro si no existe
      if (!datos.meses[km][kd]) {
        if (diaSem >= 1 && diaSem <= 5) {
          datos.meses[km][kd] = config.tipoJornada === 'partido' 
            ? {...horarios.partido} 
            : {...horarios.continuo};
        } else {
          datos.meses[km][kd] = {...horarios.libre};
        }
      }
      
      const reg = datos.meses[km][kd];
      const esFinde = (diaSem === 0 || diaSem === 6);
      const claseFila = reg.obs === 'FESTIVO' ? 'festivo' : reg.obs === 'VACACIONES' ? 'vacaciones' : reg.obs === 'GUARDIA' ? 'guardia' : esFinde ? 'finde' : '';

      const tr = document.createElement('tr');
      tr.className = claseFila;
      tr.innerHTML = `
        <td class="dia-celda"><strong>${dia}</strong><br><small>${diasSemana[diaSem].slice(0,3)}</small></td>
        <td><input type="time" class="em" value="${reg.em||''}" data-d="${kd}" data-f="em"></td>
        <td><input type="time" class="sm" value="${reg.sm||''}" data-d="${kd}" data-f="sm"></td>
        <td><input type="time" class="et" value="${reg.et||''}" data-d="${kd}" data-f="et"></td>
        <td><input type="time" class="st" value="${reg.st||''}" data-d="${kd}" data-f="st"></td>
        <td><input type="number" class="total-h" value="${reg.horas||''}" step="0.5" min="0" data-d="${kd}" data-f="horas" readonly></td>
        <td><input type="number" class="extras" value="${reg.horasExtras||''}" step="0.5" min="0" data-d="${kd}" data-f="horasExtras"></td>
        <td><input type="number" class="complem" value="${reg.horasComplem||''}" step="0.5" min="0" data-d="${kd}" data-f="horasComplem"></td>
        <td>
          <select class="accion" data-d="${kd}">
            <option value="">─</option>
            <option value="festivo" ${reg.obs==='FESTIVO'?'selected':''}>🎉 Festivo</option>
            <option value="guardia" ${reg.obs==='GUARDIA'?'selected':''}>🔔 Guardia</option>
            <option value="vacaciones" ${reg.obs==='VACACIONES'?'selected':''}>🏖️ Vacaciones</option>
            <option value="libre" ${!reg.obs && !reg.em?'selected':''}>📭 Libre</option>
          </select>
        </td>
      `;
      tbody.appendChild(tr);
      
      totalHoras += parseFloat(reg.horas) || 0;
      totalExtras += parseFloat(reg.horasExtras) || 0;
      totalComplem += parseFloat(reg.horasComplem) || 0;
    }

    // Actualizar totales
    document.getElementById('totalHorasMes').textContent = totalHoras.toFixed(1);
    document.getElementById('totalExtras').textContent = totalExtras.toFixed(1);
    document.getElementById('totalComplem').textContent = totalComplem.toFixed(1);

    // Event listeners para inputs
    tbody.querySelectorAll('input[type="time"], input[type="number"]').forEach(inp => {
      inp.addEventListener('change', function() {
        const kd = this.dataset.d, f = this.dataset.f;
        if (!datos.meses[km][kd]) datos.meses[km][kd] = {};
        datos.meses[km][kd][f] = this.value;
        if (['em','sm','et','st'].includes(f)) {
          datos.meses[km][kd].horas = calcularHoras(datos.meses[km][kd]);
          this.closest('tr').querySelector('.total-h').value = datos.meses[km][kd].horas;
        }
        actualizarTotales();
        guardarEnMemoria();
      });
    });

    tbody.querySelectorAll('.accion').forEach(sel => {
      sel.addEventListener('change', function() {
        const kd = this.value, accion = this.dataset.d;
        if (!datos.meses[km][accion]) datos.meses[km][accion] = {};
        if (accion) {
          Object.assign(datos.meses[km][accion], horarios[accion]);
        }
        renderizarCalendario();
        guardarEnMemoria();
      });
    });
  }

  function calcularHoras(reg) {
    let h = 0;
    if (reg.em && reg.sm) h += (new Date(`2000-01-01T${reg.sm}`) - new Date(`2000-01-01T${reg.em}`)) / 3600000;
    if (reg.et && reg.st) h += (new Date(`2000-01-01T${reg.st}`) - new Date(`2000-01-01T${reg.et}`)) / 3600000;
    return Math.round(h * 10) / 10;
  }

  function actualizarTotales() {
    const km = claveMes(), regs = datos.meses[km] || {};
    let th=0, te=0, tc=0;
    Object.values(regs).forEach(r => { th+=parseFloat(r.horas)||0; te+=parseFloat(r.horasExtras)||0; tc+=parseFloat(r.horasComplem)||0; });
    document.getElementById('totalHorasMes').textContent = th.toFixed(1);
    document.getElementById('totalExtras').textContent = te.toFixed(1);
    document.getElementById('totalComplem').textContent = tc.toFixed(1);
  }

  function guardarEnMemoria() {
    if (!datos.config) datos.config = {};
    Object.assign(datos.config, config);
    localStorage.setItem('controlHorarioDatos', JSON.stringify(datos));
  }

  function guardarDatosMes() {
    guardarEnMemoria();
  }

  // ==================== AUTOCOMPLETAR MES ====================
  function autocompletarMes() {
    const km = claveMes();
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
    const tipo = config.tipoJornada;
    
    if (!datos.meses) datos.meses = {};
    if (!datos.meses[km]) datos.meses[km] = {};

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const kd = String(dia).padStart(2, '0');
      const ds = new Date(anioActual, mesActual, dia).getDay();
      
      // Solo autocompletar si está vacío o es día laborable sin datos
      if (!datos.meses[km][kd].em && !datos.meses[km][kd].obs) {
        if (ds >= 1 && ds <= 5) {
          // Lunes a Viernes: aplicar jornada seleccionada
          datos.meses[km][kd] = tipo === 'partido' ? {...horarios.partido} : {...horarios.continuo};
        } else {
          // Fin de semana: dejar libre por defecto
          datos.meses[km][kd] = {...horarios.libre};
        }
      }
    }
    
    renderizarCalendario();
    guardarEnMemoria();
    alert(`✅ Mes autocompletado con jornada ${tipo === 'partido' ? 'partida (9-14 / 16-18)' : 'continua (8-15)'}\n💡 Usa el selector de cada día para marcar Festivos, Guardias o Vacaciones`);
  }

  // ==================== GENERAR EXCEL PROFESIONAL ====================
  async function generarExcel() {
    if (typeof ExcelJS === 'undefined') {
      alert('⚠️ Librería no cargada. Recarga la página.');
      return;
    }
    
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Registro Jornada');
    const km = claveMes();
    const regs = datos.meses[km] || {};
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();

    // Estilos
    const borderThin = {top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}};
    const borderThick = {top:{style:'thick'},bottom:{style:'thick'},left:{style:'thick'},right:{style:'thick'}};
    const headerStyle = {font:{bold:true,size:11,color:{argb:'FFFFFFFF'}},fill:{type:'gradient',gradient:'angle',from:{argb:'FF667EEA'},to:{argb:'FF764BA2'}},alignment:{horizontal:'center',vertical:'middle',wrapText:true},border:borderThin};
    const cellStyle = {border:borderThin,alignment:{horizontal:'center',vertical:'middle'}};
    const labelStyle = {font:{bold:true,size:10},border:{bottom:{style:'thin'}}};

    // Título
    ws.mergeCells('A1:I1');
    const titulo = ws.getCell('A1');
    titulo.value = 'REGISTRO DIARIO DE JORNADA';
    titulo.font = {bold:true,size:16,color:{argb:'FFFFFFFF'}};
    titulo.fill = {type:'gradient',gradient:'angle',from:{argb:'FF667EEA'},to:{argb:'FF764BA2'}};
    titulo.alignment = {horizontal:'center'};
    titulo.border = borderThick;

    // Subtítulo legal
    ws.mergeCells('A2:I2');
    const sub = ws.getCell('A2');
    sub.value = 'Art. 34.9 ET - RDL 8/2019';
    sub.font = {italic:true,size:9};
    sub.alignment = {horizontal:'center'};
    sub.border = borderThin;

    // Datos empresa/trabajador
    ws.addRow([]);
    ws.addRow(['EMPRESA:', config.empresa||'', 'CIF:', config.cif||'', 'CCC:', config.ccc||'']);
    ws.addRow(['TRABAJADOR:', config.trabajador||'', 'NIF:', config.nif||'', 'NAF:', config.naf||'']);
    ws.addRow(['MES:', `${meses[mesActual]} ${anioActual}`]);
    
    for(let r=3;r<=6;r++) for(let c=1;c<=6;c++) {
      const cell = ws.getCell(r,c);
      cell.border = borderThin;
      if(c%2===1) cell.font = {bold:true};
    }

    ws.addRow([]);

    // Cabeceras tabla
    const h1 = ['DÍA','HORARIO MAÑANA','','HORARIO TARDE','','TOTAL','EXTRAS','COMPL.','FIRMA'];
    const h2 = ['DÍA','Entrada','Salida','Entrada','Salida','Horas','Horas','Horas','Trabajador'];
    
    const row1 = ws.addRow(h1);
    const row2 = ws.addRow(h2);
    
    ws.mergeCells(`B7:C7`); ws.mergeCells(`D7:E7`);
    
    for(let c=1;c<=9;c++) {
      row1.getCell(c).style = headerStyle;
      row2.getCell(c).style = headerStyle;
      if(c>=2&&c<=3) row1.getCell(c).fill = {type:'gradient',gradient:'angle',from:{argb:'FF4CAF50'},to:{argb:'FF45a049'}};
      if(c>=4&&c<=5) row1.getCell(c).fill = {type:'gradient',gradient:'angle',from:{argb:'FFFF9800'},to:{argb:'FFF57C00'}};
    }

    // Días
    let totalH=0, totalE=0, totalC=0;
    for(let d=1;d<=diasEnMes;d++) {
      const r = regs[String(d).padStart(2,'0')] || {};
      const horas = r.horas || 0;
      totalH += horas; totalE += parseFloat(r.horasExtras)||0; totalC += parseFloat(r.horasComplem)||0;
      
      const row = ws.addRow([d, r.em||'', r.sm||'', r.et||'', r.st||'', horas, r.horasExtras||'', r.horasComplem||'', r.obs||'']);
      row.eachCell(cell => {
        cell.style = cellStyle;
        if(d%2===0) cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFF8F9FF'}};
        if(r.obs) cell.font = {italic:true};
      });
    }

    // Fila totales
    const lastRow = 9 + diasEnMes;
    const totRow = ws.addRow(['TOTAL MES','','','','',totalH.toFixed(1),totalE.toFixed(1),totalC.toFixed(1),'']);
    totRow.eachCell(cell => {
      cell.font = {bold:true,size:12,color:{argb:'FFFFFFFF'}};
      cell.fill = {type:'gradient',gradient:'angle',from:{argb:'FF667EEA'},to:{argb:'FF764BA2'}};
      cell.border = borderThick;
      cell.alignment = {horizontal:'center'};
    });

    // Texto legal y firmas
    ws.addRow([]);
    const legal = [
      'Registro realizado en cumplimiento del Art. 34.9 del Estatuto de los Trabajadores (RDL 8/2019)',
      '"La empresa garantizará el registro diario de jornada, que deberá incluir el horario concreto de inicio y finalización"',
      'Conservación mínima: 4 años'
    ];
    legal.forEach(txt => {
      const row = ws.addRow([txt]);
      const cell = row.getCell(1);
      cell.merge(`A${ws.rowCount}:I${ws.rowCount}`);
      cell.font = {italic:txt!==legal[0],size:9,color:{argb:'FF555555'}};
      cell.alignment = {horizontal:'left',wrapText:true};
    });

    ws.addRow([]);
    const firmas = ws.addRow(['Firma Empresa: ____________________', '', '', '', '', '', '', '', 'Firma Trabajador: ____________________']);
    firmas.getCell(1).font = {bold:true};
    firmas.getCell(9).font = {bold:true};

    // Descargar
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `REGISTRO_${(config.trabajador||'TRABAJADOR').replace(/\s+/g,'_')}_${anioActual}_${String(mesActual+1).padStart(2,'0')}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('✅ Excel generado con formato profesional');
  }

  // ==================== BACKUP / RESTORE ====================
  function crearBackup() {
    const blob = new Blob([JSON.stringify(datos,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    alert('✅ Backup descargado');
  }

  function restaurarBackup(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        datos = JSON.parse(evt.target.result);
        config = datos.config || config;
        localStorage.setItem('controlHorarioDatos', JSON.stringify(datos));
        cargarConfiguracion(); renderizarCalendario();
        alert('✅ Backup restaurado');
      } catch(err) { alert('❌ Error: '+err.message); }
    };
    reader.readAsText(file); e.target.value = '';
  }
});
