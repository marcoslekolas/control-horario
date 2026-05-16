document.addEventListener('DOMContentLoaded', function() {
  // Estado
  var mes = new Date().getMonth();
  var anio = new Date().getFullYear();
  var datos = JSON.parse(localStorage.getItem('horario') || '{}');
  var cfg = datos.cfg || {empresa:'',cif:'',ccc:'',trabajador:'',nif:'',naf:'',tipo:'partido'};
  
  var meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  
  var presets = {
    partido: {em:'09:00',sm:'14:00',et:'16:00',st:'18:00',h:8,o:''},
    continuo: {em:'08:00',sm:'15:00',et:'',st:'',h:7,o:''},
    festivo: {em:'',sm:'',et:'',st:'',h:0,o:'FESTIVO'},
    guardia: {em:'',sm:'',et:'',st:'',h:8,o:'GUARDIA'},
    vacaciones: {em:'',sm:'',et:'',st:'',h:0,o:'VACACIONES'},
    libre: {em:'',sm:'',et:'',st:'',h:0,o:''}
  };

  function get(id) { return document.getElementById(id); }
  function save() { datos.cfg = cfg; localStorage.setItem('horario', JSON.stringify(datos)); }
  function keyM() { return anio + '-' + String(mes+1).padStart(2,'0'); }

  function render() {
    var lbl = get('mesLabel');
    if (lbl) lbl.textContent = meses[mes] + ' ' + anio;
    
    var tbody = get('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    var dias = new Date(anio, mes+1, 0).getDate();
    var km = keyM();
    if (!datos.meses) datos.meses = {};
    if (!datos.meses[km]) datos.meses[km] = {};

    var th=0, te=0, tc=0;
    
    for (var d=1; d<=dias; d++) {
      var kd = String(d).padStart(2,'0');
      if (!datos.meses[km][kd]) {
        var ds = new Date(anio, mes, d).getDay();
        datos.meses[km][kd] = (ds>=1 && ds<=5) ? JSON.parse(JSON.stringify(presets[cfg.tipo])) : JSON.parse(JSON.stringify(presets.libre));
      }
      var r = datos.meses[km][kd];
      
      var tr = document.createElement('tr');
      tr.innerHTML = 
        '<td><strong>'+d+'</strong></td>' +
        '<td><input type="time" data-k="'+kd+'" data-f="em" value="'+(r.em||'')+'"></td>' +
        '<td><input type="time" data-k="'+kd+'" data-f="sm" value="'+(r.sm||'')+'"></td>' +
        '<td><input type="time" data-k="'+kd+'" data-f="et" value="'+(r.et||'')+'"></td>' +
        '<td><input type="time" data-k="'+kd+'" data-f="st" value="'+(r.st||'')+'"></td>' +
        '<td><input type="number" class="h-total" data-k="'+kd+'" value="'+(r.h||0)+'" readonly></td>' +
        '<td><input type="number" data-k="'+kd+'" data-f="ex" value="'+(r.ex||0)+'" min="0" step="0.5"></td>' +
        '<td><input type="number" data-k="'+kd+'" data-f="co" value="'+(r.co||0)+'" min="0" step="0.5"></td>' +
        '<td><select data-k="'+kd+'" data-f="o">' +
          '<option value="">─</option>' +
          '<option value="FESTIVO" '+(r.o==='FESTIVO'?'selected':'')+'>🎉 Festivo</option>' +
          '<option value="GUARDIA" '+(r.o==='GUARDIA'?'selected':'')+'>🔔 Guardia</option>' +
          '<option value="VACACIONES" '+(r.o==='VACACIONES'?'selected':'')+'>🏖️ Vacaciones</option>' +
          '<option value="" '+(r.o===''?'selected':'')+'>📭 Normal</option>' +
        '</select></td>';
      tbody.appendChild(tr);
      
      th += r.h||0; te += r.ex||0; tc += r.co||0;
    }
    
    var tH = get('tH'), tE = get('tE'), tC = get('tC');
    if (tH) tH.textContent = th.toFixed(1);
    if (tE) tE.textContent = te.toFixed(1);
    if (tC) tC.textContent = tc.toFixed(1);

    // Eventos inputs
    var inputs = tbody.querySelectorAll('input, select');
    for (var i=0; i<inputs.length; i++) {
      (function(el) {
        el.onchange = function(e) {
          var k = el.dataset.k, f = el.dataset.f;
          if (!datos.meses[km][k]) datos.meses[km][k] = {};
          datos.meses[km][k][f] = el.value;
          
          if (['em','sm','et','st','o'].indexOf(f) >= 0) {
            var reg = datos.meses[km][k];
            if (reg.o && (reg.o.indexOf('FESTIVO')>=0 || reg.o.indexOf('VACACIONES')>=0)) {
              reg.h = 0;
            } else {
              var h = 0;
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
          render();
          save();
        };
      })(inputs[i]);
    }
    save();
  }

  // Cargar config
  var ids = ['empresa','cif','ccc','trabajador','nif','naf'];
  for (var j=0; j<ids.length; j++) {
    var el = get(ids[j]);
    if (el) el.value = cfg[ids[j]] || '';
  }
  var tipoSel = get('tipoJornada');
  if (tipoSel) tipoSel.value = cfg.tipo || 'partido';

  // Botones
  var btnPrev = get('btnPrev');
  if (btnPrev) btnPrev.onclick = function() { mes--; if(mes<0){mes=11;anio--;} render(); };
  
  var btnNext = get('btnNext');
  if (btnNext) btnNext.onclick = function() { mes++; if(mes>11){mes=0;anio++;} render(); };
  
  var btnGuardarConfig = get('btnGuardarConfig');
  if (btnGuardarConfig) btnGuardarConfig.onclick = function() {
    cfg.empresa = get('empresa').value;
    cfg.cif = get('cif').value;
    cfg.ccc = get('ccc').value;
    cfg.trabajador = get('trabajador').value;
    cfg.nif = get('nif').value;
    cfg.naf = get('naf').value;
    cfg.tipo = get('tipoJornada').value;
    save();
    alert('✅ Configuración guardada');
  };
  
  var btnAuto = get('btnAuto');
  if (btnAuto) btnAuto.onclick = function() {
    var km = keyM(), dias = new Date(anio, mes+1, 0).getDate();
    for (var d=1; d<=dias; d++) {
      var kd = String(d).padStart(2,'0'), ds = new Date(anio,mes,d).getDay();
      if (!datos.meses[km][kd] || !datos.meses[km][kd].em) {
        datos.meses[km][kd] = (ds>=1 && ds<=5) ? JSON.parse(JSON.stringify(presets[cfg.tipo])) : JSON.parse(JSON.stringify(presets.libre));
      }
    }
    render();
    alert('✅ Autocompletado ('+cfg.tipo+')');
  };
  
  var btnGuardar = get('btnGuardar');
  if (btnGuardar) btnGuardar.onclick = function() { save(); alert('✅ Datos guardados'); };
  
  var btnBackup = get('btnBackup');
  if (btnBackup) btnBackup.onclick = function() {
    var b = new Blob([JSON.stringify(datos,null,2)],{type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'backup_'+new Date().toISOString().split('T')[0]+'.json';
    a.click();
  };
  
  var btnRestore = get('btnRestore'), fileRestore = get('fileRestore');
  if (btnRestore && fileRestore) {
    btnRestore.onclick = function() { fileRestore.click(); };
    fileRestore.onchange = function(e) {
      var f = e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function(ev) {
        try {
          datos = JSON.parse(ev.target.result);
          cfg = datos.cfg || cfg;
          save();
          render();
          alert('✅ Restaurado');
        } catch(err) { alert('❌ '+err.message); }
      };
      r.readAsText(f);
      e.target.value = '';
    };
  }

  // Excel con SheetJS (bordes básicos)
  var btnExcel = get('btnExcel');
  if (btnExcel) btnExcel.onclick = function() {
    if (typeof XLSX === 'undefined') { alert('⚠️ Librería no cargada. Recarga con Ctrl+F5'); return; }
    
    var btn = btnExcel;
    btn.disabled = true;
    btn.textContent = '⏳ Generando...';
    
    try {
      var wb = XLSX.utils.book_new();
      var km = keyM(), dias = new Date(anio, mes+1, 0).getDate();
      
      var wsData = [
        ['REGISTRO DIARIO DE JORNADA'],
        ['Art. 34.9 ET - RDL 8/2019'],
        [],
        ['EMPRESA:', cfg.empresa, 'CIF:', cfg.cif, 'CCC:', cfg.ccc, 'MES:', meses[mes]+' '+anio],
        ['TRABAJADOR:', cfg.trabajador, 'NIF:', cfg.nif, 'NAF:', cfg.naf, 'AÑO:', anio],
        [],
        ['DÍA','ENTRADA M.','SALIDA M.','ENTRADA T.','SALIDA T.','TOTAL H.','EXTRAS','COMPL.','OBSERVACIONES']
      ];
      
      var th=0, te=0, tc=0;
      for (var d=1; d<=dias; d++) {
        var r = datos.meses[km]?.[String(d).padStart(2,'0')] || {};
        wsData.push([d, r.em||'', r.sm||'', r.et||'', r.st||'', r.h||0, r.ex||0, r.co||0, r.o||'']);
        th+=r.h||0; te+=r.ex||0; tc+=r.co||0;
      }
      wsData.push([],['TOTAL MES','','','','',th.toFixed(1),te.toFixed(1),tc.toFixed(1),'']);
      
      var ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{wch:6},{wch:12},{wch:12},{wch:12},{wch:12},{wch:10},{wch:10},{wch:10},{wch:20}];
      
      XLSX.utils.book_append_sheet(wb, ws, meses[mes]);
      XLSX.writeFile(wb, 'REGISTRO_'+(cfg.trabajador||'TRABAJADOR').replace(/\s+/g,'_')+'_'+anio+'_'+String(mes+1).padStart(2,'0')+'.xlsx');
      
      alert('✅ Excel generado\n\n💡 Para bordes: abre en Excel > Seleccionar todo > Inicio > Bordes > Todos');
    } catch(e) {
      alert('❌ Error: '+e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '📊 Excel';
    }
  };

  // PDF: instrucción clara
  var btnPDF = get('btnPDF');
  if (btnPDF) btnPDF.onclick = function() {
    alert('📄 Para PDF:\n\n1. Genera el Excel\n2. Ábrelo en Excel\n3. Archivo > Exportar > PDF\n\n✅ Obtendrás formato profesional con bordes.');
  };

  // Inicio
  var loader = get('loader');
  var app = get('app');
  if (loader) loader.style.display = 'none';
  if (app) app.style.display = 'block';
  
  render();
});
