// Ejecutar SOLO cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Función segura para obtener elementos
  const get = function(id) {
    const el = document.getElementById(id);
    if (!el) console.warn('⚠️ Elemento no encontrado: #' + id);
    return el;
  };

  // Referencias con fallback
  const loader = get('loader');
  const errorBox = get('error-box');
  const app = get('app');
  
  // Función para mostrar errores de forma segura
  function showError(msg) {
    if (errorBox) {
      errorBox.innerHTML = '<strong>❌ Error:</strong><br>' + msg + '<br><small style="color:#7f1d1d">Abre F12 > Consola para detalles</small>';
      errorBox.style.display = 'block';
    }
    if (loader) loader.style.display = 'none';
    if (app) app.style.display = 'none';
    console.error('Control Horario ERROR:', msg);
  }

  try {
    // 1. Verificar ExcelJS
    if (typeof ExcelJS === 'undefined') {
      showError('No se cargó ExcelJS.<br>1. Desactiva bloqueadores para github.io<br>2. Recarga con Ctrl+F5<br>3. Prueba en Chrome/Firefox');
      return;
    }

    // 2. Estado inicial
    let mes = new Date().getMonth();
    let anio = new Date().getFullYear();
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

    const save = function() { datos.cfg = cfg; localStorage.setItem('horario', JSON.stringify(datos)); };
    const keyM = function() { return anio + '-' + String(mes+1).padStart(2,'0'); };

    // 3. Cargar config en inputs (con null checks)
    const inputs = ['empresa','cif','ccc','trabajador','nif','naf'];
    inputs.forEach(function(id) {
      const el = get(id);
      if (el) el.value = cfg[id] || '';
    });
    const tipoSel = get('tipoJornada');
    if (tipoSel) tipoSel.value = cfg.tipo || 'partido';

    // 4. Renderizar calendario
    function render() {
      const mesLabel = get('mesLabel');
      if (mesLabel) mesLabel.textContent = meses[mes] + ' ' + anio;
      
      const tbody = get('tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      
      const dias = new Date(anio, mes+1, 0).getDate();
      const km = keyM();
      if (!datos.meses) datos.meses = {};
      if (!datos.meses[km]) datos.meses[km] = {};

      let th=0, te=0, tc=0;
      for (var d=1; d<=dias; d++) {
        var kd = String(d).padStart(2,'0');
        if (!datos.meses[km][kd]) {
          var ds = new Date(anio, mes, d).getDay();
          datos.meses[km][kd] = (ds>=1 && ds<=5) ? JSON.parse(JSON.stringify(presets[cfg.tipo])) : JSON.parse(JSON.stringify(presets.libre));
        }
        var r = datos.meses[km][kd];
        var tr = document.createElement('tr');
        tr.innerHTML = 
          '<td><strong>'+d+'</strong></td>'+
          '<td><input type="time" data-k="'+kd+'" data-f="em" value="'+(r.em||'')+'"></td>'+
          '<td><input type="time" data-k="'+kd+'" data-f="sm" value="'+(r.sm||'')+'"></td>'+
          '<td><input type="time" data-k="'+kd+'" data-f="et" value="'+(r.et||'')+'"></td>'+
          '<td><input type="time" data-k="'+kd+'" data-f="st" value="'+(r.st||'')+'"></td>'+
          '<td><input type="number" class="h-total" data-k="'+kd+'" value="'+(r.h||0)+'" readonly></td>'+
          '<td><input type="number" data-k="'+kd+'" data-f="ex" value="'+(r.ex||0)+'" min="0" step="0.5"></td>'+
          '<td><input type="number" data-k="'+kd+'" data-f="co" value="'+(r.co||0)+'" min="0" step="0.5"></td>'+
          '<td><select data-k="'+kd+'" data-f="o"><option value="">─</option><option value="FESTIVO" '+(r.o==='FESTIVO'?'selected':'')+'>🎉 Festivo</option><option value="GUARDIA" '+(r.o==='GUARDIA'?'selected':'')+'>🔔 Guardia</option><option value="VACACIONES" '+(r.o==='VACACIONES'?'selected':'')+'>🏖️ Vacaciones</option><option value="" '+(r.o===''?'selected':'')+'>📭 Normal</option></select></td>';
        tbody.appendChild(tr);
        th += r.h||0; te += r.ex||0; tc += r.co||0;
      }
      
      // Actualizar totales (con null checks)
      var tH = get('tH'), tE = get('tE'), tC = get('tC');
      if (tH) tH.textContent = th.toFixed(1);
      if (tE) tE.textContent = te.toFixed(1);
      if (tC) tC.textContent = tc.toFixed(1);

      // Bind events a inputs
      var inputs = tbody.querySelectorAll('input, select');
      for (var i=0; i<inputs.length; i++) {
        inputs[i].onchange = (function(el) {
          return function(e) {
            var k = el.dataset.k, f = el.dataset.f;
            if (!datos.meses[km][k]) datos.meses[km][k] = {};
            datos.meses[km][k][f] = el.value;
            if (['em','sm','et','st','o'].indexOf(f) >= 0) {
              var reg = datos.meses[km][k];
              if (reg.o && (reg.o.indexOf('FESTIVO')>=0 || reg.o.indexOf('VACACIONES')>=0)) {
                reg.h = 0;
              } else {
                var h=0;
                if (reg.em && reg.sm) h += (new Date('2000-01-01T'+reg.sm) - new Date('2000-01-01T'+reg.em)) / 3600000;
                if (reg.et && reg.st) h += (new Date('2000-01-01T'+reg.st) - new Date('2000-01-01T'+reg.et)) / 3600000;
                reg.h = Math.round(h*10)/10;
              }
              var row = el.closest('tr');
              if (row) {
                var totalInput = row.querySelector('.h-total');
                if (totalInput) totalInput.value = reg.h;
              }
            }
            render(); save();
          };
        })(inputs[i]);
      }
      save();
    }

    // 5. Event listeners (con null checks)
    var btnPrev = get('btnPrev'), btnNext = get('btnNext');
    if (btnPrev) btnPrev.onclick = function() { mes--; if(mes<0){mes=11;anio--;} render(); };
    if (btnNext) btnNext.onclick = function() { mes++; if(mes>11){mes=0;anio++;} render(); };
    
    var btnGuardarConfig = get('btnGuardarConfig');
    if (btnGuardarConfig) btnGuardarConfig.onclick = function() {
      cfg = {
        empresa: get('empresa')?.value || '',
        cif: get('cif')?.value || '',
        ccc: get('ccc')?.value || '',
        trabajador: get('trabajador')?.value || '',
        nif: get('nif')?.value || '',
        naf: get('naf')?.value || '',
        tipo: get('tipoJornada')?.value || 'partido'
      };
      save(); alert('✅ Configuración guardada');
    };

    var btnAuto = get('btnAuto');
    if (btnAuto) btnAuto.onclick = function() {
      var km = keyM(), dias = new Date(anio, mes+1, 0).getDate();
      for (var d=1; d<=dias; d++) {
        var kd = String(d).padStart(2,'0'), ds = new Date(anio,mes,d).getDay();
        if (!datos.meses[km][kd]?.em) datos.meses[km][kd] = (ds>=1 && ds<=5) ? JSON.parse(JSON.stringify(presets[cfg.tipo])) : JSON.parse(JSON.stringify(presets.libre));
      }
      render(); alert('✅ Autocompletado ('+cfg.tipo+')');
    };

    var btnGuardar = get('btnGuardar');
    if (btnGuardar) btnGuardar.onclick = function() { save(); alert('✅ Datos guardados'); };
    
    var btnBackup = get('btnBackup');
    if (btnBackup) btnBackup.onclick = function() {
      var b = new Blob([JSON.stringify(datos,null,2)],{type:'application/json'});
      var a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download='backup_'+new Date().toISOString().split('T')[0]+'.json'; a.click();
    };

    var btnRestore = get('btnRestore'), fileRestore = get('fileRestore');
    if (btnRestore && fileRestore) {
      btnRestore.onclick = function() { fileRestore.click(); };
      fileRestore.onchange = function(e) {
        var f = e.target.files[0]; if (!f) return;
        var r = new FileReader(); 
        r.onload = function(ev) {
          try { 
            datos = JSON.parse(ev.target.result); 
            cfg = datos.cfg || cfg; 
            save(); render(); alert('✅ Restaurado'); 
          } catch(err) { alert('❌ '+err.message); }
        }; 
        r.readAsText(f); e.target.value='';
      };
    }

    // 6. Generar Excel (CORREGIDO - API oficial ExcelJS)
    var btnExcel = get('btnExcel');
    if (btnExcel) btnExcel.onclick = async function() {
      var btn = btnExcel;
      btn.disabled = true; btn.textContent = '⏳ Generando...';
      try {
        var wb = new ExcelJS.Workbook();
        var ws = wb.addWorksheet(meses[mes]);
        var km = keyM(), dias = new Date(anio, mes+1, 0).getDate();
        var bThin = {top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};
        var align = {horizontal:'center', vertical:'middle'};

        // Títulos (MERGE CORRECTO: primero merge, luego estilo)
        ws.mergeCells('A1:I1'); 
        ws.getCell('A1').value = 'REGISTRO DIARIO DE JORNADA';
        ws.getCell('A1').font = {bold:true, size:14, color:{argb:'FF2563EB'}}; 
        ws.getCell('A1').alignment = {horizontal:'center'};
        
        ws.mergeCells('A2:I2'); 
        ws.getCell('A2').value = 'Art. 34.9 ET - RDL 8/2019';
        ws.getCell('A2').font = {italic:true, size:9, color:{argb:'FF666666'}}; 
        ws.getCell('A2').alignment = {horizontal:'center'};

        // Info empresa/trabajador
        ws.addRow([]);
        var r1 = ws.addRow(['EMPRESA:', cfg.empresa, 'CIF:', cfg.cif, 'CCC:', cfg.ccc, 'MES:', meses[mes]+' '+anio]);
        var r2 = ws.addRow(['TRABAJADOR:', cfg.trabajador, 'NIF:', cfg.nif, 'NAF:', cfg.naf, 'AÑO:', anio]);
        [r1,r2].forEach(function(r) { 
          r.eachCell(function(c) { 
            c.border = bThin; 
            c.alignment = align; 
            if (c.col % 2 === 1) c.font = {bold:true}; 
          }); 
        });
        ws.addRow([]);

        // Cabeceras tabla
        var h1 = ws.addRow(['DÍA','HORARIO MAÑANA','','HORARIO TARDE','','TOTAL HORAS','HORAS EXTRAS','HORAS COMPLEM.','OBSERVACIONES']);
        var h2 = ws.addRow(['DÍA','Entrada','Salida','Entrada','Salida','Total','Extras','Complement.','Firma']);
        [h1,h2].forEach(function(r) { 
          r.eachCell(function(c) { 
            c.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF2563EB'}}; 
            c.font = {bold:true,color:{argb:'FFFFFFFF'}}; 
            c.alignment = align; 
            c.border = bThin; 
          }); 
        });
        ws.mergeCells('B6:C6'); 
        ws.mergeCells('D6:E6');

        // Datos días
        var th=0, te=0, tc=0;
        for (var d=1; d<=dias; d++) {
          var r = datos.meses[km]?.[String(d).padStart(2,'0')]
