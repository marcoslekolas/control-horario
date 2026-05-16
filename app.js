// Diagnóstico inicial
window.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status-bar');
  status.style.display = 'block';
  status.textContent = '✅ JavaScript cargado correctamente. Verificando elementos...';
  
  // Verificar carga de librería Excel
  if (typeof XLSX === 'undefined') {
    status.textContent = '⚠️ SheetJS no cargado. El Excel no funcionará. Recarga con Ctrl+F5.';
    status.style.background = '#fef2f2'; status.style.color = '#b91c1c';
  }

  // Estado
  let mesActual = new Date().getMonth();
  let anioActual = new Date().getFullYear();
  let datos = JSON.parse(localStorage.getItem('controlHorario') || '{}');
  let cfg = datos.cfg || {empresa:'',cif:'',ccc:'',trabajador:'',nif:'',naf:'',tipo:'partido'};

  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const presets = {
    partido: {em:'09:00',sm:'14:00',et:'16:00',st:'18:00',h:8,o:''},
    continuo: {em:'08:00',sm:'15:00',et:'',st:'',h:7,o:''},
    festivo: {em:'',sm:'',et:'',st:'',h:0,o:'FESTIVO'},
    guardia: {em:'',sm:'',et:'',st:'',h:8,o:'GUARDIA'},
    vacaciones: {em:'',sm:'',et:'',st:'',h:0,o:'VACACIONES'},
    libre: {em:'',sm:'',et:'',st:'',h:0,o:''}
  };

  function guardar() {
    datos.cfg = cfg;
    localStorage.setItem('controlHorario', JSON.stringify(datos));
  }

  function claveM() { return `${anioActual}-${String(mesActual+1).padStart(2,'0')}`; }

  function render() {
    document.getElementById('mesActual').textContent = `${meses[mesActual]} ${anioActual}`;
    const tbody = document.getElementById('tbodyCalendario');
    tbody.innerHTML = '';
    const dias = new Date(anioActual, mesActual+1, 0).getDate();
    const km = claveM();
    if (!datos.meses) datos.meses = {};
    if (!datos.meses[km]) datos.meses[km] = {};

    let tH=0, tE=0, tC=0;
    for (let d=1; d<=dias; d++) {
      const kd = String(d).padStart(2,'0');
      if (!datos.meses[km][kd]) {
        datos.meses[km][kd] = (new Date(anioActual,mesActual,d).getDay()>=1 && new Date(anioActual,mesActual,d).getDay()<=5) 
          ? {...presets[cfg.tipo]} : {...presets.libre};
      }
      const r = datos.meses[km][kd];
      const clase = r.o?.includes('FESTIVO')?'festivo':r.o?.includes('GUARDIA')?'guardia':r.o?.includes('VACACIONES')?'vacaciones':'';
      const tr = document.createElement('tr');
      tr.className = clase;
      tr.innerHTML = `
        <td><strong>${d}</strong></td>
        <td><input type="time" data-k="${kd}" data-f="em" value="${r.em||''}"></td>
        <td><input type="time" data-k="${kd}" data-f="sm" value="${r.sm||''}"></td>
        <td><input type="time" data-k="${kd}" data-f="et" value="${r.et||''}"></td>
        <td><input type="time" data-k="${kd}" data-f="st" value="${r.st||''}"></td>
        <td><input type="number" class="h-total" data-k="${kd}" value="${r.h||0}" readonly></td>
        <td><input type="number" data-k="${kd}" data-f="ex" value="${r.ex||0}" min="0" step="0.5"></td>
        <td><input type="number" data-k="${kd}" data-f="co" value="${r.co||0}" min="0" step="0.5"></td>
        <td>
          <select data-k="${kd}" data-f="o">
            <option value="">─</option>
            <option value="FESTIVO" ${r.o==='FESTIVO'?'selected':''}>🎉 Festivo</option>
            <option value="GUARDIA" ${r.o==='GUARDIA'?'selected':''}>🔔 Guardia</option>
            <option value="VACACIONES" ${r.o==='VACACIONES'?'selected':''}>🏖️ Vacaciones</option>
            <option value="" ${!r.o?'selected':''}>📭 Normal</option>
          </select>
        </td>
      `;
      tbody.appendChild(tr);
      tH += r.h||0; tE += r.ex||0; tC += r.co||0;
    }
    document.getElementById('totalHorasMes').textContent = tH.toFixed(1);
    document.getElementById('totalExtras').textContent = tE.toFixed(1);
    document.getElementById('totalComplem').textContent = tC.toFixed(1);

    // Eventos inputs
    tbody.querySelectorAll('input, select').forEach(el => {
      el.onchange = e => {
        const k = e.target.dataset.k, f = e.target.dataset.f;
        if (!datos.meses[km][k]) datos.meses[km][k] = {};
        datos.meses[km][k][f] = e.target.value;
        if (f==='em'||f==='sm'||f==='et'||f==='st'||f==='o') {
          // Recalcular horas si cambió hora o observación
          const reg = datos.meses[km][k];
          if (reg.o && (reg.o.includes('FESTIVO')||reg.o.includes('VACACIONES'))) {
            reg.h = 0;
          } else {
            let h=0;
            if(reg.em&&reg.sm) h+=(new Date(`2000-01-01T${reg.sm}`)-new Date(`2000-01-01T${reg.em}`))/36e5;
            if(reg.et&&reg.st) h+=(new Date(`2000-01-01T${reg.st}`)-new Date(`2000-01-01T${reg.et}`))/36e5;
            reg.h = Math.round(h*10)/10;
          }
          tbody.querySelector(`tr td:nth-child(6) input[data-k="${k}"]`).value = reg.h;
        }
        render(); guardar();
      };
    });
    guardar();
    status.textContent = '✅ Interfaz renderizada. Botones activos.';
  }

  // Cargar config
  document.getElementById('empresa').value = cfg.empresa;
  document.getElementById('cif').value = cfg.cif;
  document.getElementById('ccc').value = cfg.ccc;
  document.getElementById('trabajador').value = cfg.trabajador;
  document.getElementById('nif').value = cfg.nif;
  document.getElementById('naf').value = cfg.naf;
  document.getElementById('tipoJornada').value = cfg.tipo;

  // Botones
  document.getElementById('btnPrev').onclick = () => { mesActual--; if(mesActual<0){mesActual=11;anioActual--;} render(); };
  document.getElementById('btnNext').onclick = () => { mesActual++; if(mesActual>11){mesActual=0;anioActual++;} render(); };
  
  document.getElementById('btnGuardarConfig').onclick = () => {
    cfg.empresa = document.getElementById('empresa').value;
    cfg.cif = document.getElementById('cif').value;
    cfg.ccc = document.getElementById('ccc').value;
    cfg.trabajador = document.getElementById('trabajador').value;
    cfg.nif = document.getElementById('nif').value;
    cfg.naf = document.getElementById('naf').value;
    cfg.tipo = document.getElementById('tipoJornada').value;
    guardar(); status.textContent = '✅ Configuración guardada';
  };

  document.getElementById('btnAutocompletar').onclick = () => {
    const km = claveM(), dias = new Date(anioActual, mesActual+1, 0).getDate();
    for(let d=1; d<=dias; d++) {
      const kd = String(d).padStart(2,'0'), ds = new Date(anioActual,mesActual,d).getDay();
      if (!datos.meses[km][kd]?.em) { // Solo si está vacío
        datos.meses[km][kd] = (ds>=1 && ds<=5) ? {...presets[cfg.tipo]} : {...presets.libre};
      }
    }
    render(); status.textContent = `✅ Mes autocompletado (${cfg.tipo==='partido'?'Partido':'Continuo'})`;
  };

  document.getElementById('btnGuardar').onclick = () => { guardar(); status.textContent = '✅ Datos guardados en navegador'; };

  document.getElementById('btnBackup').onclick = () => {
    const b = new Blob([JSON.stringify(datos,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    status.textContent = '✅ Backup descargado';
  };

  document.getElementById('btnRestore').onclick = () => document.getElementById('fileRestore').click();
  document.getElementById('fileRestore').onchange = e => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = ev => {
      try { datos = JSON.parse(ev.target.result); cfg = datos.cfg || cfg; guardar(); render(); status.textContent = '✅ Restaurado'; } 
      catch(err) { status.textContent = '❌ Error: '+err.message; }
    }; r.readAsText(f); e.target.value='';
  };

  document.getElementById('btnExcel').onclick = () => {
    if (typeof XLSX === 'undefined') { alert('Librería no cargada. Recarga la página.'); return; }
    const wb = XLSX.utils.book_new();
    const km = claveM(), dias = new Date(anioActual, mesActual+1, 0).getDate();
    const wsData = [
      ['REGISTRO DIARIO DE JORNADA'],
      ['Art. 34.9 ET - RDL 8/2019'], [],
      ['EMPRESA:', cfg.empresa, 'CIF:', cfg.cif, 'CCC:', cfg.ccc, 'MES:', `${meses[mesActual]} ${anioActual}`],
      ['TRABAJADOR:', cfg.trabajador, 'NIF:', cfg.nif, 'NAF:', cfg.naf, 'AÑO:', anioActual], [],
      ['DÍA','ENTRADA M.','SALIDA M.','ENTRADA T.','SALIDA T.','TOTAL H.','EXTRAS','COMPL.','OBSERVACIONES']
    ];
    let tH=0, tE=0, tC=0;
    for(let d=1; d<=dias; d++) {
      const r = datos.meses[km]?.[String(d).padStart(2,'0')] || {};
      wsData.push([d, r.em||'', r.sm||'', r.et||'', r.st||'', r.h||0, r.ex||0, r.co||0, r.o||'']);
      tH+=r.h||0; tE+=r.ex||0; tC+=r.co||0;
    }
    wsData.push([],['TOTAL MES','','','','',tH,tE,tC,'']);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{wch:6},{wch:10},{wch:10},{wch:10},{wch:10},{wch:8},{wch:8},{wch:8},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws, meses[mesActual]);
    XLSX.writeFile(wb, `${cfg.trabajador||'TRABAJADOR'}_${anioActual}_${String(mesActual+1).padStart(2,'0')}.xlsx`);
    status.textContent = '✅ Excel generado';
  };

  // Iniciar
  render();
});
