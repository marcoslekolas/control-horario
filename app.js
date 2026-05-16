document.addEventListener('DOMContentLoaded', () => {
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

  // UI References
  const msg = document.getElementById('status-msg');
  function showMsg(text, type='success') {
    msg.textContent = text;
    msg.style.display = 'block';
    msg.style.background = type==='error' ? '#fee2e2' : '#e8f5e9';
    msg.style.color = type==='error' ? '#b91c1c' : '#2e7d32';
    setTimeout(() => msg.style.display = 'none', 3000);
  }

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

    tbody.querySelectorAll('input, select').forEach(el => {
      el.onchange = e => {
        const k = e.target.dataset.k, f = e.target.dataset.f;
        if (!datos.meses[km][k]) datos.meses[km][k] = {};
        datos.meses[km][k][f] = e.target.value;
        if (['em','sm','et','st','o'].includes(f)) {
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
  }

  // Cargar config inicial
  document.getElementById('empresa').value = cfg.empresa;
  document.getElementById('cif').value = cfg.cif;
  document.getElementById('ccc').value = cfg.ccc;
  document.getElementById('trabajador').value = cfg.trabajador;
  document.getElementById('nif').value = cfg.nif;
  document.getElementById('naf').value = cfg.naf;
  document.getElementById('tipoJornada').value = cfg.tipo;

  // Event Listeners
  document.getElementById('btnPrev').addEventListener('click', () => { mesActual--; if(mesActual<0){mesActual=11;anioActual--;} render(); });
  document.getElementById('btnNext').addEventListener('click', () => { mesActual++; if(mesActual>11){mesActual=0;anioActual++;} render(); });
  
  document.getElementById('btnGuardarConfig').addEventListener('click', () => {
    cfg.empresa = document.getElementById('empresa').value;
    cfg.cif = document.getElementById('cif').value;
    cfg.ccc = document.getElementById('ccc').value;
    cfg.trabajador = document.getElementById('trabajador').value;
    cfg.nif = document.getElementById('nif').value;
    cfg.naf = document.getElementById('naf').value;
    cfg.tipo = document.getElementById('tipoJornada').value;
    guardar(); showMsg('✅ Configuración guardada');
  });

  document.getElementById('btnAutocompletar').addEventListener('click', () => {
    const km = claveM(), dias = new Date(anioActual, mesActual+1, 0).getDate();
    for(let d=1; d<=dias; d++) {
      const kd = String(d).padStart(2,'0'), ds = new Date(anioActual,mesActual,d).getDay();
      if (!datos.meses[km][kd]?.em) datos.meses[km][kd] = (ds>=1 && ds<=5) ? {...presets[cfg.tipo]} : {...presets.libre};
    }
    render(); showMsg(`✅ Mes autocompletado (${cfg.tipo==='partido'?'Partido':'Continuo'})`);
  });

  document.getElementById('btnGuardar').addEventListener('click', () => { guardar(); showMsg('✅ Datos guardados'); });

  document.getElementById('btnBackup').addEventListener('click', () => {
    const b = new Blob([JSON.stringify(datos,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    showMsg('✅ Backup descargado');
  });

  document.getElementById('btnRestore').addEventListener('click', () => document.getElementById('fileRestore').click());
  document.getElementById('fileRestore').addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = ev => {
      try { datos = JSON.parse(ev.target.result); cfg = datos.cfg || cfg; guardar(); render(); showMsg('✅ Restaurado'); } 
      catch(err) { showMsg('❌ Error: '+err.message, 'error'); }
    }; r.readAsText(f); e.target.value='';
  });

  // GENERAR EXCEL CON BORDES Y ANCHO
  document.getElementById('btnExcel').addEventListener('click', async () => {
    const btn = document.getElementById('btnExcel');
    btn.disabled = true; btn.textContent = '⏳ Generando...';
    try {
      if (typeof ExcelJS === 'undefined') throw new Error('Librería ExcelJS no cargada. Recarga la página.');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`${meses[mesActual]} ${anioActual}`);
      const km = claveM(), dias = new Date(anioActual, mesActual+1, 0).getDate();
      const border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
      const align = { horizontal:'center', vertical:'middle' };

      // Cabecera
      ws.addRow(['REGISTRO DIARIO DE JORNADA']).getCell(1).font = {bold:true, size:14}; ws.mergeCells(`A1:I1`);
      ws.addRow([`Art. 34.9 ET - ${cfg.empresa || ''}`]).getCell(1).font = {italic:true, size:10}; ws.mergeCells(`A2:I2`);
      ws.addRow([]);
      ws.addRow(['EMPRESA:', cfg.empresa, 'CIF:', cfg.cif, 'CCC:', cfg.ccc, 'MES:', `${meses[mesActual]} ${anioActual}`]);
      ws.addRow(['TRABAJADOR:', cfg.trabajador, 'NIF:', cfg.nif, 'NAF:', cfg.naf, 'AÑO:', anioActual]);
      ws.addRow([]);
      ws.addRow(['DÍA','ENTRADA M.','SALIDA M.','ENTRADA T.','SALIDA T.','TOTAL H.','EXTRAS','COMPL.','OBSERVACIONES']);

      // Estilos cabecera
      ws.getRow(8).eachCell(c => { c.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF667EEA'}}; c.font = {bold:true,color:{argb:'FFFFFFFF'}}; c.alignment = align; c.border = border; });

      let tH=0, tE=0, tC=0;
      for(let d=1; d<=dias; d++) {
        const r = datos.meses[km]?.[String(d).padStart(2,'0')] || {};
        const row = ws.addRow([d, r.em||'', r.sm||'', r.et||'', r.st||'', r.h||0, r.ex||0, r.co||0, r.o||'']);
        row.eachCell(c => { c.border = border; c.alignment = align; });
        tH+=r.h||0; tE+=r.ex||0; tC+=r.co||0;
      }
      ws.addRow([]);
      const totRow = ws.addRow(['TOTAL MES','','','','',tH,tE,tC,'']);
      totRow.eachCell(c => { c.font = {bold:true}; c.border = border; c.alignment = align; });

      ws.columns = [{width:8},{width:15},{width:15},{width:15},{width:15},{width:10},{width:10},{width:10},{width:25}];
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download = `REGISTRO_${cfg.trabajador?.replace(/\s+/g,'_')||'TRABAJADOR'}_${anioActual}_${String(mesActual+1).padStart(2,'0')}.xlsx`;
      a.click(); URL.revokeObjectURL(a.href);
      showMsg('✅ Excel generado con bordes y anchos');
    } catch(e) { showMsg('❌ '+e.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '📊 Excel con Bordes'; }
  });

  // GENERAR PDF
  document.getElementById('btnPDF').addEventListener('click', async () => {
    const btn = document.getElementById('btnPDF');
    btn.disabled = true; btn.textContent = '⏳ Generando PDF...';
    try {
      const km = claveM(), dias = new Date(anioActual, mesActual+1, 0).getDate();
      let tH=0, tE=0, tC=0;
      let filas = '';
      for(let d=1; d<=dias; d++) {
        const r = datos.meses[km]?.[String(d).padStart(2,'0')] || {};
        tH+=r.h||0; tE+=r.ex||0; tC+=r.co||0;
        filas += `<tr><td>${d}</td><td>${r.em||''}</td><td>${r.sm||''}</td><td>${r.et||''}</td><td>${r.st||''}</td><td>${r.h||0}</td><td>${r.ex||0}</td><td>${r.co||0}</td><td>${r.o||''}</td></tr>`;
      }
      const html = `
        <div class="pdf-header">
          <h2>REGISTRO DIARIO DE JORNADA</h2>
          <p>Art. 34.9 ET - RDL 8/2019 | ${cfg.empresa || ''}</p>
          <p style="margin-top:5px;">Trabajador: ${cfg.trabajador} | NIF: ${cfg.nif} | Mes: ${meses[mesActual]} ${anioActual}</p>
        </div>
        <table class="pdf-table">
          <tr><th>DÍA</th><th>ENTRADA M.</th><th>SALIDA M.</th><th>ENTRADA T.</th><th>SALIDA T.</th><th>TOTAL H.</th><th>EXTRAS</th><th>COMPL.</th><th>OBSERVACIONES</th></tr>
          ${filas}
          <tr style="background:#f5f5f5;font-weight:bold;"><td>TOTAL MES</td><td colspan="4"></td><td>${tH.toFixed(1)}</td><td>${tE.toFixed(1)}</td><td>${tC.toFixed(1)}</td><td></td></tr>
        </table>
        <div style="margin-top:30px; display:flex; justify-content:space-between; font-size:10pt;">
          <span>Firma Empresa: _________________________</span>
          <span>Firma Trabajador: _________________________</span>
        </div>
      `;
      document.getElementById('pdf-render').innerHTML = html;
      await html2pdf().set({
        margin: [10,10,10,10],
        filename: `REGISTRO_${cfg.trabajador?.replace(/\s+/g,'_')||'TRABAJADOR'}_${meses[mesActual]}_${anioActual}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(document.getElementById('pdf-render')).save();
      showMsg('✅ PDF generado correctamente');
    } catch(e) { showMsg('❌ '+e.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '📄 Generar PDF'; }
  });

  // Init
  render();
});
