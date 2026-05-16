document.addEventListener('DOMContentLoaded', function() {
  // Estado
  let mes = new Date().getMonth();
  let anio = new Date().getFullYear();
  let datos = JSON.parse(localStorage.getItem('hc') || '{}');
  let cfg = datos.cfg || {empresa:'',cif:'',ccc:'',trabajador:'',nif:'',naf:''};
  
  // Referencias DOM
  const tbody = document.getElementById('tbody-calendario');
  const mesLabel = document.getElementById('mes-actual');
  const nombres = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  
  // Presets de horario
  const preset = {
    c: {em:'09:00',sm:'14:00',et:'16:00',st:'18:00',h:8,o:''},
    m: {em:'09:00',sm:'14:00',et:'',st:'',h:5,o:''},
    o: {em:'08:00',sm:'15:00',et:'',st:'',h:7,o:''},
    f: {em:'',sm:'',et:'',st:'',h:0,o:'FESTIVO'},
    v: {em:'',sm:'',et:'',st:'',h:0,o:'VACACIONES'},
    l: {em:'',sm:'',et:'',st:'',h:0,o:''}
  };

  // Guardar en localStorage
  function guardar() {
    datos.cfg = cfg;
    localStorage.setItem('hc', JSON.stringify(datos));
  }

  // Clave del mes actual: "2026-05"
  function claveM() {
    return anio + '-' + String(mes+1).padStart(2,'0');
  }

  // Renderizar calendario del mes
  function render() {
    mesLabel.textContent = nombres[mes] + ' ' + anio;
    tbody.innerHTML = '';
    const dias = new Date(anio, mes+1, 0).getDate();
    const km = claveM();
    datos[km] = datos[km] || {};

    for (let d = 1; d <= dias; d++) {
      const ds = new Date(anio, mes, d).getDay(); // 0=Dom, 1=Lun...
      const kd = String(d).padStart(2,'0');
      
      // Auto-inicializar si no existe
      if (!datos[km][kd]) {
        datos[km][kd] = (ds>=1 && ds<=5) ? {...preset.c} : {...preset.l};
      }
      const r = datos[km][kd];

      const tr = document.createElement('tr');
      tr.innerHTML = 
        '<td><b>'+d+'</b></td>' +
        '<td><input type="time" value="'+(r.em||'')+'" data-f="em" data-d="'+kd+'"></td>' +
        '<td><input type="time" value="'+(r.sm||'')+'" data-f="sm" data-d="'+kd+'"></td>' +
        '<td><input type="time" value="'+(r.et||'')+'" data-f="et" data-d="'+kd+'"></td>' +
        '<td><input type="time" value="'+(r.st||'')+'" data-f="st" data-d="'+kd+'"></td>' +
        '<td><b>'+(r.h||0)+'h</b></td>' +
        '<td><input type="text" value="'+(r.o||'')+'" data-f="o" data-d="'+kd+'" placeholder="Obs."></td>';
      tbody.appendChild(tr);
    }

    // Adjuntar eventos a los inputs
    tbody.querySelectorAll('input').forEach(function(inp) {
      inp.onchange = function(e) {
        const d = e.target.dataset.d;
        const f = e.target.dataset.f;
        const v = e.target.value;
        datos[km][d][f] = v;
        // Recalcular horas si cambió hora entrada/salida
        if (f === 'em' || f === 'sm' || f === 'et' || f === 'st') {
          datos[km][d].h = calcHoras(d);
        }
        guardar();
        // Actualizar celda de horas en la fila
        const row = e.target.closest('tr');
        if (row) row.querySelector('td:nth-child(6) b').textContent = (datos[km][d].h||0) + 'h';
      };
    });
    guardar();
  }

  // Calcular horas para un día
  function calcHoras(d) {
    const r = datos[claveM()][d];
    if (r.o && (r.o.toUpperCase().includes('FESTIVO') || r.o.toUpperCase().includes('VACACIONES'))) {
      return r.h || 0;
    }
    let h = 0;
    if (r.em && r.sm) {
      h += (new Date('2000-01-01T'+r.sm) - new Date('2000-01-01T'+r.em)) / 3600000;
    }
    if (r.et && r.st) {
      h += (new Date('2000-01-01T'+r.st) - new Date('2000-01-01T'+r.et)) / 3600000;
    }
    return Math.round(h * 10) / 10;
  }

  // Navegación entre meses
  document.getElementById('btn-prev').onclick = function() {
    mes--; if (mes < 0) { mes = 11; anio--; }
    render();
  };
  document.getElementById('btn-next').onclick = function() {
    mes++; if (mes > 11) { mes = 0; anio++; }
    render();
  };

  // Modal configuración
  document.getElementById('btn-config').onclick = function() {
    document.getElementById('cfg-empresa').value = cfg.empresa || '';
    document.getElementById('cfg-cif').value = cfg.cif || '';
    document.getElementById('cfg-ccc').value = cfg.ccc ||
