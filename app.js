window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  const errorBox = document.getElementById('error-box');
  const app = document.getElementById('app');
  
  if (typeof ExcelJS === 'undefined' || typeof html2pdf === 'undefined') {
    errorBox.innerHTML = '⚠️ No se cargaron las librerías.<br>1. Desactiva bloqueadores de anuncios/privacy.<br>2. Recarga con Ctrl+F5.<br>3. Si usas Brave/Edge, desactiva "Tracking Prevention" para este sitio.';
    errorBox.style.display = 'block';
    loader.style.display = 'none';
    return;
  }

  let mes = new Date().getMonth(), anio = new Date().getFullYear();
  let datos = JSON.parse(localStorage.getItem('horario') || '{}');
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

  const get = id => document.getElementById(id);
  const save = () => { datos.cfg = cfg; localStorage.setItem('horario', JSON.stringify(datos)); };
  const keyM = () => `${anio}-${String(mes+1).padStart(2,'0')}`;

  function render() {
    get('mesLabel').textContent = `${meses[mes]} ${anio}`;
    const tbody = get('tbody'); tbody.innerHTML = '';
    const dias = new Date(anio, mes+1, 0).getDate();
    const km = keyM();
    if(!datos.meses) datos.meses = {};
    if(!datos.meses[km]) datos.meses[km] = {};

    let th=0, te=0, tc=0;
    for(let d=1; d<=dias; d++) {
      const kd = String(d).padStart(2,'0');
      if(!datos.meses[km][kd]) datos.meses[km][kd] = (new Date(anio,mes,d).getDay()>=1 && new Date(anio,mes,d).getDay()<=5) ? {...presets[cfg.tipo]} : {...presets.libre};
      const r = datos.meses[km][kd];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${d}</strong></td>
        <td><input type="time" data-k="${kd}" data-f="em" value="${r.em||''}"></td>
        <td><input type="time" data-k="${kd}" data-f="sm" value="${r.sm||''}"></td>
        <td><input type="time" data-k="${kd}" data-f="et" value="${r.et||''}"></td>
        <td><input type="time" data-k="${kd}" data-f="st" value="${r.st||''}"></td>
        <td><input type="number" class="h-total" data-k="${kd}" value="${r.h||0}" readonly></td>
        <td><input type="number" data-k="${kd}" data-f="ex" value="${r.ex||0}" min="0" step="0.5"></td>
        <td><input type="number" data-k="${kd}" data-f="co" value="${r.co||0}" min="0" step="0.5"></td>
        <td><select data-k="${kd}" data-f="o">
          <option value="">─</option>
          <option value="FESTIVO" ${r.o==='FESTIVO'?'selected':''}>🎉 Festivo</option>
          <option value="GUARDIA" ${r.o==='GUARDIA'?'selected':''}>🔔 Guardia</option>
          <option value="VACACIONES" ${r.o==='VACACIONES'?'selected':''}>🏖️ Vacaciones</option>
          <option value="" ${!r.o?'selected':''}>📭 Normal</option>
        </select></td>
      `;
      tbody.appendChild(tr); th+=r.h||0; te+=r.ex||0; tc+=r.co||0;
    }
    get('tH').textContent = th.toFixed(1); get('tE').textContent = te.toFixed(1); get('tC').textContent = tc.toFixed(1);

    tbody.querySelectorAll('input, select').forEach(el => el.onchange = e => {
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
        e.target.closest('tr').querySelector('.h-total').value = reg.h;
      }
      render(); save();
    });
    save();
  }

  // Cargar config
  ['empresa','cif','ccc','trabajador','nif','naf'].forEach(id => get(id).value = cfg[id]||'');
  get('tipoJornada').value = cfg.tipo||'partido';

  // Eventos
  get('btnPrev').onclick = () => { mes--; if(mes<0){mes=11;anio--;} render(); };
  get('btnNext').onclick = () => { mes++; if(mes>11){mes=0;anio++;} render(); };
  get('btnGuardarConfig').onclick = () => {
    cfg = {empresa:get('empresa').value, cif:get('cif').value, ccc:get('ccc').value, trabajador:get('trabajador').value, nif:get('nif').value, naf:get('naf').value, tipo:get('tipoJornada').value};
    save(); alert('✅ Configuración guardada');
  };
  get('btnAuto').onclick = () => {
    const km = keyM(), dias = new Date(anio, mes+1, 0).getDate();
    for(let d=1; d<=dias; d++) {
      const kd = String(d).padStart(2,'0'), ds = new Date(anio,mes,d).getDay();
      if(!datos.meses[km][kd]?.em) datos.meses[km][kd] = (ds>=1 && ds<=5) ? {...presets[cfg.tipo]} : {...presets.libre};
    }
    render(); alert(`✅ Autocompletado (${cfg.tipo})`);
  };
  get('btnGuardar').onclick = () => { save(); alert('✅ Datos guardados'); };
  get('btnBackup').onclick = () => {
    const b = new Blob([JSON.stringify(datos,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
  };
  get('btnRestore').onclick = () => get('fileRestore').click();
  get('fileRestore').onchange = e => {
    const f = e.target.files[0]; if(!f) return;
    new FileReader().onload = ev => {
      try { datos = JSON.parse(ev.target.result); cfg = datos.cfg||cfg; save(); render(); alert('✅ Restaurado'); } 
      catch(err) { alert('❌ '+err.message); }
    }.call(new FileReader(), f); e.target.value='';
  };

  // ✅ EXCEL CORREGIDO (API oficial ExcelJS)
  get('btnExcel').onclick = async () => {
    const btn = get('btnExcel'); btn.disabled = true; btn.textContent = '⏳ Generando...';
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(meses[mes]);
      const km = keyM(), dias = new Date(anio, mes+1, 0).getDate();
      const bThin = {top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};
      const align = {horizontal:'center', vertical:'middle'};

      // Títulos (MERGE CORRECTO)
      ws.mergeCells('A1:I1'); ws.getCell('A1').value = 'REGISTRO DIARIO DE JORNADA';
      ws.getCell('A1').font = {bold:true, size:14, color:{argb:'FF2563EB'}}; ws.getCell('A1').alignment = {horizontal:'center'};
      ws.mergeCells('A2:I2'); ws.getCell('A2').value = 'Art. 34.9 ET - RDL 8/2019';
      ws.getCell('A2').font = {italic:true, size:9, color:{argb:'FF666666'}}; ws.getCell('A2').alignment = {horizontal:'center'};

      // Info
      ws.addRow([]);
      const rInfo1 = ws.addRow(['EMPRESA:', cfg.empresa, 'CIF:', cfg.cif, 'CCC:', cfg.ccc, 'MES:', `${meses[mes]} ${anio}`]);
      const rInfo2 = ws.addRow(['TRABAJADOR:', cfg.trabajador, 'NIF:', cfg.nif, 'NAF:', cfg.naf, 'AÑO:', anio]);
      [rInfo1, rInfo2].forEach(r => r.eachCell(c => {c.border=bThin; c.alignment=align; if(c.col%2===1) c.font={bold:true};}));
      ws.addRow([]);

      // Cabeceras
      const h1 = ws.addRow(['DÍA','HORARIO MAÑANA','','HORARIO TARDE','','TOTAL HORAS','HORAS EXTRAS','HORAS COMPLEM.','OBSERVACIONES']);
      const h2 = ws.addRow(['DÍA','Entrada','Salida','Entrada','Salida','Total','Extras','Complement.','Firma']);
      [h1,h2].forEach(r => r.eachCell(c => {c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2563EB'}}; c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.alignment=align; c.border=bThin;}));
      ws.mergeCells('B6:C6'); ws.mergeCells('D6:E6');

      // Datos
      let th=0, te=0, tc=0;
      for(let d=1; d<=dias; d++) {
        const r = datos.meses[km]?.[String(d).padStart(2,'0')] || {};
        const row = ws.addRow([d, r.em||'', r.sm||'', r.et||'', r.st||'', r.h||0, r.ex||0, r.co||0, r.o||'']);
        row.eachCell(c => {c.border=bThin; c.alignment=align;});
        th+=r.h||0; te+=r.ex||0; tc+=r.co||0;
      }
      ws.addRow([]);
      const tot = ws.addRow(['TOTAL MES','','','','',th.toFixed(1),te.toFixed(1),tc.toFixed(1),'']);
      tot.eachCell(c => {c.font={bold:true,size:11,color:{argb:'FF2563EB'}}; c.border=bThin; c.alignment=align;});

      // Firmas
      ws.addRow([]);
      const fRow = ws.addRow(['Firma Empresa: ____________________', '', '', '', '', '', '', '', 'Firma Trabajador: ____________________']);
      fRow.getCell(1).font={bold:true}; fRow.getCell(9).font={bold:true};

      ws.columns = [{width:8},{width:15},{width:15},{width:15},{width:15},{width:12},{width:12},{width:12},{width:22}];
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download = `REGISTRO_${(cfg.trabajador||'TRABAJADOR').replace(/\s+/g,'_')}_${anio}_${String(mes+1).padStart(2,'0')}.xlsx`;
      a.click(); URL.revokeObjectURL(a.href);
      alert('✅ Excel generado con bordes y formato profesional');
    } catch(e) { alert('❌ Error Excel: '+e.message); console.error(e); }
    finally { btn.disabled=false; btn.textContent='📊 Excel con Bordes'; }
  };

  // ✅ PDF GENERADO (html2pdf.js)
  get('btnPDF').onclick = async () => {
    const btn = get('btnPDF'); btn.disabled = true; btn.textContent = '⏳ Generando PDF...';
    try {
      const km = keyM(), dias = new Date(anio, mes+1, 0).getDate();
      let filas = '';
      for(let d=1; d<=dias; d++) {
        const r = datos.meses[km]?.[String(d).padStart(2,'0')] || {};
        filas += `<tr><td>${d}</td><td>${r.em||''}</td><td>${r.sm||''}</td><td>${r.et||''}</td><td>${r.st||''}</td><td>${r.h||0}</td><td>${r.ex||0}</td><td>${r.co||0}</td><td>${r.o||''}</td></tr>`;
      }
      document.getElementById('pdf-container').innerHTML = `
        <h2 style="text-align:center; margin:0 0 5px; color:#2563eb;">REGISTRO DIARIO DE JORNADA</h2>
        <p style="text-align:center; font-size:9pt; color:#666; margin:0 0 15px;">Art. 34.9 ET - RDL 8/2019</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:10pt;">
          <tr><td style="padding:4px; border:1px solid #ccc; font-weight:bold;">EMPRESA:</td><td style="padding:4px; border:1px solid #ccc;">${cfg.empresa||''}</td><td style="padding:4px; border:1px solid #ccc; font-weight:bold;">CIF:</td><td style="padding:4px; border:1px solid #ccc;">${cfg.cif||''}</td><td style="padding:4px; border:1px solid #ccc; font-weight:bold;">MES:</td><td style="padding:4px; border:1px solid #ccc;">${meses[mes]} ${anio}</td></tr>
          <tr><td style="padding:4px; border:1px solid #ccc; font-weight:bold;">TRABAJADOR:</td><td style="padding:4px; border:1px solid #ccc;">${cfg.trabajador||''}</td><td style="padding:4px; border:1px solid #ccc; font-weight:bold;">NIF:</td><td style="padding:4px; border:1px solid #ccc;">${cfg.nif||''}</td><td style="padding:4px; border:1px solid #ccc; font-weight:bold;">AÑO:</td><td style="padding:4px; border:1px solid #ccc;">${anio}</td></tr>
        </table>
        <table style="width:100%; border-collapse:collapse; font-size:9pt;">
          <tr style="background:#f1f5f9; font-weight:bold;">
            <th style="padding:6px; border:1px solid #333;">DÍA</th><th style="padding:6px; border:1px solid #333;">MAÑANA</th><th style="padding:6px; border:1px solid #333;"></th><th style="padding:6px; border:1px solid #333;">TARDE</th><th style="padding:6px; border:1px solid #333;"></th><th style="padding:6px; border:1px solid #333;">TOTAL</th><th style="padding:6px; border:1px solid #333;">EXTRAS</th><th style="padding:6px; border:1px solid #333;">COMPL.</th><th style="padding:6px; border:1px solid #333;">OBS.</th>
          </tr>
          <tr style="background:#f1f5f9; font-weight:bold;"><td style="padding:4px; border:1px solid #333;">DÍA</td><td style="padding:4px; border:1px solid #333;">Entrada</td><td style="padding:4px; border:1px solid #333;">Salida</td><td style="padding:4px; border:1px solid #333;">Entrada</td><td style="padding:4px; border:1px solid #333;">Salida</td><td style="padding:4px; border:1px solid #333;">Horas</td><td style="padding:4px; border:1px solid #333;">Horas</td><td style="padding:4px; border:1px solid #333;">Horas</td><td style="padding:4px; border:1px solid #333;"></td></tr>
          ${filas}
        </table>
        <div style="margin-top:20px; display:flex; justify-content:space-between; font-size:10pt; border-top:1px solid #ccc; padding-top:10px;">
          <span>Firma Empresa: _________________________</span>
          <span>Firma Trabajador: _________________________</span>
        </div>
        <p style="margin-top:15px; font-size:8pt; color:#555; text-align:center;">Registro realizado en cumplimiento del Art. 34.9 del RDL 2/2015. Conservación mínima: 4 años.</p>
      `;
      await html2pdf().set({margin:10, filename:`REGISTRO_${(cfg.trabajador||'TRABAJADOR').replace(/\s+/g,'_')}_${meses[mes]}_${anio}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2, useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(document.getElementById('pdf-container')).save();
      alert('✅ PDF generado correctamente');
    } catch(e) { alert('❌ Error PDF: '+e.message); console.error(e); }
    finally { btn.disabled=false; btn.textContent='📄 Generar PDF'; }
  };

  // Inicio
  loader.style.display = 'none';
  app.style.display = 'block';
  render();
});
