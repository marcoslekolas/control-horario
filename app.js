// Ejecutar SOLO cuando toda la página y librerías estén cargadas
window.onload = function() {
  const loader = document.getElementById('loader');
  const errorBox = document.getElementById('error-box');
  const appContainer = document.getElementById('app-container');
  
  function showError(msg) {
    errorBox.innerHTML = `<strong>❌ Error de inicio:</strong><br>${msg}<br><small>Abre la consola (F12) para más detalles.</small>`;
    errorBox.style.display = 'block';
    loader.style.display = 'none';
    console.error(msg);
  }

  try {
    // 1. Verificar que ExcelJS se cargó
    if (typeof ExcelJS === 'undefined') {
      showError('No se ha cargado la librería ExcelJS.<br>1. Desactiva bloqueadores de anuncios/privacy.<br>2. Recarga con Ctrl+F5.<br>3. Si usas Brave/Edge, desactiva "Tracking Prevention" para este sitio.');
      return;
    }

    // 2. Estado inicial
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

    const getEl = id => document.getElementById(id);
    const save = () => { datos.cfg = cfg; localStorage.setItem('controlHorario', JSON.stringify(datos)); };
    const claveM = () => `${anioActual}-${String(mesActual+1).padStart(2,'0')}`;

    // 3. Cargar datos en inputs
    if(getEl('empresa')) getEl('empresa').value = cfg.empresa;
    if(getEl('cif')) getEl('cif').value = cfg.cif;
    if(getEl('ccc')) getEl('ccc').value = cfg.ccc;
    if(getEl('trabajador')) getEl('trabajador').value = cfg.trabajador;
    if(getEl('nif')) getEl('nif').value = cfg.nif;
    if(getEl('naf')) getEl('naf').value = cfg.naf;
    if(getEl('tipoJornada')) getEl('tipoJornada').value = cfg.tipo;

    // 4. Renderizar tabla
    function render() {
      if(getEl('mesActual')) getEl('mesActual').textContent = `${meses[mesActual]} ${anioActual}`;
      const tbody = getEl('tbodyCalendario');
      if(!tbody) return;
      tbody.innerHTML = '';
      const dias = new Date(anioActual, mesActual+1, 0).getDate();
      const km = claveM();
      if(!datos.meses) datos.meses = {};
      if(!datos.meses[km]) datos.meses[km] = {};

      let tH=0, tE=0, tC=0;
      for(let d=1; d<=dias; d++) {
        const kd = String(d).padStart(2,'0');
        if(!datos.meses[km][kd]) {
          const ds = new Date(anioActual, mesActual, d).getDay();
          datos.meses[km][kd] = (ds>=1 && ds<=5) ? {...presets[cfg.tipo]} : {...presets.libre};
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
          <td><select data-k="${kd}" data-f="o"><option value="">─</option><option value="FESTIVO" ${r.o==='FESTIVO'?'selected':''}>🎉 Festivo</option><option value="GUARDIA" ${r.o==='GUARDIA'?'selected':''}>🔔 Guardia</option><option value="VACACIONES" ${r.o==='VACACIONES'?'selected':''}>🏖️ Vacaciones</option><option value="" ${!r.o?'selected':''}>📭 Normal</option></select></td>
        `;
        tbody.appendChild(tr);
        tH+=r.h||0; tE+=r.ex||0; tC+=r.co||0;
      }
      if(getEl('totalHorasMes')) getEl('totalHorasMes').textContent = tH.toFixed(1);
      if(getEl('totalExtras')) getEl('totalExtras').textContent = tE.toFixed(1);
      if(getEl('totalComplem')) getEl('totalComplem').textContent = tC.toFixed(1);

      // Bind events
      tbody.querySelectorAll('input, select').forEach(el => {
        el.onchange = function(e) {
          const k = e.target.dataset.k, f = e.target.dataset.f;
          if(!datos.meses[km][k]) datos.meses[km][k] = {};
          datos.meses[km][k][f] = e.target.value;
          if(['em','sm','et','st','o'].includes(f)) {
            const reg = datos.meses[km][k];
            if(reg.o && (reg.o.includes('FESTIVO')||reg.o.includes('VACACIONES'))) reg.h = 0;
            else {
              let h=0;
              if(reg.em&&reg.sm) h+=(new Date(`2000-01-01T${reg.sm}`)-new Date(`2000-01-01T${reg.em}`))/36e5;
              if(reg.et&&reg.st) h+=(new Date(`2000-01-01T${reg.st}`)-new Date(`2000-01-01T${reg.et}`))/36e5;
              reg.h = Math.round(h*10)/10;
            }
            const row = e.target.closest('tr');
            if(row) row.querySelector('.h-total').value = reg.h;
          }
          render(); save();
        };
      });
      save();
    }

    // 5. Event listeners de botones
    if(getEl('btnPrev')) getEl('btnPrev').onclick = () => { mesActual--; if(mesActual<0){mesActual=11;anioActual--;} render(); };
    if(getEl('btnNext')) getEl('btnNext').onclick = () => { mesActual++; if(mesActual>11){mesActual=0;anioActual++;} render(); };
    
    if(getEl('btnGuardarConfig')) getEl('btnGuardarConfig').onclick = () => {
      cfg = {
        empresa: getEl('empresa').value, cif: getEl('cif').value, ccc: getEl('ccc').value,
        trabajador: getEl('trabajador').value, nif: getEl('nif').value, naf: getEl('naf').value,
        tipo: getEl('tipoJornada').value
      };
      save(); alert('✅ Configuración guardada');
    };

    if(getEl('btnAutocompletar')) getEl('btnAutocompletar').onclick = () => {
      const km = claveM(), dias = new Date(anioActual, mesActual+1, 0).getDate();
      for(let d=1; d<=dias; d++) {
        const kd = String(d).padStart(2,'0'), ds = new Date(anioActual,mesActual,d).getDay();
        if(!datos.meses[km][kd]?.em) datos.meses[km][kd] = (ds>=1 && ds<=5) ? {...presets[cfg.tipo]} : {...presets.libre};
      }
      render(); alert(`✅ Autocompletado (${cfg.tipo})`);
    };

    if(getEl('btnGuardar')) getEl('btnGuardar').onclick = () => { save(); alert('✅ Datos guardados'); };
    
    if(getEl('btnBackup')) getEl('btnBackup').onclick = () => {
      const b = new Blob([JSON.stringify(datos,null,2)],{type:'application/json'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    };

    if(getEl('btnRestore')) getEl('btnRestore').onclick = () => getEl('fileRestore').click();
    if(getEl('fileRestore')) getEl('fileRestore').onchange = e => {
      const f = e.target.files[0]; if(!f) return;
      const r = new FileReader(); r.onload = ev => {
        try { datos = JSON.parse(ev.target.result); cfg = datos.cfg || cfg; save(); render(); alert('✅ Restaurado'); } 
        catch(err) { alert('❌ Error: '+err.message); }
      }; r.readAsText(f); e.target.value='';
    };

    // 6. Generar Excel
    if(getEl('btnExcel')) getEl('btnExcel').onclick = async () => {
      const btn = getEl('btnExcel');
      btn.disabled = true; btn.textContent = '⏳ Generando...';
      try {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet(meses[mesActual]);
        const km = claveM(), dias = new Date(anioActual, mesActual+1, 0).getDate();
        const border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        const align = { horizontal:'center', vertical:'middle' };

        ws.addRow(['REGISTRO DIARIO DE JORNADA']).getCell(1).font = {bold:true, size:14}; ws.mergeCells('A1:I1');
        ws.addRow([`Empresa: ${cfg.empresa||''} | Trabajador: ${cfg.trabajador||''} | Mes: ${meses[mesActual]} ${anioActual}`]).mergeCells('A2:I2');
        ws.addRow(['DÍA','ENTRADA M.','SALIDA M.','ENTRADA T.','SALIDA T.','TOTAL H.','EXTRAS','COMPL.','OBSERVACIONES']);
        ws.getRow(3).eachCell(c => { c.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF667EEA'}}; c.font = {bold:true,color:{argb:'FFFFFFFF'}}; c.alignment = align; c.border = border; });

        let tH=0, tE=0, tC=0;
        for(let d=1; d<=dias; d++) {
          const r = datos.meses[km]?.[String(d).padStart(2,'0')] || {};
          const row = ws.addRow([d, r.em||'', r.sm||'', r.et||'', r.st||'', r.h||0, r.ex||0, r.co||0, r.o||'']);
          row.eachCell(c => { c.border = border; c.alignment = align; });
          tH+=r.h||0; tE+=r.ex||0; tC+=r.co||0;
        }
        ws.addRow([]);
        const totRow = ws.addRow(['TOTAL MES','','','','',tH,tE,tC,'']);
        totRow.eachCell(c => { c.font = {bold:true}; c.border = border; });

        ws.columns = [{width:8},{width:15},{width:15},{width:15},{width:15},{width:10},{width:10},{width:10},{width:25}];
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
        a.download = `REGISTRO_${cfg.trabajador?.replace(/\s+/g,'_')||'TRABAJADOR'}_${anioActual}_${String(mesActual+1).padStart(2,'0')}.xlsx`;
        a.click(); URL.revokeObjectURL(a.href);
        alert('✅ Excel generado con bordes y anchos');
      } catch(e) {
        console.error(e);
        alert('❌ Error Excel: ' + e.message);
      } finally {
        btn.disabled = false; btn.textContent = '📊 Excel con Bordes';
      }
    };

    // 7. Mostrar app
    loader.style.display = 'none';
    appContainer.style.display = 'block';
    render();

  } catch (err) {
    showError('Error crítico de inicio: ' + err.message);
  }
};
