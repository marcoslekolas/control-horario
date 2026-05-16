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
